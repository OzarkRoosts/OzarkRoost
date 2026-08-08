/**
 * In-process migration runner (used by server.js soft-start).
 * Mirrors migrate.js folder logic without process.exit.
 */

const fs = require('fs');
const path = require('path');
const pool = require('./db/index');

async function runAllMigrations() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Core users table (idempotent)
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        password_hash VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        stripe_subscription_id VARCHAR(255),
        subscription_status VARCHAR(50),
        subscription_plan VARCHAR(255),
        subscription_expires_at TIMESTAMPTZ,
        subscription_updated_at TIMESTAMPTZ
      )
    `);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique_idx ON users (LOWER(email))
    `);

    const migrationsDir = path.join(__dirname, 'migrations');
    if (!fs.existsSync(migrationsDir)) {
      return { applied: [], skipped: true };
    }

    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.js'))
      .sort();

    const appliedRows = await client.query('SELECT name FROM _migrations');
    const appliedNames = new Set(appliedRows.rows.map((r) => r.name));
    const newly = [];

    for (const file of files) {
      // Clear require cache so deploys pick up new migrations
      const full = path.join(migrationsDir, file);
      delete require.cache[require.resolve(full)];
      const migration = require(full);
      const name = migration.name || file.replace(/\.js$/, '');
      if (appliedNames.has(name)) continue;

      console.log(`[migrate-runner] applying ${name}`);
      try {
        await client.query('BEGIN');
        await migration.up(client);
        await client.query('INSERT INTO _migrations (name) VALUES ($1)', [name]);
        await client.query('COMMIT');
        newly.push(name);
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`Migration failed (${name}): ${err.message}`);
      }
    }

    return { applied: newly };
  } finally {
    client.release();
  }
}

module.exports = { runAllMigrations };
