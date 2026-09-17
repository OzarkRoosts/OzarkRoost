module.exports = {
  name: 'opsbot_learning',
  up: async (client) => {
    await client.query(`
      CREATE TABLE IF NOT EXISTS opsbot_learning_lessons (
        id BIGSERIAL PRIMARY KEY,
        category TEXT NOT NULL,
        trigger_pattern TEXT NOT NULL,
        response_principle TEXT NOT NULL,
        evidence_count INTEGER NOT NULL DEFAULT 1,
        confidence NUMERIC NOT NULL DEFAULT 0,
        safety_score NUMERIC NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'quarantined',
        source_thread_key TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        approved_at TIMESTAMPTZ
      );
      CREATE INDEX IF NOT EXISTS opsbot_learning_status_idx
        ON opsbot_learning_lessons (status, confidence DESC, evidence_count DESC);
    `);
  },
};
