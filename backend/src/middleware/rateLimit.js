/**
 * rateLimit.js — Token-level lockout after 5 failed verify attempts
 *
 * Uses Redis to track failed attempts per token.
 * After 5 failures the token is locked and returns 429.
 * This sits on top of the global IP-based rate limiter in app.js.
 *
 * Key: `attempts:<tokenId>`  Value: failure count  TTL: 1 hour
 */

const { getClient } = require('../services/expiryEngine');

const MAX_ATTEMPTS = 5;
const WINDOW_SECONDS = 60 * 60; // 1 hour

/**
 * Record a failed attempt for a token.
 * Returns the new failure count.
 * Falls back gracefully if Redis is unavailable.
 *
 * @param {string} tokenId
 * @returns {Promise<number>} current failure count
 */
const recordFailedAttempt = async (tokenId) => {
  try {
    const redis = await getClient();
    const key   = `attempts:${tokenId}`;
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, WINDOW_SECONDS); // set TTL on first failure
    }
    return count;
  } catch {
    return 0; // Redis down — allow through, DB expiry still protects
  }
};

/**
 * Check if a token is locked due to too many failed attempts.
 * @param {string} tokenId
 * @returns {Promise<boolean>}
 */
const isLocked = async (tokenId) => {
  try {
    const redis = await getClient();
    const count = await redis.get(`attempts:${tokenId}`);
    return parseInt(count ?? '0', 10) >= MAX_ATTEMPTS;
  } catch {
    return false; // Redis down — don't block
  }
};

/**
 * Clear the failure counter on a successful access.
 * @param {string} tokenId
 */
const clearAttempts = async (tokenId) => {
  try {
    const redis = await getClient();
    await redis.del(`attempts:${tokenId}`);
  } catch {
    // non-fatal
  }
};

module.exports = { recordFailedAttempt, isLocked, clearAttempts, MAX_ATTEMPTS };
