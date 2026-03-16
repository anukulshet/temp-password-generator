/**
 * audit.js — Record every access attempt to audit_logs
 *
 * Called after every token validation attempt (success or failure)
 * so admins have a full picture of who accessed what and when.
 */

const { query } = require('../config/database');

/**
 * Write an audit log entry.
 *
 * @param {object} opts
 * @param {string} opts.tokenId
 * @param {'access_granted'|'access_denied'|'token_expired'|'token_revoked'} opts.eventType
 * @param {string} [opts.ipAddress]
 * @param {string} [opts.deviceInfo]
 * @param {object} [opts.metadata]   - any extra context (error code, email mismatch, etc.)
 */
const logEvent = async ({ tokenId, eventType, ipAddress, deviceInfo, metadata }) => {
  try {
    await query(
      `INSERT INTO audit_logs (token_id, event_type, ip_address, device_info, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [tokenId, eventType, ipAddress ?? null, deviceInfo ?? null, metadata ?? null],
    );
  } catch (err) {
    // Audit failure must never crash the main request
    console.error('audit logEvent failed (non-fatal):', err.message);
  }
};

/**
 * Fetch audit logs for all tokens belonging to the given owner.
 * Used by the admin dashboard to show access history.
 *
 * @param {string} ownerId
 * @returns {Promise<object[]>}
 */
const getLogsForOwner = async (ownerId) => {
  const { rows } = await query(
    `SELECT al.id, al.event_type, al.ip_address, al.device_info,
            al.metadata, al.timestamp,
            at.recipient_email, r.resource_name
     FROM audit_logs al
     JOIN access_tokens at ON at.id = al.token_id
     JOIN resources r      ON r.id  = at.resource_id
     WHERE r.owner_id = $1
     ORDER BY al.timestamp DESC
     LIMIT 200`,
    [ownerId],
  );
  return rows;
};

module.exports = { logEvent, getLogsForOwner };
