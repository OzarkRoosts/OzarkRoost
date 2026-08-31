module.exports = {
  name: 'affiliate_action_queue',
  up: async (client) => {
    await client.query(`
      CREATE TABLE IF NOT EXISTS affiliate_action_queue (
        id BIGSERIAL PRIMARY KEY,
        action_key TEXT NOT NULL UNIQUE,
        action TEXT NOT NULL,
        mode VARCHAR(32) NOT NULL DEFAULT 'human_approval',
        status VARCHAR(32) NOT NULL DEFAULT 'pending',
        page_path TEXT,
        platform VARCHAR(100),
        category VARCHAR(100),
        suggested_text TEXT,
        suggested_url TEXT,
        priority INTEGER NOT NULL DEFAULT 0,
        estimated_monthly_value NUMERIC(12,2) NOT NULL DEFAULT 0,
        reason TEXT,
        instructions TEXT,
        payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        claimed_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        last_error TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS affiliate_action_queue_status_priority_idx
        ON affiliate_action_queue (status, priority DESC, created_at ASC);
      CREATE INDEX IF NOT EXISTS affiliate_action_queue_platform_idx
        ON affiliate_action_queue (platform, status);
    `);
  }
};
