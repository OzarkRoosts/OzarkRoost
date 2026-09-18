function isLocalDatabaseUrl(databaseUrl) {
  try {
    const { hostname } = new URL(databaseUrl);
    return ['localhost', '127.0.0.1', '::1', '[::1]'].includes(hostname);
  } catch (_err) {
    return false;
  }
}

function getDatabaseConfig() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('ERROR: DATABASE_URL is required');
    process.exit(1);
  }

  // Render's private Postgres hostname is only resolvable from services in
  // the same region. The production web service runs in Oregon while the
  // primary database is in Virginia, so normalize that known internal host
  // to Render's public TLS endpoint without exposing or replacing credentials.
  let effectiveDatabaseUrl = databaseUrl;
  try {
    const parsed = new URL(databaseUrl);
    if (parsed.hostname === 'dpg-damhu3ek1f9s7394emjg-a') {
      parsed.hostname = 'dpg-damhu3ek1f9s7394emjg-a.virginia-postgres.render.com';
      effectiveDatabaseUrl = parsed.toString();
      console.warn('[db] normalized legacy cross-region Render hostname to TLS endpoint');
    }
  } catch (err) {
    console.error('[db] invalid DATABASE_URL:', err.message);
    throw err;
  }

  const config = { connectionString: effectiveDatabaseUrl };

  if (!isLocalDatabaseUrl(databaseUrl)) {
    // Preserve the application's existing certificate behavior while making
    // the pg-connection-string intent explicit for future driver versions.
    config.ssl = { rejectUnauthorized: false };
  }

  return config;
}

module.exports = {
  getDatabaseConfig,
  isLocalDatabaseUrl
};
