const { adventures, categories } = require('./adventures');
const { VERIFIED_DESTINATION_SLUGS } = require('./verified-destinations');
const { shouldPublishAdventure } = require('./content-source-policy');

// Only explicitly reviewed, source-backed destinations are public. The source
// inventory can grow without publishing unreviewed claims by accident.
const directory = adventures
  .filter(adventure => VERIFIED_DESTINATION_SLUGS.has(adventure.slug))
  .filter(adventure => {
    const result = shouldPublishAdventure({
      name: adventure.name,
      description: adventure.description,
      sourceUrl: adventure.url,
      verified: true
    });
    if (!result.ok) console.warn(`[ContentPolicy] withheld ${adventure.slug}: ${result.reason}`);
    return result.ok;
  })
  .slice(0, 100);

const getAdventureBySlug = slug => {
  const normalized = String(slug || '').trim().toLowerCase();
  return directory.find(adventure => adventure.slug === normalized) || null;
};

module.exports = {
  adventures: directory,
  categories,
  getAdventureBySlug
};
