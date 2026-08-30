const clean = (value) => String(value || '').trim();

function scoreOffer(intent, offer) {
  const text = clean(intent).toLowerCase();
  const intents = Array.isArray(offer.intent) ? offer.intent : [];
  const intentHits = intents.reduce((n, item) => n + (text.includes(String(item).toLowerCase()) ? 1 : 0), 0);
  const categoryHit = clean(offer.category) && text.includes(clean(offer.category).toLowerCase()) ? 1 : 0;
  return Number(offer.revenueScore || 0) + intentHits * 10 + categoryHit * 4;
}

function rankPlacements(intent, offers) {
  return (Array.isArray(offers) ? offers : [])
    .filter((offer) => /^https?:\/\//i.test(clean(offer.url)))
    .map((offer) => ({ ...offer, score: scoreOffer(intent, offer) }))
    .sort((a, b) => b.score - a.score);
}

function buildPlacementPrompt({ page, intent, offers }) {
  const names = (Array.isArray(offers) ? offers : []).map((offer) => `${offer.key}: ${offer.label}`).join(', ');
  return [
    'You are OzarkRoost\'s affiliate placement strategist.',
    `Page: ${clean(page)}`,
    `Traveler intent: ${clean(intent)}`,
    `Approved/known offers: ${names || 'none'}`,
    'Choose placements that genuinely help the traveler and fit the page intent.',
    'Use approved links only. Do not invent partner IDs, approvals, commissions, prices, availability, reviews, or URLs.',
    'Prefer one strong primary CTA and useful secondary options over clutter.',
    'If an action requires human approval, authentication, CAPTCHA, contractual acceptance, or payment, queue it for a human instead of bypassing the control.',
  ].join('\n');
}

module.exports = { rankPlacements, buildPlacementPrompt, scoreOffer };
