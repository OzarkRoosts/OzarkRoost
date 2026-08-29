// Load Render/SMTP environment aliases before ANY application module is loaded.
// This is intentionally explicit rather than relying only on NODE_OPTIONS, because
// OpsBot constructs its SMTP transport at module-load time.
require('./lib/runtime-env');
require('dotenv').config();

async function repairAffiliateExecutionSchema(pool) {
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

  if (process.env.PARTNER_DISCOVERY_ENABLED !== 'false') {
    const partnerDiscovery = require('./lib/partner-discovery-agent');
    partnerDiscovery.start();
  }

  if (process.env.AFFILIATE_APPLICATION_EXECUTION !== 'false') {
    const affiliateExecutor = require('./lib/affiliate-application-executor');
    affiliateExecutor.start();
  }

  if (process.env.LOCAL_OUTREACH_ENABLED !== 'false') {
    const localOutreach = require('./lib/local-outreach-agent');
    localOutreach.start();
  }

  // Travelpayouts is enabled automatically whenever the Render secret exists.
  // TRAVELPAYOUTS_API_ENABLED=false remains the only explicit kill switch.
  const travelpayoutsOps = require('./lib/travelpayouts-ops');
  const travelpayoutsApiEnabled = travelpayoutsOps.configured();
  console.log(`[Travelpayouts] API integration: configured=${travelpayoutsApiEnabled} kill_switch=${process.env.TRAVELPAYOUTS_API_ENABLED === 'false'}`);

  if (travelpayoutsApiEnabled && process.env.TRAVELPAYOUTS_API_ENABLED !== 'false') {
    const syncTravelpayouts = async () => {
      await travelpayoutsOps.run();
    };
    await syncTravelpayouts();
    const intervalMs = Number(process.env.TRAVELPAYOUTS_SYNC_INTERVAL_MS || 15 * 60 * 1000);
    setInterval(syncTravelpayouts, intervalMs);
    console.log(`[Travelpayouts] Revenue sync enabled every ${Math.round(intervalMs / 60000)} minutes`);
  } else if (!travelpayoutsApiEnabled) {
    console.warn('[Travelpayouts] API secret missing: set TRAVELPAYOUTS_API_TOKEN in Render to enable revenue operations.');
  } else {
    console.warn('[Travelpayouts] Revenue sync explicitly disabled by TRAVELPAYOUTS_API_ENABLED=false.');
  }

  require('./server');
}

start().catch(err => {
  console.error('Startup failed:', err.message);
  process.exit(1);
});
