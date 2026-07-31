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

  const config = {
    connectionString: databaseUrl
  };

  if (!isLocalDatabaseUrl(databaseUrl)) {
    config.ssl = { rejectUnauthorized: false };
  }

  return config;
}

module.exports = {
  getDatabaseConfig,
  isLocalDatabaseUrl
};
