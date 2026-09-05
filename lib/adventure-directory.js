const { adventures, categories } = require('./adventures');

// The public Adventures page intentionally launches with a tight 100-place starter map.
// The source inventory can grow beyond this without changing the page contract.
const directory = adventures.slice(0, 100);

module.exports = {
  adventures: directory,
  categories
};
