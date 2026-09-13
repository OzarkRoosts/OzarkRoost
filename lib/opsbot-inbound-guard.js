const GUARD_SQL = `
  CREATE OR REPLACE FUNCTION opsbot_guard_automated_inbound()
  RETURNS trigger
  LANGUAGE plpgsql
  AS $$
  BEGIN
    IF lower(trim(NEW.sender)) ~ '(^|[<[:space:]])(postmaster|mailer-daemon|mailerdemon|no-reply|noreply)([+@[:space:]]|$)'
       OR lower(trim(NEW.sender)) IN ('notifications@github.com', 'noreply@github.com', 'noreply@render.com')
       OR lower(coalesce(NEW.subject, '')) ~ '(undeliverable|delivery status notification|mail delivery subsystem|returned mail|delivery failure|failure notice|message not delivered)'
       OR lower(left(coalesce(NEW.body_text, ''), 4000)) ~ '(undeliverable|delivery status notification|mail delivery subsystem|returned mail|delivery failure|failure notice|message not delivered)'
    THEN
      NEW.status := 'ignored';
      NEW.category := 'automated_delivery';
    END IF;
    RETURN NEW;
  END;
  $$;

  DROP TRIGGER IF EXISTS opsbot_inbound_automation_guard ON opsbot_inbound_emails;
  CREATE TRIGGER opsbot_inbound_automation_guard
  BEFORE INSERT ON opsbot_inbound_emails
  FOR EACH ROW
  EXECUTE FUNCTION opsbot_guard_automated_inbound();

  UPDATE opsbot_inbound_emails
  SET status = 'ignored', category = 'automated_delivery'
  WHERE status = 'unread'
    AND (
      lower(trim(sender)) ~ '(^|[<[:space:]])(postmaster|mailer-daemon|mailerdemon|no-reply|noreply)([+@[:space:]]|$)'
      OR lower(trim(sender)) IN ('notifications@github.com', 'noreply@github.com', 'noreply@render.com')
      OR lower(coalesce(subject, '')) ~ '(undeliverable|delivery status notification|mail delivery subsystem|returned mail|delivery failure|failure notice|message not delivered)'
      OR lower(left(coalesce(body_text, ''), 4000)) ~ '(undeliverable|delivery status notification|mail delivery subsystem|returned mail|delivery failure|failure notice|message not delivered)'
    );
`;

async function ensureInboundAutomationGuard(client) {
  await client.query(GUARD_SQL);
}

module.exports = { ensureInboundAutomationGuard, GUARD_SQL };
