// Guide routes — SEO destination guide pages.
// Each guide renders through views/guides/guide-layout.ejs with page-specific data.
// Does NOT own listings, adventures, or any DB queries.

const express = require('express');
const router = express.Router();
const { createLeadMagnetSubmission } = require('../db/lead-magnet-submissions');
const { enqueueNurtureSequence } = require('../db/nurture-email-queue');

const BASE_URL = 'https://ozarkroost.polsia.app';

/* ---------- hero images (R2-hosted) ---------- */
const HERO_IMAGES = {
  buffaloRiverCabins: 'https://pub-629428d185ca4960a0a73c850d32294b.r2.dev/generated-images/company_197924/1da12ea6-9762-4418-aec4-f0db946b2776.jpg',
  ozarksAdventures: 'https://pub-629428d185ca4960a0a73c850d32294b.r2.dev/generated-images/company_197924/2519cf24-2238-4de2-b2cd-9f03c7708da7.jpg',
  campingRv: 'https://pub-629428d185ca4960a0a73c850d32294b.r2.dev/generated-images/company_197924/a7e643a3-79e4-4a6c-819b-eef5f1824545.jpg',
  hiddenGemCabins: 'https://pub-629428d185ca4960a0a73c850d32294b.r2.dev/generated-images/company_197924/45feb759-0cd4-4ec0-91d2-1b88d27586d9.jpg',
  buffaloRiverKayaking: 'https://pub-629428d185ca4960a0a73c850d32294b.r2.dev/generated-images/company_197924/3e9d12aa-48b6-4507-a983-bd992c68e524.jpg',
};

/* ---------- helper: render a guide ---------- */
function renderGuide(res, templateName, meta) {
  res.render(`guides/${templateName}`, {
    meta,
    baseUrl: BASE_URL,
    heroImages: HERO_IMAGES,
  });
}

/* ---------- GET /guides/about-the-ozarks ---------- */
router.get('/about-the-ozarks', (_req, res) => {
  renderGuide(res, 'about-the-ozarks', {
    title: 'About the Ozarks — Why This Region Steals Hearts | OzarkRoost',
    description: 'Discover what makes the Arkansas Ozarks one of America\u2019s most beloved getaway destinations \u2014 from the Buffalo River to Eureka Springs, Blanchard Springs, and everything in between.',
    canonical: `${BASE_URL}/guides/about-the-ozarks`,
    ogImage: HERO_IMAGES.buffaloRiverCabins,
  });
});

/* ---------- GET /guides/buffalo-river-cabins ---------- */
router.get('/buffalo-river-cabins', (_req, res) => {
  renderGuide(res, 'buffalo-river-cabins', {
    title: 'Best Cabin Rentals Near Buffalo River, Arkansas | OzarkRoost',
    description: 'Find the best cabin rentals near Buffalo River Arkansas. Curated picks for every budget — riverfront, pet-friendly, hot tub cabins. Book direct or via top booking sites.',
    canonical: `${BASE_URL}/guides/buffalo-river-cabins`,
    ogImage: HERO_IMAGES.buffaloRiverCabins,
  });
});

/* ---------- GET /guides/ozarks-adventures ---------- */
router.get('/ozarks-adventures', (_req, res) => {
  renderGuide(res, 'ozarks-adventures', {
    title: 'Top 10 Outdoor Adventures in the Ozarks | OzarkRoost',
    description: 'From Hemmed-In Hollow Falls to Buffalo River kayaking — the top 10 outdoor adventures in the Ozarks for every skill level. Plan your trip with this guide.',
    canonical: `${BASE_URL}/guides/ozarks-adventures`,
    ogImage: HERO_IMAGES.ozarksAdventures,
  });
});

/* ---------- GET /guides/ozarks-camping-rv ---------- */
router.get('/ozarks-camping-rv', (_req, res) => {
  renderGuide(res, 'ozarks-camping-rv', {
    title: 'Complete Guide to Camping and RV Camping in Arkansas | OzarkRoost',
    description: 'Everything you need to know about camping and RV camping in Arkansas. Top campgrounds, dispersed camping rules, Buffalo River camping, and what to pack.',
    canonical: `${BASE_URL}/guides/ozarks-camping-rv`,
    ogImage: HERO_IMAGES.campingRv,
  });
});

/* ---------- GET /guides/hidden-gem-cabins ---------- */
router.get('/hidden-gem-cabins', (_req, res) => {
  renderGuide(res, 'hidden-gem-cabins', {
    title: 'Hidden Gem Cabins in the Ozarks Most Tourists Miss | OzarkRoost',
    description: 'Skip the tourist traps — discover the hidden gem cabins in the Ozarks most tourists miss. Secluded, affordable, and worth the drive.',
    canonical: `${BASE_URL}/guides/hidden-gem-cabins`,
    ogImage: HERO_IMAGES.hiddenGemCabins,
  });
});

/* ---------- GET /guides/buffalo-river-kayaking ---------- */
router.get('/buffalo-river-kayaking', (_req, res) => {
  renderGuide(res, 'buffalo-river-kayaking', {
    title: 'Buffalo River Kayaking: What You Need to Know Before You Go | OzarkRoost',
    description: 'Full guide to Buffalo River kayaking — put-in points, shuttle services, rental options, water levels, and the best stretches for beginners and experienced paddlers.',
    canonical: `${BASE_URL}/guides/buffalo-river-kayaking`,
    ogImage: HERO_IMAGES.buffaloRiverKayaking,
  });
});

/* ---------- GET /guides/trip-planner ---------- */
router.get('/trip-planner', (_req, res) => {
  res.render('guides/trip-planner', { emailSubmitted: false });
});

/* ---------- POST /guides/trip-planner ---------- */
router.post('/trip-planner', async (req, res) => {
  const { email } = req.body || {};

  if (!email || !email.trim()) {
    return res.render('guides/trip-planner', {
      error: 'Please enter your email address.',
      values: { email: email || '' },
      emailSubmitted: false,
    });
  }

  const normalizedEmail = email.trim().toLowerCase();
  // Basic format check: has @ and a domain with at least one dot after @
  const emailRegex = /^[^\t\n\r@]+@[^\t\n\r@]+\/[^\t\n\r@]+$/;
  if (emailRegex.test(normalizedEmail)) {
    return res.render('guides/trip-planner', {
      error: 'Please enter a valid email address.',
      values: { email },
      emailSubmitted: false,
    });
  }

  try {
    await createLeadMagnetSubmission({ email: normalizedEmail });
  } catch (err) {
    console.error('Lead magnet submission error:', err);
    return res.render('guides/trip-planner', {
      error: 'Something went wrong. Please try again.',
      values: { email },
      emailSubmitted: false,
    });
  }

  try {
    await enqueueNurtureSequence(normalizedEmail);
  } catch (qErr) {
    console.error('Nurture queue error (non-fatal):', qErr);
  }

  res.render('guides/trip-planner', { emailSubmitted: true });
});

module.exports = router;
