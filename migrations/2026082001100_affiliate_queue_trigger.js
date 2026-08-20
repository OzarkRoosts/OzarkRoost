module.exports = {
  name: 'affiliate_application_queue_trigger',
  up: async (client) => {
    await client.query(`
      CREATE OR REPLACE FUNCTION queue_affiliate_application()
      RETURNS TRIGGER AS $$
      BEGIN
        IF NEW.status = 'drafted' THEN
          NEW.status := 'queued';
        END IF;
        NEW.updated_at := NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trg_queue_affiliate_application
        ON opsbot_affiliate_applications;

      CREATE TRIGGER trg_queue_affiliate_application
        BEFORE INSERT OR UPDATE OF status ON opsbot_affiliate_applications
        FOR EACH ROW EXECUTE FUNCTION queue_affiliate_application();

      UPDATE opsbot_affiliate_applications
      SET status = 'queued', last_error = NULL, updated_at = NOW()
      WHERE status = 'drafted';
    `);
  }
};
