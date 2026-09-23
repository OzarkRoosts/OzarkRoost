const TIERS = Object.freeze({
  starter: Object.freeze({ label: 'Starter', monthlyPrice: 99 }),
  featured: Object.freeze({ label: 'Featured', monthlyPrice: 149 }),
  dominant: Object.freeze({ label: 'Dominant', monthlyPrice: 199 }),
});

function getTier(value) {
  if (value === 'founding') return 'founding';
  return Object.prototype.hasOwnProperty.call(TIERS, value) ? value : 'founding';
}

function isPaidTier(value) {
  return Object.prototype.hasOwnProperty.call(TIERS, value);
}

module.exports = { TIERS, getTier, isPaidTier };
