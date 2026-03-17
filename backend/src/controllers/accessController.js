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
const { sendAccessEmail }                                    = require('../services/emailService');

// ── Create access token (Share Access) ───────────────────────────────────────

const createToken = async (req, res) => {
  try {
    const { resourceId, recipientEmail, expiresInMinutes, maxUses, permissions } = req.body;

    if (!resourceId || !recipientEmail || !expiresInMinutes) {
      return res.status(400).json({ error: 'resourceId, recipientEmail and expiresInMinutes are required' });
    }

    // Confirm resource belongs to this admin and fetch enc_key_hex from JWT
    const { rows: resourceRows } = await query(
      'SELECT id, resource_name FROM resources WHERE id = $1 AND owner_id = $2',
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
      encKeyHex:   req.encKeyHex, // stored so verify endpoint can decrypt credentials
    });

    // Register TTL in Redis for fast expiry checks
    await registerExpiry(record.id, record.expires_at);

    const accessLink = `${process.env.FRONTEND_URL}/verify?token=${rawToken}`;
    const resourceName = resourceRows[0].resource_name;

    // Send email to recipient
    try {
      await sendAccessEmail({
        to:           recipientEmail,
        resourceName,
        accessLink,
        expiresIn:    `${expiresInMinutes} minutes`,
      });
    } catch (emailErr) {
      console.warn('Email send failed (non-fatal):', emailErr.message);
    }

    return res.status(201).json({
      message:    'Access token created',
      token:      record,
      accessLink,
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
