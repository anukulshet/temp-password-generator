/**
 * accessController.js — Create, list, and revoke access tokens
 *
 * This is the "Share Access" flow from the admin side.
 * The recipient email flow (verify + redirect) is handled in Week 6.
 */

const { query }                                              = require('../config/database');
const { createAccessToken, revokeToken }                     = require('../services/tokenEngine');
const { registerExpiry, removeToken }                        = require('../services/expiryEngine');
const { logEvent }                                           = require('../services/audit');

// ── Create access token (Share Access) ───────────────────────────────────────

const createToken = async (req, res) => {
  try {
    const { resourceId, recipientEmail, expiresInMinutes, maxUses, permissions } = req.body;

    if (!resourceId || !recipientEmail || !expiresInMinutes) {
      return res.status(400).json({ error: 'resourceId, recipientEmail and expiresInMinutes are required' });
    }

    // Confirm resource belongs to this admin
    const { rows: resourceRows } = await query(
      'SELECT id FROM resources WHERE id = $1 AND owner_id = $2',
      [resourceId, req.userId],
    );

    if (!resourceRows.length) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    const { rawToken, record } = await createAccessToken({
      resourceId,
      recipientEmail,
      expiresInMinutes,
      maxUses:     maxUses     ?? 1,
      permissions: permissions ?? { access: 'full' },
    });

    // Register TTL in Redis for fast expiry checks
    await registerExpiry(record.id, record.expires_at);

    // TODO Week 6: send email to recipientEmail with the access link
    // The link will look like: https://accessos.app/verify?token=<rawToken>

    return res.status(201).json({
      message:    'Access token created',
      token:      record,
      accessLink: `${process.env.FRONTEND_URL}/verify?token=${rawToken}`,
    });
  } catch (err) {
    console.error('createToken error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ── List tokens for a resource ────────────────────────────────────────────────

const listTokens = async (req, res) => {
  try {
    const { resourceId } = req.params;

    // Confirm ownership
    const { rows: resourceRows } = await query(
      'SELECT id FROM resources WHERE id = $1 AND owner_id = $2',
      [resourceId, req.userId],
    );

    if (!resourceRows.length) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    const { rows } = await query(
      `SELECT id, recipient_email, expires_at, max_uses, uses_count, permissions, status, created_at
       FROM access_tokens
       WHERE resource_id = $1
       ORDER BY created_at DESC`,
      [resourceId],
    );

    return res.json({ tokens: rows });
  } catch (err) {
    console.error('listTokens error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ── Revoke a token ────────────────────────────────────────────────────────────

const revoke = async (req, res) => {
  try {
    const { tokenId } = req.params;

    await revokeToken(tokenId, req.userId);
    await removeToken(tokenId);
    await logEvent({
      tokenId,
      eventType:  'token_revoked',
      ipAddress:  req.ipAddress,
      deviceInfo: req.deviceInfo,
    });

    return res.json({ message: 'Token revoked' });
  } catch (err) {
    if (err.code === 'FORBIDDEN') {
      return res.status(403).json({ error: err.message });
    }
    console.error('revoke error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { createToken, listTokens, revoke };
