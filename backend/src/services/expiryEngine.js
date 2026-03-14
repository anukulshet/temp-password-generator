/**
 * expiryEngine.js — Redis-backed token expiry tracking via Upstash
 *
 * Why Redis on top of PostgreSQL expiry?
 *  - Redis TTL gives instant expiry without polling the DB on every request
 *  - Acts as a fast first-check before hitting PostgreSQL
 *  - Upstash free tier: 10,000 requests/day — sufficient for MVP
 *
 * If Redis is unavailable the system falls back to DB-only expiry checks
 * (validateToken in tokenEngine.js always checks expires_at in Postgres).
 */

const { createClient } = require('redis');

let client = null;
let redisAvailable = false;

const getClient = async () => {
  if (client) return client;

  try {
    client = createClient({ url: process.env.REDIS_URL });

    client.on('error', (err) => {
      console.warn('Redis error (falling back to DB-only expiry):', err.message);
      redisAvailable = false;
    });

    await client.connect();
    redisAvailable = true;
    console.log('Redis connected');
  } catch (err) {
    console.warn('Redis unavailable — expiry will rely on PostgreSQL only:', err.message);
    redisAvailable = false;
  }

  return client;
};

/**
 * Register a token in Redis with a TTL matching its DB expiry.
 * Key: `token:<tokenId>`  Value: 'active'
 *
 * @param {string} tokenId
 * @param {Date|string} expiresAt
 */
const registerExpiry = async (tokenId, expiresAt) => {
  try {
    const redis = await getClient();
    if (!redisAvailable) return;

    const ttlSeconds = Math.max(
      1,
      Math.floor((new Date(expiresAt) - Date.now()) / 1000),
    );

    await redis.set(`token:${tokenId}`, 'active', { EX: ttlSeconds });
  } catch (err) {
    console.warn('registerExpiry failed (non-fatal):', err.message);
  }
};

/**
 * Fast check: is the token still active in Redis?
 * Returns null if Redis is unavailable — caller should fall back to DB check.
 *
 * @param {string} tokenId
 * @returns {Promise<boolean|null>}
 */
const isTokenActive = async (tokenId) => {
  try {
    const redis = await getClient();
    if (!redisAvailable) return null;

    const val = await redis.get(`token:${tokenId}`);
    return val === 'active';
  } catch {
    return null; // non-fatal — fall back to DB
  }
};

/**
 * Immediately remove a token from Redis (revoke or manual expire).
 * @param {string} tokenId
 */
const removeToken = async (tokenId) => {
  try {
    const redis = await getClient();
    if (!redisAvailable) return;
    await redis.del(`token:${tokenId}`);
  } catch (err) {
    console.warn('removeToken failed (non-fatal):', err.message);
  }
};

module.exports = { getClient, registerExpiry, isTokenActive, removeToken };
