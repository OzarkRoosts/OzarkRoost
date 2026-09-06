const express = require('express');
const { getAffiliateLinks } = require('../lib/affiliate-links');
const { getHighIntentGuide } = require('../lib/high-intent-guides');
const { CLUSTER_TWO_GUIDES } = require('../lib/high-intent-guides-cluster-2');

const router = express.Router();
const BASE_URL = (process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:3000').replace(/\/$/, '');

const PRIMARY_GUIDE_SLUGS = [
  'best-things-to-do-eureka-springs', 'buffalo-river-float-trips', 'ozarks-waterfalls', 'ozarks-weekend-getaway',
  'cabins-near-eureka-springs', 'family-things-to-do-ozarks', 'romantic-getaways-ozarks', 'best-hiking-ozarks'
];
const CLUSTER_TWO_SLUGS = CLUSTER_TWO_GUIDES.map(page => page.slug);
const GUIDE_SLUGS = [...PRIMARY_GUIDE_SLUGS, ...CLUSTER_TWO_SLUGS];

function resolveGuide(slug) {
  return getHighIntentGuide(slug) || (() => {
    const page = CLUSTER_TWO_GUIDES.find(item => item.slug === slug);
    if (!page) return null;
    return { ...page, destinations: page.destinationSlugs.map(require('../lib/adventure-directory').getAdventureBySlug).filter(Boolean) };
  })();
}

for (const slug of GUIDE_SLUGS) {
  router.get(`/${slug}`, (_req, res) => {
    const page = resolveGuide(slug);
    if (!page) return res.status(404).send('Guide not found');
    return res.render('guides/high-intent', {
      meta: { title: page.title, description: page.description, canonical: `${BASE_URL}/guides/${slug}` },
      baseUrl: BASE_URL,
      page,
      affiliateLinks: getAffiliateLinks(),
    });
  });
}

module.exports = router;
