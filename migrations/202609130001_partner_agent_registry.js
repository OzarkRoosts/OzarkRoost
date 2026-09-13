module.exports = {
  name: 'partner_agent_registry',
  async up(client) {
    await client.query(`
      CREATE TABLE IF NOT EXISTS partner_opportunities (
        id BIGSERIAL PRIMARY KEY,
        kind VARCHAR(32) NOT NULL CHECK (kind IN ('affiliate', 'sponsorship')),
        name TEXT NOT NULL,
        partner_key TEXT NOT NULL UNIQUE,
        category TEXT,
        state VARCHAR(64) NOT NULL DEFAULT 'discovered',
        score INTEGER NOT NULL DEFAULT 0,
        application_url TEXT,
        program_url TEXT,
        terms_url TEXT,
        source_url TEXT,
        source_name TEXT,
        next_action_at TIMESTAMPTZ,
        needs_human BOOLEAN NOT NULL DEFAULT FALSE,
        policy_decision VARCHAR(32),
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS partner_applications (
        id BIGSERIAL PRIMARY KEY,
        opportunity_id BIGINT NOT NULL REFERENCES partner_opportunities(id) ON DELETE CASCADE,
        status VARCHAR(32) NOT NULL DEFAULT 'prepared',
        external_id TEXT,
        submitted_at TIMESTAMPTZ,
        decided_at TIMESTAMPTZ,
        application_url TEXT,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (opportunity_id)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS sponsorship_opportunities (
        id BIGSERIAL PRIMARY KEY,
        opportunity_id BIGINT NOT NULL UNIQUE REFERENCES partner_opportunities(id) ON DELETE CASCADE,
        contact_email TEXT,
        contact_url TEXT,
        offer_type TEXT,
        proposed_value_cents INTEGER,
        currency CHAR(3) DEFAULT 'USD',
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS partner_actions (
        id BIGSERIAL PRIMARY KEY,
        opportunity_id BIGINT NOT NULL REFERENCES partner_opportunities(id) ON DELETE CASCADE,
        action_type VARCHAR(64) NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'pending',
        idempotency_key TEXT NOT NULL UNIQUE,
        scheduled_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        requires_human BOOLEAN NOT NULL DEFAULT FALSE,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS partner_events (
        id BIGSERIAL PRIMARY KEY,
        opportunity_id BIGINT REFERENCES partner_opportunities(id) ON DELETE SET NULL,
        event_type VARCHAR(64) NOT NULL,
        idempotency_key TEXT NOT NULL UNIQUE,
        external_id TEXT,
        occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS partner_attribution (
        id BIGSERIAL PRIMARY KEY,
        opportunity_id BIGINT NOT NULL REFERENCES partner_opportunities(id) ON DELETE CASCADE,
        source VARCHAR(64) NOT NULL,
        external_id TEXT,
        event_type VARCHAR(64) NOT NULL,
        amount_cents INTEGER,
        currency CHAR(3) DEFAULT 'USD',
        verified BOOLEAN NOT NULL DEFAULT FALSE,
        occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb
      )
    `);

    await client.query('CREATE INDEX IF NOT EXISTS partner_opportunities_state_idx ON partner_opportunities (state, next_action_at)');
    await client.query('CREATE INDEX IF NOT EXISTS partner_opportunities_kind_idx ON partner_opportunities (kind, score DESC)');
    await client.query('CREATE INDEX IF NOT EXISTS partner_actions_pending_idx ON partner_actions (status, scheduled_at)');
    await client.query('CREATE INDEX IF NOT EXISTS partner_events_opportunity_idx ON partner_events (opportunity_id, occurred_at DESC)');
    await client.query('CREATE INDEX IF NOT EXISTS partner_attribution_verified_idx ON partner_attribution (verified, occurred_at DESC)');
  },
};
