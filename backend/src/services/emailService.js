/**
 * emailService.js — Send emails via Resend
 *
 * Resend free tier: 3,000 emails/month, 100/day.
 * Sign up at resend.com, get an API key, add it to .env as RESEND_API_KEY.
 * You also need a verified domain or use resend's test domain for dev.
 */

const { Resend } = require('resend');

// Initialise lazily so missing key doesn't crash on import
let _resend = null;
const getResend = () => {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
};

/**
 * Send the access link email to the recipient.
 *
 * @param {object} opts
 * @param {string} opts.to             - recipient email
 * @param {string} opts.resourceName   - e.g. "Netflix"
 * @param {string} opts.accessLink     - full verify URL with token
 * @param {string} opts.expiresIn      - human readable e.g. "60 minutes"
 */
const sendAccessEmail = async ({ to, resourceName, accessLink, expiresIn }) => {
  const { data, error } = await getResend().emails.send({
    from:    process.env.EMAIL_FROM || 'AccessOS <onboarding@resend.dev>',
    to,
    subject: `You've been granted access to ${resourceName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <h2 style="color: #4f46e5;">AccessOS</h2>
        <p>You've been granted temporary access to <strong>${resourceName}</strong>.</p>
        <p>This link expires in <strong>${expiresIn}</strong> and can only be used once.</p>
        <a href="${accessLink}"
           style="display:inline-block;margin:24px 0;padding:12px 24px;
                  background:#4f46e5;color:#fff;border-radius:8px;
                  text-decoration:none;font-weight:600;">
          Access ${resourceName} →
        </a>
        <p style="color:#9ca3af;font-size:13px;">
          If you weren't expecting this, ignore this email.<br/>
          The link will expire automatically.
        </p>
      </div>
    `,
  });

  if (error) {
    console.error('Email send failed:', error);
    throw new Error('Failed to send access email');
  }

  return data;
};

module.exports = { sendAccessEmail };
