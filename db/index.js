// Database connection - single source of truth.
// Production: uses pg Pool with DATABASE_URL.
// Local dev without DB: exports a stub that warns (Rover still works).
require('dotenv').config();

let pool;

if (process.env.DATABASE_URL) {
  const { Pool } = require('pg');

  let effectiveDatabaseUrl = process.env.DATABASE_URL;
  try {
    const parsed = new URL(effectiveDatabaseUrl);

    if (parsed.hostname === 'dpg-damhu3ek1f9s7394emjg-a') {
      parsed.hostname = 'dpg-damhu3ek1f9s7394emjg-a.virginia-postgres.render.com';
      console.warn('[db] normalized legacy cross-region Render hostname');
    }

    // Do not put sslmode in the connection string: node-postgres can use it
    // to override the explicit SSL options below.
    parsed.searchParams.delete('sslmode');
    effectiveDatabaseUrl = parsed.toString();
  } catch (err) {
    console.error('[db] invalid DATABASE_URL:', err.message);
    throw err;
  }

  const isLocal = effectiveDatabaseUrl.includes('localhost') || effectiveDatabaseUrl.includes('127.0.0.1');

  pool = new Pool({
    connectionString: effectiveDatabaseUrl,
    ssl: isLocal ? false : { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
    keepAlive: true,
    idleTimeoutMillis: 30000,
    max: 10
  });

  pool.on('error', (err) => {
    console.error('[pg pool] idle client error (non-fatal):', err && err.message);
  });
  console.log('[db] pg Pool configured with explicit TLS options for remote Render Postgres');
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

module.exports = pool;
