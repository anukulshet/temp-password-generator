const { Pool } = require('pg');


const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
 

    rejectUnauthorized: false,
  },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err);
});


const query = (text, params) => pool.query(text, params);


const getClient = () => pool.connect();


const testConnection = async () => {
  try {
    const { rows } = await query('SELECT NOW() AS now');
    console.log('PostgreSQL connected:', rows[0].now);
  } catch (err) {
    console.error('PostgreSQL connection failed:', err.message);
    process.exit(1); 
  }
};

module.exports = { query, getClient, testConnection };
