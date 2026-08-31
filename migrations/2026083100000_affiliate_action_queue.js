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

      CREATE OR REPLACE FUNCTION enqueue_affiliate_opportunity_action()
      RETURNS TRIGGER AS $$
      BEGIN
        INSERT INTO affiliate_action_queue
          (action_key, action, mode, status, page_path, platform, category,
           suggested_text, priority, estimated_monthly_value, reason, instructions, payload)
        VALUES
          ('placement:' || NEW.page_path || ':' || NEW.platform || ':' || NEW.opportunity_type,
           'add_or_fix_affiliate_cta', 'human_approval', 'pending',
           NEW.page_path, NEW.platform, NEW.opportunity_type,
           NEW.suggested_text, COALESCE(NEW.priority, 0), COALESCE(NEW.estimated_value, 0),
           'affiliate opportunity detected',
           'Review the page and add or fix the approved affiliate CTA/widget.',
           jsonb_build_object('opportunity_id', NEW.id, 'page_path', NEW.page_path,
             'platform', NEW.platform, 'category', NEW.opportunity_type))
        ON CONFLICT (action_key) DO UPDATE SET
          priority = EXCLUDED.priority,
          estimated_monthly_value = EXCLUDED.estimated_monthly_value,
          suggested_text = EXCLUDED.suggested_text,
          payload = EXCLUDED.payload,
          updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS affiliate_opportunity_action_trigger ON affiliate_opportunities;
      CREATE TRIGGER affiliate_opportunity_action_trigger
        AFTER INSERT OR UPDATE OF suggested_text, priority, estimated_value, status
        ON affiliate_opportunities
        FOR EACH ROW
        WHEN (NEW.status <> 'rejected')
        EXECUTE FUNCTION enqueue_affiliate_opportunity_action();

      INSERT INTO affiliate_action_queue
        (action_key, action, mode, status, page_path, platform, category,
         suggested_text, priority, estimated_monthly_value, reason, instructions, payload)
      SELECT
        'placement:' || o.page_path || ':' || o.platform || ':' || o.opportunity_type,
        'add_or_fix_affiliate_cta', 'human_approval', 'pending', o.page_path, o.platform,
        o.opportunity_type, o.suggested_text, COALESCE(o.priority,0), COALESCE(o.estimated_value,0),
        'existing affiliate opportunity backfilled',
        'Review the page and add or fix the approved affiliate CTA/widget.',
        jsonb_build_object('opportunity_id', o.id, 'page_path', o.page_path,
          'platform', o.platform, 'category', o.opportunity_type)
      FROM affiliate_opportunities o
      WHERE o.status <> 'rejected'
      ON CONFLICT (action_key) DO UPDATE SET
        priority = EXCLUDED.priority,
        estimated_monthly_value = EXCLUDED.estimated_monthly_value,
        suggested_text = EXCLUDED.suggested_text,
        payload = EXCLUDED.payload,
        updated_at = NOW();
    `);
  }
};
