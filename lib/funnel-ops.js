function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function assertValidInquiry(inquiry) {
  if (!inquiry || !inquiry.id) throw new Error('operator inquiry is required');
  if (!normalizeEmail(inquiry.email).match(/^[^\t\n\r@]+@[^\t\n\r@]+\.[^\t\n\r@]+$/)) throw new Error('a valid operator email is required');
}

async function activateOperatorFunnel({ inquiry, paymentLink, sendEmail, enqueueNurtureSequence }) {
  assertValidInquiry(inquiry);
  if (typeof sendEmail !== 'function') throw new Error('funnel email sender is required');
  if (typeof enqueueNurtureSequence !== 'function') throw new Error('funnel nurture queue is required');
  const link = String(paymentLink || '').trim();
  if (!link) throw new Error('funnel payment link is required');

  const email = normalizeEmail(inquiry.email);
  const firstName = String(inquiry.operator_name || 'there').trim().split(/\s+/)[0] || 'there';
  const property = String(inquiry.property_name || 'your property').trim();
  const subject = `Next step for ${property} on OzarkRoost`;
  const text = `Hi ${firstName},\n\nThanks for reaching out about ${property}. We can get your OzarkRoost listing moving right away; the listing plan is $49/month with no long-term contract.\n\nComplete your listing here: ${link}\n\nIf you have a question before starting, just reply to this email and we will help.\n\n— OzarkRoost`;
  const html = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>').replace(link, `<a href="${link}">${link}</a>`);

  await enqueueNurtureSequence(email);
  const sent = await sendEmail({ to: email, subject, html, text });
  return { status: sent ? 'activated' : 'queued', needsHuman: false, inquiryId: inquiry.id, email };
}

module.exports = { activateOperatorFunnel, normalizeEmail };
