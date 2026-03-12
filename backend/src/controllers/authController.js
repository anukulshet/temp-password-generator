/**
 * authController.js — signup, login, refresh
 *
 * Security design:
 *  - bcrypt (12 rounds) hashes the master password for authentication.
 *  - Argon2id derives the 32-byte encryption key from the same password.
 *  - The key is hex-encoded and placed in the short-lived JWT (15 min).
 *  - The refresh token (7 days) does NOT carry the key — it only issues
 *    new access tokens, so it cannot decrypt resources on its own.
 *  - Email enumeration is blocked: we always run bcrypt.compare() even
 *    when the user doesn't exist, keeping response time constant.
 */

const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');

const { query }                               = require('../config/database');
const { generateSalt, deriveKey, keyToHex }   = require('../services/encryption');

const BCRYPT_ROUNDS = 12;

// ── Signup ────────────────────────────────────────────────────────────────────

const signup = async (req, res) => {
  try {
    const { email, masterPassword } = req.body;

    if (!email || !masterPassword) {
      return res.status(400).json({ error: 'Email and master password are required' });
    }
    if (masterPassword.length < 8) {
      return res.status(400).json({ error: 'Master password must be at least 8 characters' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Reject duplicate emails
    const existing = await query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash master password for authentication
    const masterPasswordHash = await bcrypt.hash(masterPassword, BCRYPT_ROUNDS);

    // Generate a unique salt and derive the encryption key (Argon2id)
    const kdfSalt  = await generateSalt();
    const encKey   = await deriveKey(masterPassword, kdfSalt);
    const encKeyHex = await keyToHex(encKey);

    // Persist user (key is never saved — only the salt needed to re-derive it)
    const { rows } = await query(
      `INSERT INTO users (email, master_password_hash, kdf_salt)
       VALUES ($1, $2, $3)
       RETURNING id, email, created_at`,
      [normalizedEmail, masterPasswordHash, kdfSalt],
    );

    const user = rows[0];
    const tokens = issueTokens(user.id, encKeyHex);

    return res.status(201).json({
      message: 'Account created',
      user:    { id: user.id, email: user.email, createdAt: user.created_at },
      ...tokens,
    });
  } catch (err) {
    console.error('signup error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ── Login ─────────────────────────────────────────────────────────────────────

const login = async (req, res) => {
  try {
    const { email, masterPassword } = req.body;

    if (!email || !masterPassword) {
      return res.status(400).json({ error: 'Email and master password are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const { rows } = await query(
      'SELECT id, email, master_password_hash, kdf_salt FROM users WHERE email = $1',
      [normalizedEmail],
    );

    const user = rows[0];

    // Always compare to prevent timing-based email enumeration
    const dummyHash  = '$2b$12$invalidhashpaddingtomakethisconstanttime000000000000000';
    const hashToTest = user ? user.master_password_hash : dummyHash;
    const match      = await bcrypt.compare(masterPassword, hashToTest);

    if (!user || !match) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Re-derive the encryption key from the stored salt
    const encKey    = await deriveKey(masterPassword, user.kdf_salt);
    const encKeyHex = await keyToHex(encKey);

    const tokens = issueTokens(user.id, encKeyHex);

    return res.json({
      user: { id: user.id, email: user.email },
      ...tokens,
    });
  } catch (err) {
    console.error('login error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ── Refresh ───────────────────────────────────────────────────────────────────

const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    const payload = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

    // Confirm user still exists
    const { rows } = await query('SELECT id, email FROM users WHERE id = $1', [payload.sub]);
    if (!rows.length) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Refresh token carries encKeyHex so the new access token can too
    const accessToken = jwt.sign(
      { sub: payload.sub, encKeyHex: payload.encKeyHex },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '15m' },
    );

    return res.json({ accessToken });
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Refresh token expired — please log in again' });
    }
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
};

// ── Helper ────────────────────────────────────────────────────────────────────

function issueTokens(userId, encKeyHex) {
  const accessToken = jwt.sign(
    { sub: userId, encKeyHex },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' },
  );

  const refreshToken = jwt.sign(
    { sub: userId, encKeyHex }, // carried so refresh can reissue access tokens
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d' },
  );

  return { accessToken, refreshToken };
}

module.exports = { signup, login, refresh };
