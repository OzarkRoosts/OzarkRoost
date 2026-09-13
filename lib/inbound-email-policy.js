const AUTOMATED_SENDER_RE = /(?:^|[<\s])(postmaster|mailer-daemon|mailerdemon|no-reply|noreply)(?:[+@\s>]|$)/i;
const KNOWN_AUTOMATED_SENDERS = new Set([
  'notifications@github.com',
  'noreply@github.com',
  'noreply@render.com',
]);
const DELIVERY_FAILURE_SUBJECT_RE = /(?:undeliverable|delivery status notification|mail delivery subsystem|returned mail|delivery failure|failure notice|message not delivered)/i;

function isAutomatedInboundSender(sender, subject = '', body = '') {
  const normalizedSender = String(sender || '').trim().toLowerCase();
  if (!normalizedSender) return false;
  if (KNOWN_AUTOMATED_SENDERS.has(normalizedSender)) return true;
  if (AUTOMATED_SENDER_RE.test(normalizedSender)) return true;
  return DELIVERY_FAILURE_SUBJECT_RE.test(String(subject || ''))
    || DELIVERY_FAILURE_SUBJECT_RE.test(String(body || '').slice(0, 4000));
}

module.exports = { isAutomatedInboundSender };
