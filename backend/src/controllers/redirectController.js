/**
 * redirectController.js — Auto-login redirect
 *
 * Flow:
 *  1. verifyController validates the token + email, then issues a short-lived
 *     redirect token (JWT, 30s) containing the decrypted credentials.
 *  2. Frontend immediately redirects to GET /api/redirect?token=<redirectToken>
 *  3. This controller validates the redirect token, then returns a self-contained
 *     HTML page with a hidden form that auto-submits to the target site.
 *  4. Credentials are never visible in the browser — they exist only inside
 *     hidden form fields that submit automatically in 300ms.
 *
 * For sites with JavaScript-based auth (Google, Netflix etc.) the form POST
 * will land on the login page — the user arrives at the right place but must
 * log in manually. Credentials are still never shown.
 */

const jwt = require('jsonwebtoken');

const REDIRECT_TOKEN_SECRET = process.env.JWT_SECRET + '_redirect';

/**
 * Issue a 30-second redirect token carrying credentials.
 * Called by verifyController after successful verification.
 */
const issueRedirectToken = (payload) =>
  jwt.sign(payload, REDIRECT_TOKEN_SECRET, { expiresIn: '30s' });

/**
 * GET /api/redirect?token=<redirectToken>
 * Returns a self-submitting HTML page — no JSON, pure HTML.
 */
const handleRedirect = (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).send(errorPage('Missing token'));
  }

  let payload;
  try {
    payload = jwt.verify(token, REDIRECT_TOKEN_SECRET);
  } catch {
    return res.status(410).send(errorPage('This link has expired. Please use the original access link again.'));
  }

  const { resourceName, resourceUrl, loginUrl, usernameField, passwordField, username, password } = payload;

  // If no login_url was stored, just redirect to the resource URL
  if (!loginUrl) {
    return res.send(simpleRedirectPage(resourceName, resourceUrl));
  }

  // Return auto-submitting form page
  return res.send(autoSubmitPage({
    resourceName,
    loginUrl,
    usernameField,
    passwordField,
    username,
    password,
    resourceUrl,
  }));
};

// ── HTML templates ────────────────────────────────────────────────────────────

const autoSubmitPage = ({ resourceName, loginUrl, usernameField, passwordField, username, password, resourceUrl }) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Connecting to ${escHtml(resourceName)}...</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #f9fafb;
      display: flex; align-items: center; justify-content: center;
      min-height: 100vh;
    }
    .card {
      background: white; border-radius: 16px; padding: 48px 40px;
      text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      max-width: 400px; width: 100%;
    }
    .spinner {
      width: 40px; height: 40px; border: 3px solid #e5e7eb;
      border-top-color: #4f46e5; border-radius: 50%;
      animation: spin 0.8s linear infinite; margin: 0 auto 24px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    h1 { font-size: 18px; color: #111827; margin-bottom: 8px; }
    p  { font-size: 14px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="card">
    <div class="spinner"></div>
    <h1>Connecting to ${escHtml(resourceName)}</h1>
    <p>Logging you in securely...</p>
  </div>

  <!-- Hidden form — credentials never visible to user -->
  <form id="f" method="POST" action="${escHtml(loginUrl)}" style="display:none">
    <input name="${escHtml(usernameField)}" value="${escHtml(username)}" />
    <input name="${escHtml(passwordField)}" value="${escHtml(password)}" />
  </form>

  <script>
    // Submit immediately — before the user can inspect the DOM
    setTimeout(() => document.getElementById('f').submit(), 300);
  </script>
</body>
</html>`;

const simpleRedirectPage = (resourceName, resourceUrl) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Redirecting to ${escHtml(resourceName)}...</title>
  <meta http-equiv="refresh" content="1;url=${escHtml(resourceUrl)}">
  <style>
    body { font-family: sans-serif; background:#f9fafb; display:flex;
           align-items:center; justify-content:center; min-height:100vh; }
    .card { background:white; border-radius:16px; padding:48px 40px;
            text-align:center; box-shadow:0 1px 3px rgba(0,0,0,0.1); }
    .spinner { width:40px;height:40px;border:3px solid #e5e7eb;
               border-top-color:#4f46e5;border-radius:50%;
               animation:spin 0.8s linear infinite;margin:0 auto 24px; }
    @keyframes spin{to{transform:rotate(360deg);}}
  </style>
</head>
<body>
  <div class="card">
    <div class="spinner"></div>
    <h1 style="font-size:18px;color:#111827;margin-bottom:8px">
      Redirecting to ${escHtml(resourceName)}
    </h1>
    <p style="font-size:14px;color:#6b7280">Taking you there now...</p>
  </div>
</body>
</html>`;

const errorPage = (msg) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Access Unavailable</title>
<style>
  body{font-family:sans-serif;background:#f9fafb;display:flex;
       align-items:center;justify-content:center;min-height:100vh;}
  .card{background:white;border-radius:16px;padding:48px 40px;
        text-align:center;box-shadow:0 1px 3px rgba(0,0,0,0.1);max-width:400px;}
</style></head>
<body>
  <div class="card">
    <div style="font-size:48px;margin-bottom:16px">🔒</div>
    <h1 style="font-size:18px;color:#111827;margin-bottom:8px">Access Unavailable</h1>
    <p style="font-size:14px;color:#6b7280">${escHtml(msg)}</p>
  </div>
</body></html>`;

// Prevent XSS in HTML templates
const escHtml = (str) =>
  String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

module.exports = { handleRedirect, issueRedirectToken };
