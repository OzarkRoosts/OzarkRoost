require('dotenv').config();

async function repairAffiliateExecutionSchema(pool) {
  // Do this defensively at runtime as well as through migrations. Production
  // databases can have a migration recorded as applied while a column is
  // missing (for example after an interrupted/manual schema change). The
  // executor must never start against an incompatible schema.
  await pool.query(`
    ALTER TABLE opsbot_affiliate_applications
      ADD COLUMN IF NOT EXISTS execution_method TEXT,
      ADD COLUMN IF NOT EXISTS response_status INTEGER,
      ADD COLUMN IF NOT EXISTS response_url TEXT,
      ADD COLUMN IF NOT EXISTS last_error TEXT,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    CREATE INDEX IF NOT EXISTS opsbot_affiliate_applications_execution_idx
      ON opsbot_affiliate_applications (status, updated_at);
  `);
  console.log('[startup] affiliate execution schema verified');
}

async function start() {
  const pool = require('./db/index');
  const { runAllMigrations } = require('./migrate-runner');
  await runAllMigrations(pool);
  await repairAffiliateExecutionSchema(pool);

  const fundingAgent = require('./lib/funding-opportunity-agent');
  fundingAgent.start();

  // Keep Rover's partner intelligence running continuously. This is
  // research-first: it discovers and queues opportunities, but does not
  // send outreach or make commitments unless separately enabled.
  if (process.env.PARTNER_DISCOVERY_ENABLED !== 'false') {
    const partnerDiscovery = require('./lib/partner-discovery-agent');
    partnerDiscovery.start();
  }

  // Affiliate applications now move beyond perpetual drafts. The executor
  // submits supported HTML forms automatically and records needs_human when
  // a target requires CAPTCHA, MFA, a login, an external JS portal, or an
  // otherwise unsafe/unmappable field.
  if (process.env.AFFILIATE_APPLICATION_EXECUTION !== 'false') {
    const affiliateExecutor = require('./lib/affiliate-application-executor');
    affiliateExecutor.start();
  }

  require('./server');
}

start().catch(err => {
  console.error('Startup failed:', err.message);
  process.exit(1);
});
