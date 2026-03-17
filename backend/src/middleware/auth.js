/**
 * auth.js middleware — JWT verification
 *
 * Extracts the Bearer token from the Authorization header, verifies it,
 * and attaches { userId, encKey } to req so downstream controllers can use them.
 *
 * encKey is a Uint8Array reconstructed from the hex stored in the JWT.
 * This is how the encryption key travels safely through the request lifecycle
 * without ever being stored in the database.
 */

const jwt = require('jsonwebtoken');
const { hexToKey } = require('../services/encryption');

const authenticate = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization header missing or malformed' });
    }

    const token = header.slice(7); // strip "Bearer "
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    req.userId    = payload.sub;
    req.encKeyHex = payload.encKeyHex;              // raw hex for storing on tokens
    req.encKey    = await hexToKey(payload.encKeyHex); // Uint8Array for encrypt/decrypt

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Access token expired' });
    }
    return res.status(401).json({ error: 'Invalid access token' });
  }
};

module.exports = { authenticate };
