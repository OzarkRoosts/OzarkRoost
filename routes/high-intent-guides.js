const express = require('express');
const { getAffiliateLinks } = require('../lib/affiliate-links');
const { getHighIntentGuide } = require('../lib/high-intent-guides');

const router = express.Router();
const BASE_URL = (process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:3000').replace(/\/$/, '');

const GUIDE_SLUGS = [
  'best-things-to-do-eureka-springs',
  'buffalo-river-float-trips',
  'ozarks-waterfalls',
  'ozarks-weekend-getaway',
  'cabins-near-eureka-springs',
  'family-things-to-do-ozarks',
  'romantic-getaways-ozarks',
  'best-hiking-ozarks',
  'missouri-ozarks-float-trips',
  'best-ozarks-springs',
  'best-caves-in-the-ozarks',
  'ozarks-fishing-trips',
  'ozarks-camping',
  'ozarks-scenic-drives',
  'branson-outdoor-adventures',
  'bentonville-mountain-biking',
  'fayetteville-arkansas-outdoors',
  'ozarks-swimming-holes'
];

for (const slug of GUIDE_SLUGS) {
  router.get(`/${slug}`, (_req, res) => {
    const page = getHighIntentGuide(slug);
    if (!page) return res.status(404).send('Guide not found');
    return res.render('guides/high-intent', {
      meta: {
        title: page.title,
        description: page.description,
        canonical: `${BASE_URL}/guides/${slug}`,
      },
      baseUrl: BASE_URL,
      page,
      affiliateLinks: getAffiliateLinks(),
    });
  });
}

module.exports = router;
