/**
 * verifyController.js — Recipient email verification
 *
 * On success: issues a short-lived (30s) redirect token and returns the
 * redirect URL. Credentials are NEVER sent to the frontend — they travel
 * only inside a signed JWT that is consumed immediately by /api/redirect.
 */

const { query }              = require('../config/database');
const { validateToken, incrementUseCount } = require('../services/tokenEngine');
const { isLocked, recordFailedAttempt, clearAttempts } = require('../middleware/rateLimit');
const { logEvent }           = require('../services/audit');
const { hexToKey, decrypt }  = require('../services/encryption');
const { issueRedirectToken } = require('./redirectController');

/**
 * POST /api/verify
 * Body: { token, email }
 */
const verifyAccess = async (req, res) => {
  const { token: rawToken, email } = req.body;

  if (!rawToken || !email) {
    return res.status(400).json({ error: 'Token and email are required' });
  }

  let tokenRecord;
  try {
    tokenRecord = await validateToken(rawToken);
  } catch (err) {
    return res.status(410).json({ error: err.message, code: err.code });
  }

  // Check rate limit lockout
  if (await isLocked(tokenRecord.id)) {
    await logEvent({
      tokenId:    tokenRecord.id,
      eventType:  'access_denied',
      ipAddress:  req.ipAddress,
      deviceInfo: req.deviceInfo,
      metadata:   { reason: 'rate_limited' },
    });
    return res.status(429).json({ error: 'Too many failed attempts. Try again later.', code: 'RATE_LIMITED' });
  }

  // Verify recipient email
  if (email.toLowerCase().trim() !== tokenRecord.recipient_email.toLowerCase()) {
    const attempts = await recordFailedAttempt(tokenRecord.id);
    await logEvent({
      tokenId:    tokenRecord.id,
      eventType:  'access_denied',
      ipAddress:  req.ipAddress,
      deviceInfo: req.deviceInfo,
      metadata:   { reason: 'email_mismatch', attempts },
    });
    return res.status(403).json({ error: 'Email does not match.', code: 'EMAIL_MISMATCH' });
  }

  try {
    // Decrypt credentials server-side
    const encKey = await hexToKey(tokenRecord.enc_key_hex);
    const { username, password } = JSON.parse(
      await decrypt(tokenRecord.encrypted_data, encKey),
    );

    // Fetch login fields from resources table
    const { rows } = await query(
      'SELECT resource_name, resource_url, login_url, username_field, password_field FROM resources WHERE id = $1',
      [tokenRecord.resource_id],
    );
    const resource = rows[0];

    // Issue a short-lived redirect token — credentials travel only in this JWT
    const redirectToken = issueRedirectToken({
      resourceName:  resource.resource_name,
      resourceUrl:   resource.resource_url,
      loginUrl:      resource.login_url      || null,
      usernameField: resource.username_field || 'email',
      passwordField: resource.password_field || 'password',
      username,
      password,
    });

    // Record successful access
    await incrementUseCount(tokenRecord.id);
    await clearAttempts(tokenRecord.id);
    await logEvent({
      tokenId:    tokenRecord.id,
      eventType:  'access_granted',
      ipAddress:  req.ipAddress,
      deviceInfo: req.deviceInfo,
    });

    // Return only the redirect URL — never credentials
    return res.json({
      redirectUrl: `${process.env.BACKEND_URL || 'http://localhost:4000'}/api/redirect?token=${redirectToken}`,
    });
  } catch (err) {
    console.error('verifyAccess error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { verifyAccess };
