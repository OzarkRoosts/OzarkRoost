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

  require('./server');
}

start().catch(err => {
  console.error('Startup failed:', err.message);
  process.exit(1);
});
