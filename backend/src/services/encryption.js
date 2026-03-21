/**
 * encryption.js — Zero-knowledge encryption service
 *
 * Primitives:
 *  - Key derivation : crypto_pwhash  (Argon2id, MODERATE settings)
 *  - Encryption     : crypto_secretbox_easy  (XSalsa20-Poly1305)
 *
 * Init pattern: sodium constants are only safe to use after sodium.ready
 * resolves. We store the resolved lib in `_lib` and return it from ready().
 */

let _lib = null;

const ready = async () => {
  if (!_lib) {
    const sodium = require('libsodium-wrappers-sumo');
    await sodium.ready;
    _lib = sodium; // constants like crypto_pwhash_SALTBYTES are now populated
  }
  return _lib;
};

/**
 * Generate a fresh random salt for Argon2id key derivation.
 * @returns {Promise<string>} hex-encoded salt
 */
const generateSalt = async () => {
  const s = await ready();
  return s.to_hex(s.randombytes_buf(s.crypto_pwhash_SALTBYTES));
};

/**
 * Derive a 32-byte encryption key from masterPassword + salt (Argon2id).
 * Never persisted — re-derived fresh on every login.
 * @returns {Promise<Uint8Array>}
 */
const deriveKey = async (masterPassword, saltHex) => {
  const s = await ready();
  const salt = s.from_hex(saltHex);
  return s.crypto_pwhash(
    32,
    masterPassword,
    salt,
    s.crypto_pwhash_OPSLIMIT_MODERATE,
    s.crypto_pwhash_MEMLIMIT_MODERATE,
    s.crypto_pwhash_ALG_ARGON2ID13,
  );
};

/**
 * Encrypt plaintext. Returns a base64 string (nonce prepended to ciphertext).
 * @returns {Promise<string>}
 */
const encrypt = async (plaintext, key) => {
  const s = await ready();
  const nonce = s.randombytes_buf(s.crypto_secretbox_NONCEBYTES);
  const cipher = s.crypto_secretbox_easy(plaintext, nonce, key);

  const combined = new Uint8Array(nonce.length + cipher.length);
  combined.set(nonce);
  combined.set(cipher, nonce.length);

  return s.to_base64(combined, s.base64_variants.ORIGINAL);
};

/**
 * Decrypt a base64 blob produced by encrypt().
 * @returns {Promise<string>}
 */
const decrypt = async (ciphertextB64, key) => {
  const s = await ready();
  const combined = s.from_base64(ciphertextB64, s.base64_variants.ORIGINAL);
  const nonce    = combined.slice(0, s.crypto_secretbox_NONCEBYTES);
  const cipher   = combined.slice(s.crypto_secretbox_NONCEBYTES);
  const plain    = s.crypto_secretbox_open_easy(cipher, nonce, key);
  return s.to_string(plain);
};

/** Uint8Array key → hex string (for JWT storage) */
const keyToHex = async (key) => {
  const s = await ready();
  return s.to_hex(key);
};

/** hex string → Uint8Array key */
const hexToKey = async (hex) => {
  const s = await ready();
  return s.from_hex(hex);
};

/**
 * Generate a random temporary username + password.
 * Username: user_ + 8 hex chars.  Password: 16 random bytes as URL-safe base64.
 */
const generateTempCredentials = async () => {
  const s = await ready();
  const tempUsername = 'user_' + s.to_hex(s.randombytes_buf(4));
  const tempPassword = s.to_base64(s.randombytes_buf(16), s.base64_variants.URLSAFE_NO_PADDING);
  return { tempUsername, tempPassword };
};

module.exports = { generateSalt, deriveKey, encrypt, decrypt, keyToHex, hexToKey, generateTempCredentials };
