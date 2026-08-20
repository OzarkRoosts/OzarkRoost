require('dotenv').config();

async function start() {
  const pool = require('./db/index');
  const { runAllMigrations } = require('./migrate-runner');
  await runAllMigrations(pool);

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
