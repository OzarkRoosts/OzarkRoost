module.exports = {
  name: 'opsbot_conversation_memory',
  up: async (client) => {
    await client.query(`
      CREATE TABLE IF NOT EXISTS opsbot_conversation_state (
        thread_key TEXT PRIMARY KEY,
        sender_email TEXT,
        suppressed BOOLEAN NOT NULL DEFAULT FALSE,
        payment_verified BOOLEAN NOT NULL DEFAULT FALSE,
        last_intent TEXT,
        last_confidence NUMERIC,
        last_action TEXT,
        last_response_hash TEXT,
        last_inbound_at TIMESTAMPTZ,
        last_outbound_at TIMESTAMPTZ,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS opsbot_conversation_events (
        id BIGSERIAL PRIMARY KEY,
        thread_key TEXT NOT NULL,
        message_id TEXT,
        direction TEXT NOT NULL,
        intent TEXT,
        confidence NUMERIC,
        action TEXT,
        reason_codes JSONB NOT NULL DEFAULT '[]'::jsonb,
        outcome TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS opsbot_conversation_events_thread_idx
        ON opsbot_conversation_events (thread_key, created_at DESC);
    `);
  },
};
