// Database connection - single source of truth.
// Production: uses pg Pool with DATABASE_URL.
// Local dev without DB: exports a stub that warns (Rover still works).
require('dotenv').config();

let pool;

if (process.env.DATABASE_URL) {
  const { Pool } = require('pg');

  // Render private Postgres hostnames are region-scoped. The production
  // service is in Oregon while the primary database is in Virginia, so
  // normalize the known legacy hostname to its TLS endpoint here as well
  // as in the migration path. This keeps every DB consumer on one config.
  let effectiveDatabaseUrl = process.env.DATABASE_URL;
  try {
    const parsed = new URL(effectiveDatabaseUrl);
    if (parsed.hostname === 'dpg-damhu3ek1f9s7394emjg-a') {
      parsed.hostname = 'dpg-damhu3ek1f9s7394emjg-a.virginia-postgres.render.com';
      effectiveDatabaseUrl = parsed.toString();
      console.warn('[db] normalized legacy cross-region Render hostname to TLS endpoint');
    }
  } catch (err) {
    console.error('[db] invalid DATABASE_URL:', err.message);
    throw err;
  }

  pool = new Pool({
    connectionString: effectiveDatabaseUrl,
    ssl: effectiveDatabaseUrl.includes('localhost') ? false : { rejectUnauthorized: false }
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

// Export the pool itself. Do not overwrite pool.query with a wrapper that
// calls pool.query, which would recurse indefinitely and exhaust the stack.
module.exports = pool;
