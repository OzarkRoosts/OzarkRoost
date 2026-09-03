const BOUNCE_SENDERS = /(^|[<\s])(mailer-daemon|postmaster)([>@\s]|$)/i;
const BOUNCE_SUBJECTS = /(undeliverable|delivery status notification|mail delivery failed|returned mail|delivery failure|failure notice|message not delivered|delivery incomplete)/i;

function isBounceOrDeliveryNotice({ from = '', subject = '' } = {}) {
  return BOUNCE_SENDERS.test(String(from)) || BOUNCE_SUBJECTS.test(String(subject));
}

module.exports = { isBounceOrDeliveryNotice };
