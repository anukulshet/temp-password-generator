/**
 * emailService.js — Send emails via Brevo
 * Brevo free tier: 300 emails/day.
 */

const { BrevoClient } = require('@getbrevo/brevo');

let _client = null;

const getClient = () => {
  if (!_client) {
    _client = new BrevoClient({ apiKey: process.env.BREVO_API_KEY });
  }
  return _client;
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
  const client = getClient();

  await client.transactionalEmails.sendTransacEmail({
    sender: {
      name:  process.env.FROM_NAME  || 'AccessOS',
      email: process.env.FROM_EMAIL || 'no-reply@accessos.app',
    },
    to: [{ email: to }],
    subject: `You've been granted access to ${resourceName}`,
    htmlContent: `
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
};

module.exports = { sendAccessEmail };
