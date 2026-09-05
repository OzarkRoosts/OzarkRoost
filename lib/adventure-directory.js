const { adventures, categories } = require('./adventures');

// The public Adventures page intentionally launches with a tight 100-place starter map.
// The source inventory can grow beyond this without changing the page contract.
const directory = adventures.slice(0, 100);

const getAdventureBySlug = slug => {
  const normalized = String(slug || '').trim().toLowerCase();
  return directory.find(adventure => adventure.slug === normalized) || null;
};

module.exports = {
  adventures: directory,
  categories,
  getAdventureBySlug
};
