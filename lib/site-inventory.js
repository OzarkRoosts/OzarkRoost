const { adventures } = require('./adventure-directory');
const { CLUSTER_TWO_GUIDES } = require('./high-intent-guides-cluster-2');
const { CLUSTER_THREE_GUIDES } = require('./high-intent-guides-cluster-3');
const { CLUSTER_FOUR_GUIDES } = require('./high-intent-guides-cluster-4');

const CORE_ROUTES = [
  ['/', 'weekly', '1.0'],
  ['/guides/', 'weekly', '1.0'],
  ['/listings', 'weekly', '0.9'],
  ['/adventures', 'weekly', '0.9'],
  ['/list-your-cabin', 'monthly', '0.7'],
  ['/referral', 'monthly', '0.7'],
  ['/faq', 'monthly', '0.5'],
  ['/trip-planner', 'monthly', '0.8']
];

const LEGACY_GUIDES = [
  ['about-the-ozarks', 'monthly', '0.8'],
  ['buffalo-river-cabins', 'monthly', '0.8'],
  ['ozarks-adventures', 'monthly', '0.8'],
  ['ozarks-camping-rv', 'monthly', '0.8'],
  ['hidden-gem-cabins', 'monthly', '0.8'],
  ['buffalo-river-kayaking', 'monthly', '0.8'],
  ['hot-tub-cabins', 'weekly', '0.9'],
  ['pet-friendly-cabins', 'weekly', '0.9'],
  ['treehouse-rentals', 'weekly', '0.9'],
  ['glamping-ozarks', 'weekly', '0.9'],
  ['luxury-cabins', 'weekly', '0.9'],
  ['ozarks-road-trip', 'weekly', '0.9']
];

const GUIDE_CLUSTERS = [CLUSTER_TWO_GUIDES, CLUSTER_THREE_GUIDES, CLUSTER_FOUR_GUIDES];

function normalizeRoute(route) {
  const value = String(route || '/').replace(/^\/+/, '');
  if (!value) return '/';
  const hadTrailingSlash = /\/$/.test(String(route));
  const normalized = `/${value.replace(/\/+$/g, '')}`;
  return hadTrailingSlash ? `${normalized}/` : normalized;
}

function buildUrlMap() {
  const urls = new Map();
  const add = (route, changefreq = 'monthly', priority = '0.7') => {
    const normalized = normalizeRoute(route);
    if (!urls.has(normalized)) urls.set(normalized, { changefreq, priority });
  };

  for (const [route, changefreq, priority] of CORE_ROUTES) add(route, changefreq, priority);
  for (const [slug, changefreq, priority] of LEGACY_GUIDES) add(`/guides/${slug}`, changefreq, priority);

  for (const cluster of GUIDE_CLUSTERS) {
    for (const guide of cluster) {
      if (guide && guide.slug) add(`/guides/${guide.slug}`);
    }
  }

  for (const adventure of adventures) {
    if (adventure && adventure.slug) add(`/adventures/${adventure.slug}`);
  }

  return urls;
}

function getCrawlableUrls(siteUrl = (process.env.SITE_URL || process.env.RENDER_EXTERNAL_URL || 'https://ozarkroost-jibz.onrender.com').replace(/\/$/, '')) {
  return [...buildUrlMap().keys()].sort().map(route => `${siteUrl}${route}`);
}

module.exports = {
  CORE_ROUTES,
  LEGACY_GUIDES,
  GUIDE_CLUSTERS,
  buildUrlMap,
  getCrawlableUrls
};
