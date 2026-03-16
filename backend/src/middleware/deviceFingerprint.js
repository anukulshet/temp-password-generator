/**
 * deviceFingerprint.js — Extract IP address and device info per request
 *
 * Attaches req.ipAddress and req.deviceInfo so controllers can pass
 * them to audit logs without duplicating extraction logic everywhere.
 */

const deviceFingerprint = (req, _res, next) => {
  // Respect reverse-proxy headers (Railway, Vercel, Cloudflare)
  req.ipAddress = (
    req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.headers['x-real-ip'] ||
    req.socket?.remoteAddress ||
    'unknown'
  );

  req.deviceInfo = req.headers['user-agent'] ?? 'unknown';

  next();
};

module.exports = { deviceFingerprint };
