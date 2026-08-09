// Database connection - single source of truth.
// Production: uses pg Pool with DATABASE_URL.
// Local dev without DB: exports a stub that warns (Rover still works).
require('dotenv').config();

let pool;

if (process.env.DATABASE_URL) {
  const { Pool } = require('pg');
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
  });
  pool.on('error', (err) => {
    console.error('[pg pool] idle client error (non-fatal):', err && err.message);
  });
  console.log('[db] Connected via pg Pool');
} else {
  console.warn('[db] DATABASE_URL not set - database features disabled (Rover still works)');
  const noDbError = new Error('Database not configured. Set DATABASE_URL to enable DB features.');
  pool = {
    async query() { throw noDbError; },
    async connect() { throw noDbError; },
    on() {},
    async end() {}
  };
}

// Bound helper so `const { query } = require('./index')` never loses `this`
async function query(text, params) {
  return pool.query(text, params);
}

module.exports = pool;
module.exports.query = query;
module.exports.pool = pool;
