const SPONSORSHIP_INVENTORY = Object.freeze([
  { type: 'sponsored destination page', priceCents: null },
  { type: 'featured lodging', priceCents: null },
  { type: 'featured restaurant', priceCents: null },
  { type: 'featured adventure', priceCents: null },
  { type: 'homepage placement', priceCents: null },
  { type: 'newsletter sponsorship', priceCents: null },
  { type: 'sponsored regional page', priceCents: null },
  { type: 'featured social promotion', priceCents: null },
  { type: 'campaign package', priceCents: null },
]);

function getSponsorshipInventory() {
  return SPONSORSHIP_INVENTORY.map(item => ({ ...item }));
}

module.exports = { SPONSORSHIP_INVENTORY, getSponsorshipInventory };
