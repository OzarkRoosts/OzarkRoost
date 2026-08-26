const { execFileSync } = require('child_process');

// Vercel's build environment must be able to build the application without
// requiring a live PostgreSQL connection. Runtime/database deployments can
// still run `npm run migrate` explicitly.
if (process.env.VERCEL === '1') {
  console.log('[build] Vercel detected; skipping database migrations during build.');
  process.exit(0);
}

console.log('[build] Running database migrations for non-Vercel deployment...');
execFileSync(process.execPath, ['migrate.js'], { stdio: 'inherit' });
