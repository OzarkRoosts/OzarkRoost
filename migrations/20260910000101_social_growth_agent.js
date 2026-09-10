exports.up = async function (pool) {
  await pool.query("CREATE TABLE IF NOT EXISTS social_connections (id SERIAL PRIMARY KEY, platform VARCHAR(32) NOT NULL, account_name VARCHAR(255), enabled BOOLEAN NOT NULL DEFAULT FALSE, status VARCHAR(32) NOT NULL DEFAULT 'not_configured', external_account_id VARCHAR(255), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(platform, external_account_id))");
  await pool.query("CREATE TABLE IF NOT EXISTS social_publish_jobs (id SERIAL PRIMARY KEY, platform VARCHAR(32) NOT NULL, content TEXT NOT NULL, media_url TEXT, link_url TEXT, scheduled_for TIMESTAMPTZ NOT NULL DEFAULT NOW(), status VARCHAR(32) NOT NULL DEFAULT 'queued', idempotency_key VARCHAR(255) NOT NULL UNIQUE, external_post_id VARCHAR(255), attempts INTEGER NOT NULL DEFAULT 0, last_error TEXT, published_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");
  await pool.query("CREATE INDEX IF NOT EXISTS idx_social_jobs_due ON social_publish_jobs(status, scheduled_for)");
  await pool.query("CREATE INDEX IF NOT EXISTS idx_social_jobs_platform ON social_publish_jobs(platform, status)");
  await pool.query("CREATE TABLE IF NOT EXISTS social_publish_audit (id BIGSERIAL PRIMARY KEY, job_id INTEGER REFERENCES social_publish_jobs(id) ON DELETE SET NULL, platform VARCHAR(32) NOT NULL, action VARCHAR(32) NOT NULL, outcome VARCHAR(32) NOT NULL, detail JSONB NOT NULL DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");
  await pool.query("CREATE INDEX IF NOT EXISTS idx_social_audit_job ON social_publish_audit(job_id, created_at DESC)");
};

exports.down = async function (pool) {
  await pool.query('DROP TABLE IF EXISTS social_publish_audit');
  await pool.query('DROP TABLE IF EXISTS social_publish_jobs');
  await pool.query('DROP TABLE IF EXISTS social_connections');
};
