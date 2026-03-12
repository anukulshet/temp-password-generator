const { Pool } = require('pg');

// Supabase provides a standard PostgreSQL connection string.
// Set DATABASE_URL in your .env file — never commit the real value.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    // Supabase requires SSL; rejectUnauthorized can be true in production
    // once you have the CA cert configured.
    rejectUnauthorized: false,
  },
  max: 10,              // max connections in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err);
});

/**
 * Run a parameterised query.
 * Usage: const { rows } = await query('SELECT * FROM users WHERE id = $1', [id]);
 */
const query = (text, params) => pool.query(text, params);

/**
 * Get a client from the pool for transactions.
 * Remember to call client.release() when done.
 */
const getClient = () => pool.connect();

/**
 * Test the connection on startup.
 * Called from app.js once the server is listening.
 */
const testConnection = async () => {
  try {
    const { rows } = await query('SELECT NOW() AS now');
    console.log('PostgreSQL connected:', rows[0].now);
  } catch (err) {
    console.error('PostgreSQL connection failed:', err.message);
    process.exit(1); // Fail fast — app is useless without the DB
  }
};

module.exports = { query, getClient, testConnection };
