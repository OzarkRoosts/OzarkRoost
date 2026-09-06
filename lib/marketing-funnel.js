const crypto = require('node:crypto');

const OUTREACH_SEQUENCE = [
  { stage: 'first_touch', delayDays: 0, subject: p => `A free founding spot for ${p.business_name} on OzarkRoost`, text: 'First-touch founding invitation', body: p => `Hi ${p.business_name} team,\n\nWe're building a focused Ozarks travel directory for stays, outdoor adventures, food and local businesses. We're offering a limited number of founding directory spots free while we build the local network.\n\nWe'd be happy to add ${p.business_name} with your official details and a direct link. Reply if you'd like to claim the spot or correct anything.\n\nSee OzarkRoost: ${p.siteUrl}\nClaim/list: ${p.listingUrl}\n\nIf you don't want future messages from OzarkRoost, reply "unsubscribe" and we'll stop.\n\nThanks,\nOzarkRoost` },
  { stage: 'follow_up', delayDays: 4, subject: p => `Following up: free OzarkRoost founding listing for ${p.business_name}`, text: 'Follow-up founding listing reminder', body: p => `Hi ${p.business_name} team,\n\nJust following up on the free founding listing invitation. We can publish your official business details and link at no charge during the founding period.\n\nIf you'd like us to add or correct the listing, just reply. If you don't want future messages, reply "unsubscribe" and we'll suppress the contact.\n\n${p.siteUrl}\n\nThanks,\nOzarkRoost` },
  { stage: 'final_offer', delayDays: 7, subject: p => `Final founding offer for ${p.business_name} on OzarkRoost`, text: 'Final founding offer notice', body: p => `Hi ${p.business_name} team,\n\nLast note from us: we're closing this round of free founding listings soon. If you'd like ${p.business_name} included, reply and we'll get the official details set up. After the founding period, enhanced/featured placement will be available as a paid option.\n\n${p.listingUrl}\n\nNo response is needed if you're not interested. Reply "unsubscribe" at any time to stop future outreach.\n\nThanks,\nOzarkRoost` }
];

function getNextOutreachStage(currentStage) {
  if (!currentStage) return 'first_touch';
  const index = OUTREACH_SEQUENCE.findIndex(step => step.stage === currentStage);
  return index >= 0 && index < OUTREACH_SEQUENCE.length - 1 ? OUTREACH_SEQUENCE[index + 1].stage : null;
}
function shouldSuppressOutreach(prospect = {}) { return Boolean(prospect.opted_out || prospect.replied_at || prospect.bounced_at); }
function normalizeSubscriber({ email, consent, source = 'website' }) {
  if (!consent) throw new Error('Explicit consent is required');
  const normalized = String(email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) throw new Error('A valid email address is required');
  return { email: normalized, source: String(source || 'website').slice(0, 80) };
}
function buildTrackedUrl(target, partner, source) {
  if (typeof target !== 'string' || !target) throw new Error('target is required');
  if (target.startsWith('/')) { const url = new URL(target, 'https://ozarkroost.local'); if (source) url.searchParams.set('source', source); return `${url.pathname}${url.search}`; }
  const params = new URLSearchParams({ to: target, partner: partner || 'direct' }); if (source) params.set('source', source); return `/out?${params.toString()}`;
}
function subscriberHash(email) { return crypto.createHash('md5').update(email.trim().toLowerCase()).digest('hex'); }
function mailchimpConfig() {
  const apiKey = process.env.MAILCHIMP_API_KEY; const audienceId = process.env.MAILCHIMP_AUDIENCE_ID;
  if (!apiKey || !audienceId) return null;
  const dc = apiKey.split('-').pop(); if (!dc || dc === apiKey) throw new Error('MAILCHIMP_API_KEY must include its data-center suffix');
  return { apiKey, audienceId, baseUrl: `https://${dc}.api.mailchimp.com/3.0` };
}
async function syncSubscriberToMailchimp(subscriber) {
  const config = mailchimpConfig(); if (!config) return { configured: false, synced: false };
  const hash = subscriberHash(subscriber.email); const auth = Buffer.from(`anystring:${config.apiKey}`).toString('base64');
  const headers = { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' };
  const memberUrl = `${config.baseUrl}/lists/${encodeURIComponent(config.audienceId)}/members/${hash}`;
  const memberResponse = await fetch(memberUrl, { method: 'PUT', headers, body: JSON.stringify({ email_address: subscriber.email, status_if_new: 'subscribed', merge_fields: {}, tags: [{ name: 'ozarkroost-subscriber', status: 'active' }, { name: `source:${subscriber.source}`, status: 'active' }, { name: 'welcome', status: 'active' }] }) });
  if (!memberResponse.ok) throw new Error(`Mailchimp member sync failed (${memberResponse.status})`);
  return { configured: true, synced: true };
}
module.exports = { OUTREACH_SEQUENCE, getNextOutreachStage, shouldSuppressOutreach, normalizeSubscriber, buildTrackedUrl, subscriberHash, mailchimpConfig, syncSubscriberToMailchimp };
