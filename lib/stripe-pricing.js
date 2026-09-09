const TIERS = Object.freeze({
  starter: Object.freeze({ label: 'Starter', monthlyPrice: 49 }),
  featured: Object.freeze({ label: 'Featured', monthlyPrice: 99 }),
  dominant: Object.freeze({ label: 'Dominant', monthlyPrice: 149 }),
});

function getTier(value) {
  if (value === 'founding') return 'founding';
  return Object.prototype.hasOwnProperty.call(TIERS, value) ? value : 'founding';
}

function isPaidTier(value) {
  return Object.prototype.hasOwnProperty.call(TIERS, value);
}

module.exports = { TIERS, getTier, isPaidTier };
