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

  let effectiveDatabaseUrl = databaseUrl;
  try {
    const parsed = new URL(databaseUrl);    parsed.searchParams.delete('sslmode');
    effectiveDatabaseUrl = parsed.toString();
  } catch (err) {
    console.error('[db] invalid DATABASE_URL:', err.message);
    throw err;
  }

  const config = { connectionString: effectiveDatabaseUrl };

  if (!isLocalDatabaseUrl(databaseUrl)) {
    config.ssl = { rejectUnauthorized: false };
  }

  return config;
}

module.exports = {
  getDatabaseConfig,
  isLocalDatabaseUrl
};
