// Database connection pool — single source of truth for pg Pool.
// Any file that needs to query the database imports from here.
const { Pool } = require('pg');
const { getDatabaseConfig } = require('./config');

const pool = new Pool(getDatabaseConfig());

// Prevent idle client errors from crashing the process (Neon auto-suspend)
pool.on('error', (err) => {
  console.error('[pg pool] idle client error (non-fatal):', err && err.message);
});

module.exports = pool;