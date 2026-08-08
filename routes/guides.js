// Guide routes — SEO destination guide pages.
// Each guide renders through views/guides/*.ejs with page-specific data.

const express = require('express');
const router = express.Router();
const { createLeadMagnetSubmission } = require('../db/lead-magnet-submissions');
const { enqueueNurtureSequence } = require('../db/nurture-email-queue');
const { isValidEmail, sanitizeText } = require('../lib/security');
const {
  getAffiliateLinks,
  getFeaturedListings,
  getRelatedGuides,
} = require('../lib/affiliate-links');
const { createRateLimiter } = require('../middleware/rate-limit');

const BASE_URL = process.env.APP_URL || 'https://ozarkroost.polsia.app';
const formLimiter = createRateLimiter({ windowMs: 60_000, max: 15 });

/* ---------- hero images (R2-hosted) ---------- */
const HERO_IMAGES = {
  buffaloRiverCabins: 'https://pub-629428d185ca4960a0a73c850d32294b.r2.dev/generated-images/company_197924/1da12ea6-9762-4418-aec4-f0db946b2776.jpg',
  ozarksAdventures: 'https://pub-629428d185ca4960a0a73c850d32294b.r2.dev/generated-images/company_197924/2519cf24-2238-4de2-b2cd-9f03c7708da7.jpg',
  campingRv: 'https://pub-629428d185ca4960a0a73c850d32294b.r2.dev/generated-images/company_197924/a7e643a3-79e4-4a6c-819b-eef5f1824545.jpg',
  hiddenGemCabins: 'https://pub-629428d185ca4960a0a73c850d32294b.r2.dev/generated-images/company_197924/45feb759-0cd4-4ec0-91d2-1b88d27586d9.jpg',
  buffaloRiverKayaking: 'https://pub-629428d185ca4960a0a73c850d32294b.r2.dev/generated-images/company_197924/3e9d12aa-48b6-4507-a983-bd992c68e524.jpg',
  hotTub: 'https://pub-629428d185ca4960a0a73c850d32294b.r2.dev/generated-images/company_197924/1da12ea6-9762-4418-aec4-f0db946b2776.jpg',
  petFriendly: 'https://pub-629428d185ca4960a0a73c850d32294b.r2.dev/generated-images/company_197924/45feb759-0cd4-4ec0-91d2-1b88d27586d9.jpg',
  treehouse: 'https://pub-629428d185ca4960a0a73c850d32294b.r2.dev/generated-images/company_197924/2519cf24-2238-4de2-b2cd-9f03c7708da7.jpg',
  glamping: 'https://pub-629428d185ca4960a0a73c850d32294b.r2.dev/generated-images/company_197924/a7e643a3-79e4-4a6c-819b-eef5f1824545.jpg',
  luxury: 'https://pub-629428d185ca4960a0a73c850d32294b.r2.dev/generated-images/company_197924/1da12ea6-9762-4418-aec4-f0db946b2776.jpg',
  roadTrip: 'https://pub-629428d185ca4960a0a73c850d32294b.r2.dev/generated-images/company_197924/3e9d12aa-48b6-4507-a983-bd992c68e524.jpg',
};

/* ---------- helper: render a guide ---------- */
function renderGuide(res, templateName, meta, extra = {}) {
  const slug = templateName;
  res.render(`guides/${templateName}`, {
    meta,
    baseUrl: BASE_URL,
    heroImages: HERO_IMAGES,
    affiliateLinks: getAffiliateLinks(),
    featuredListings: getFeaturedListings(),
    relatedGuides: getRelatedGuides(slug),
    currentSlug: slug,
    emailSubmitted: false,
    ...extra,
  });
}

function defineGuide(pathSlug, templateName, metaBuilder) {
  router.get(`/${pathSlug}`, (req, res) => {
    renderGuide(res, templateName, metaBuilder(), { query: req.query || {} });
  });
}


/* ---------- existing guides ---------- */
defineGuide('about-the-ozarks', 'about-the-ozarks', () => ({
  title: 'About the Ozarks — Why This Region Steals Hearts | OzarkRoost',
  description: 'Discover what makes the Arkansas Ozarks one of America\u2019s most beloved getaway destinations \u2014 from the Buffalo River to Eureka Springs, Blanchard Springs, and everything in between.',
  canonical: `${BASE_URL}/guides/about-the-ozarks`,
  ogImage: HERO_IMAGES.buffaloRiverCabins,
}));

defineGuide('buffalo-river-cabins', 'buffalo-river-cabins', () => ({
  title: 'Best Cabin Rentals Near Buffalo River, Arkansas | OzarkRoost',
  description: 'Find the best cabin rentals near Buffalo River Arkansas. Curated picks for every budget — riverfront, pet-friendly, hot tub cabins. Book direct or via top booking sites.',
  canonical: `${BASE_URL}/guides/buffalo-river-cabins`,
  ogImage: HERO_IMAGES.buffaloRiverCabins,
}));

defineGuide('ozarks-adventures', 'ozarks-adventures', () => ({
  title: 'Top 10 Outdoor Adventures in the Ozarks | OzarkRoost',
  description: 'From Hemmed-In Hollow Falls to Buffalo River kayaking — the top 10 outdoor adventures in the Ozarks for every skill level. Plan your trip with this guide.',
  canonical: `${BASE_URL}/guides/ozarks-adventures`,
  ogImage: HERO_IMAGES.ozarksAdventures,
}));

defineGuide('ozarks-camping-rv', 'ozarks-camping-rv', () => ({
  title: 'Complete Guide to Camping and RV Camping in Arkansas | OzarkRoost',
  description: 'Everything you need to know about camping and RV camping in Arkansas. Top campgrounds, dispersed camping rules, Buffalo River camping, and what to pack.',
  canonical: `${BASE_URL}/guides/ozarks-camping-rv`,
  ogImage: HERO_IMAGES.campingRv,
}));

defineGuide('hidden-gem-cabins', 'hidden-gem-cabins', () => ({
  title: 'Hidden Gem Cabins in the Ozarks Most Tourists Miss | OzarkRoost',
  description: 'Skip the tourist traps — discover the hidden gem cabins in the Ozarks most tourists miss. Secluded, affordable, and worth the drive.',
  canonical: `${BASE_URL}/guides/hidden-gem-cabins`,
  ogImage: HERO_IMAGES.hiddenGemCabins,
}));

defineGuide('buffalo-river-kayaking', 'buffalo-river-kayaking', () => ({
  title: 'Buffalo River Kayaking: What You Need to Know Before You Go | OzarkRoost',
  description: 'Full guide to Buffalo River kayaking — put-in points, shuttle services, rental options, water levels, and the best stretches for beginners and experienced paddlers.',
  canonical: `${BASE_URL}/guides/buffalo-river-kayaking`,
  ogImage: HERO_IMAGES.buffaloRiverKayaking,
}));

/* ---------- NEW SEO traffic guides ---------- */
defineGuide('hot-tub-cabins', 'hot-tub-cabins', () => ({
  title: 'Hot Tub Cabins in Arkansas Ozarks | Best Cabins with Hot Tubs | OzarkRoost',
  description: 'Hot tub cabins Arkansas travelers book first — Eureka Springs ridge soaks, Ponca bluff decks, and Beaver Lake night views. Compare stays and book smarter.',
  canonical: `${BASE_URL}/guides/hot-tub-cabins`,
  ogImage: HERO_IMAGES.hotTub,
}));

defineGuide('pet-friendly-cabins', 'pet-friendly-cabins', () => ({
  title: 'Pet-Friendly Cabins in the Ozarks | Dog-Friendly Arkansas Lodging | OzarkRoost',
  description: 'Dog friendly cabins Ozarks hosts actually welcome — fenced yards, trail access near Lost Valley, and Buffalo River gravel bars your pup will love.',
  canonical: `${BASE_URL}/guides/pet-friendly-cabins`,
  ogImage: HERO_IMAGES.petFriendly,
}));

defineGuide('treehouse-rentals', 'treehouse-rentals', () => ({
  title: 'Arkansas Treehouse Rentals | Unique Treehouse Stays in the Ozarks | OzarkRoost',
  description: 'Arkansas treehouse rentals with canopy views near Eureka Springs, Mountain View, and Branson. Find elevated stays worth the climb.',
  canonical: `${BASE_URL}/guides/treehouse-rentals`,
  ogImage: HERO_IMAGES.treehouse,
}));

defineGuide('glamping-ozarks', 'glamping-ozarks', () => ({
  title: 'Glamping in the Ozarks | Luxury Camping Arkansas Domes & Tents | OzarkRoost',
  description: 'Glamping Arkansas done right — stargazing domes, safari canvas tents, and yurts across the Ozarks with real beds and real views.',
  canonical: `${BASE_URL}/guides/glamping-ozarks`,
  ogImage: HERO_IMAGES.glamping,
}));

defineGuide('luxury-cabins', 'luxury-cabins', () => ({
  title: 'Luxury Cabins in the Ozarks | Upscale Arkansas Cabin Rentals | OzarkRoost',
  description: 'Luxury cabins Ozarks weekenders rave about — chef kitchens, panoramic glass, private hot tubs, and ridge estates near Eureka Springs and Table Rock.',
  canonical: `${BASE_URL}/guides/luxury-cabins`,
  ogImage: HERO_IMAGES.luxury,
}));

defineGuide('ozarks-road-trip', 'ozarks-road-trip', () => ({
  title: 'Ozarks Road Trip Guide | Scenic Drives & Stops in Arkansas | OzarkRoost',
  description: 'Plan an Ozarks road trip along Highway 7, the Pig Trail, Buffalo River put-ins, and Eureka Springs — with cabin bases and gear stops mapped.',
  canonical: `${BASE_URL}/guides/ozarks-road-trip`,
  ogImage: HERO_IMAGES.roadTrip,
}));

/* ---------- trip planner (legacy lead magnet page) ---------- */
router.get('/trip-planner', (_req, res) => {
  res.render('guides/trip-planner', { emailSubmitted: false });
});

router.post('/trip-planner', formLimiter, async (req, res) => {
  const email = sanitizeText(req.body?.email, 254);

  if (!email) {
    return res.render('guides/trip-planner', {
      error: 'Please enter your email address.',
      values: { email: '' },
      emailSubmitted: false,
    });
  }

  if (!isValidEmail(email)) {
    return res.render('guides/trip-planner', {
      error: 'Please enter a valid email address.',
      values: { email },
      emailSubmitted: false,
    });
  }

  const normalizedEmail = email.trim().toLowerCase();

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

/* ---------- shared email capture from guide partials ---------- */
router.post('/email-capture', formLimiter, async (req, res) => {
  const email = sanitizeText(req.body?.email, 254);
  const source = sanitizeText(req.body?.source, 80) || 'guide';
  const back = `/guides/${source}`.replace(/[^a-z0-9\-\/]/gi, '') || '/guides/trip-planner';

  if (!isValidEmail(email)) {
    return res.redirect(`${back}#email-capture`);
  }

  const normalizedEmail = email.trim().toLowerCase();
  try {
    await createLeadMagnetSubmission({ email: normalizedEmail, source });
  } catch (err) {
    // source column may not exist — retry email-only
    try {
      await createLeadMagnetSubmission({ email: normalizedEmail });
    } catch (err2) {
      console.error('Email capture error:', err2?.message || err?.message);
      return res.redirect(`${back}#email-capture`);
    }
  }

  try {
    await enqueueNurtureSequence(normalizedEmail);
  } catch (qErr) {
    console.error('Nurture queue error (non-fatal):', qErr);
  }

  return res.redirect(`${back}?subscribed=1#email-capture`);
});

module.exports = router;
