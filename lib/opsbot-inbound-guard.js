const { isAutomatedInboundSender } = require('./inbound-email-policy');

function classifyConversationGuard({ sender = '', subject = '', body = '' }) {
  if (isAutomatedInboundSender(sender, subject, body)) return { status: 'ignored', category: 'automated_delivery' };
  const text = `${subject}\n${body}`.trim();
  if (/\b(remove|delete|take down|unlist)\b[\s\S]{0,120}\b(us|our|business|listing|company)\b|\bdo not contact|\bstop (email|contacting|outreach)\b/i.test(text)) return { status: 'ignored', category: 'contact_suppressed' };
  if (/\b(false|incorrect|wrong|inaccurate|not true|misleading)\b[\s\S]{0,120}\b(info|information|listing|website|site|business|company)\b|\bwe (are not|don't|do not) want to be listed\b/i.test(text)) return { status: 'review', category: 'business_complaint' };
  if (/\b(paid|payment|charge|charged|invoice|receipt|billing)\b[\s\S]{0,100}\b(check|already|thought|did|can you|where|when)\b/i.test(text)) return { status: 'review', category: 'payment_review' };
  return { status: 'unread', category: null };
}

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
    THEN NEW.status := 'ignored'; NEW.category := 'automated_delivery'; RETURN NEW;
    END IF;
    IF lower(coalesce(NEW.subject, '') || ' ' || coalesce(NEW.body_text, '')) ~ '(remove|delete|take down|unlist).{0,120}(us|our|business|listing|company)|(do not contact)|(stop (email|contacting|outreach))' THEN NEW.status := 'ignored'; NEW.category := 'contact_suppressed'; RETURN NEW; END IF;
    IF lower(coalesce(NEW.subject, '') || ' ' || coalesce(NEW.body_text, '')) ~ '(false|incorrect|wrong|inaccurate|not true|misleading).{0,120}(info|information|listing|website|site|business|company)|(we are not|we don.t|we do not) want to be listed' THEN NEW.status := 'review'; NEW.category := 'business_complaint'; RETURN NEW; END IF;
    IF lower(coalesce(NEW.subject, '') || ' ' || coalesce(NEW.body_text, '')) ~ '(paid|payment|charge|charged|invoice|receipt|billing).{0,100}(check|already|thought|did|can you|where|when)' THEN NEW.status := 'review'; NEW.category := 'payment_review'; RETURN NEW; END IF;
    RETURN NEW;
  END;
  $$;

  DROP TRIGGER IF EXISTS opsbot_inbound_automation_guard ON opsbot_inbound_emails;
  CREATE TRIGGER opsbot_inbound_automation_guard BEFORE INSERT ON opsbot_inbound_emails FOR EACH ROW EXECUTE FUNCTION opsbot_guard_automated_inbound();

  UPDATE opsbot_inbound_emails SET status = CASE
      WHEN lower(coalesce(subject, '') || ' ' || coalesce(body_text, '')) ~ '(false|incorrect|wrong|inaccurate|not true|misleading).{0,120}(info|information|listing|website|site|business|company)|(we are not|we don.t|we do not) want to be listed' THEN 'review'
      WHEN lower(coalesce(subject, '') || ' ' || coalesce(body_text, '')) ~ '(remove|delete|take down|unlist).{0,120}(us|our|business|listing|company)|(do not contact)|(stop (email|contacting|outreach))' THEN 'ignored'
      WHEN lower(coalesce(subject, '') || ' ' || coalesce(body_text, '')) ~ '(paid|payment|charge|charged|invoice|receipt|billing).{0,100}(check|already|thought|did|can you|where|when)' THEN 'review'
      ELSE status END,
    category = CASE
      WHEN lower(coalesce(subject, '') || ' ' || coalesce(body_text, '')) ~ '(false|incorrect|wrong|inaccurate|not true|misleading).{0,120}(info|information|listing|website|site|business|company)|(we are not|we don.t|we do not) want to be listed' THEN 'business_complaint'
      WHEN lower(coalesce(subject, '') || ' ' || coalesce(body_text, '')) ~ '(remove|delete|take down|unlist).{0,120}(us|our|business|listing|company)|(do not contact)|(stop (email|contacting|outreach))' THEN 'contact_suppressed'
      WHEN lower(coalesce(subject, '') || ' ' || coalesce(body_text, '')) ~ '(paid|payment|charge|charged|invoice|receipt|billing).{0,100}(check|already|thought|did|can you|where|when)' THEN 'payment_review'
      ELSE category END WHERE status = 'unread';
`;

async function ensureInboundAutomationGuard(client) { await client.query(GUARD_SQL); }
module.exports = { ensureInboundAutomationGuard, GUARD_SQL, classifyConversationGuard };
