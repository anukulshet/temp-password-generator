/**
 * tokenEngine.js — Secure access token generation and validation
 *
 * Flow:
 *  1. Generate a 128-bit cryptographically random raw token
 *  2. Store only the SHA-256 hash in the DB (so even a DB leak can't be used)
 *  3. Send the raw token to the recipient in the email link
 *  4. On verify: hash the submitted token and look it up in DB
 */

const crypto = require('crypto');
const { query } = require('../config/database');

/**
 * Generate a raw token and its DB-safe hash.
 * @returns {{ rawToken: string, tokenHash: string }}
 */
const generateToken = () => {
  const rawToken  = crypto.randomBytes(32).toString('hex'); // 256-bit, URL-safe hex
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  return { rawToken, tokenHash };
};

/**
 * Hash a raw token for DB lookup.
 * @param {string} rawToken
 * @returns {string}
 */
const hashToken = (rawToken) =>
  crypto.createHash('sha256').update(rawToken).digest('hex');

/**
 * Create an access token record in the DB.
 *
 * @param {object} opts
 * @param {string} opts.resourceId
 * @param {string} opts.recipientEmail
 * @param {number} opts.expiresInMinutes
 * @param {number} opts.maxUses          - 0 = unlimited
 * @param {object} opts.permissions
 * @returns {Promise<{ rawToken: string, record: object }>}
 */
const createAccessToken = async ({
  resourceId,
  recipientEmail,
  expiresInMinutes,
  maxUses = 1,
  permissions = { access: 'full' },
  encKeyHex = null,
}) => {
  const { rawToken, tokenHash } = generateToken();
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

  const { rows } = await query(
    `INSERT INTO access_tokens
       (resource_id, token_hash, recipient_email, expires_at, max_uses, permissions, enc_key_hex)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [resourceId, tokenHash, recipientEmail, expiresAt, maxUses, permissions, encKeyHex],
  );

  return { rawToken, record: rows[0] };
};

/**
 * Look up a token by its raw value and validate it.
 * Returns the token record if valid, or throws a descriptive error.
 *
 * @param {string} rawToken
 * @returns {Promise<object>} valid token record
 */
const validateToken = async (rawToken) => {
  const tokenHash = hashToken(rawToken);

  const { rows } = await query(
    `SELECT at.*, r.resource_url, r.encrypted_data, r.owner_id
     FROM access_tokens at
     JOIN resources r ON r.id = at.resource_id
     WHERE at.token_hash = $1`,
    [tokenHash],
  );

  if (!rows.length) {
    throw Object.assign(new Error('Token not found'), { code: 'TOKEN_NOT_FOUND' });
  }

  const token = rows[0];

  if (token.status === 'revoked') {
    throw Object.assign(new Error('Token has been revoked'), { code: 'TOKEN_REVOKED' });
  }

  if (token.status === 'expired' || new Date(token.expires_at) < new Date()) {
    // Mark expired in DB if not already
    if (token.status !== 'expired') {
      await query('UPDATE access_tokens SET status = $1 WHERE id = $2', ['expired', token.id]);
    }
    throw Object.assign(new Error('Token has expired'), { code: 'TOKEN_EXPIRED' });
  }

  if (token.max_uses > 0 && token.uses_count >= token.max_uses) {
    throw Object.assign(new Error('Token has reached its use limit'), { code: 'TOKEN_EXHAUSTED' });
  }

  return token;
};

/**
 * Increment the use counter after a successful access.
 * @param {string} tokenId
 */
const incrementUseCount = async (tokenId) => {
  await query(
    'UPDATE access_tokens SET uses_count = uses_count + 1 WHERE id = $1',
    [tokenId],
  );
};

/**
 * Revoke a token immediately.
 * @param {string} tokenId
 * @param {string} ownerId - must match the resource owner
 */
const revokeToken = async (tokenId, ownerId) => {
  const { rows } = await query(
    `UPDATE access_tokens at
     SET status = 'revoked'
     FROM resources r
     WHERE at.id = $1
       AND at.resource_id = r.id
       AND r.owner_id = $2
     RETURNING at.id`,
    [tokenId, ownerId],
  );

  if (!rows.length) {
    throw Object.assign(new Error('Token not found or not authorised'), { code: 'FORBIDDEN' });
  }
};

module.exports = { generateToken, hashToken, createAccessToken, validateToken, incrementUseCount, revokeToken };
