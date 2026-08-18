require('dotenv').config();

async function start() {
  const pool = require('./db/index');
  const { runAllMigrations } = require('./migrate-runner');
  await runAllMigrations(pool);
  const fundingAgent = require('./lib/funding-opportunity-agent');
  fundingAgent.start();
  const growthAgent = require('./lib/free-growth-agent');
  growthAgent.start();
  require('./server');
}

start().catch(err => {
  console.error('Startup failed:', err.message);
  process.exit(1);
});
