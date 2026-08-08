// Central affiliate / monetization link config.
// Override any URL via env (AFF_STAY22_URL, AFF_HIPCAMP_URL, etc.)

const BASE = process.env.APP_URL || 'https://ozarkroost.polsia.app';

const DEFAULTS = {
  stay22: process.env.AFF_STAY22_URL ||
    'https://www.stay22.com/embed/gm?aid=ozarkroost&campaign=guides&address=Ozarks%20Arkansas',
  hipcamp: process.env.AFF_HIPCAMP_URL ||
    'https://www.hipcamp.com/en-US/d/united-states/arkansas/camping/all?utm_source=ozarkroost&utm_medium=affiliate&utm_campaign=guides',
  rei: process.env.AFF_REI_URL ||
    'https://www.rei.com/search?q=camping+gear&utm_source=ozarkroost&utm_medium=affiliate&utm_campaign=guides',
  getyourguide: process.env.AFF_GETYOURGUIDE_URL ||
    'https://www.getyourguide.com/s/?q=Ozarks%20Arkansas&partner_id=ozarkroost&utm_medium=affiliate',
  outdoorsy: process.env.AFF_OUTDOORSY_URL ||
    'https://www.outdoorsy.com/rv-search?address=Arkansas&utm_source=ozarkroost&utm_medium=affiliate&utm_campaign=guides',
  vrbo: process.env.AFF_VRBO_URL ||
    'https://www.vrbo.com/search?destination=Ozarks%20Arkansas&utm_source=ozarkroost&utm_medium=affiliate&utm_campaign=guides',
  booking: process.env.AFF_BOOKING_URL ||
    'https://www.booking.com/searchresults.html?ss=Ozarks+Arkansas&utm_source=ozarkroost&utm_medium=affiliate&utm_campaign=guides',
};

const LABELS = {
  stay22: 'Find cabins on Stay22 map',
  hipcamp: 'Browse Hipcamp stays',
  rei: 'Gear up at REI',
  getyourguide: 'Book tours on GetYourGuide',
  outdoorsy: 'Rent an RV on Outdoorsy',
  vrbo: 'Browse Vrbo cabins',
  booking: 'Search Booking.com',
};

const BLURBS = {
  stay22: 'Interactive map of bookable cabins near your route — compare prices in one place.',
  hipcamp: 'Unique land stays, glamping sites, and private campgrounds across the Ozarks.',
  rei: 'Packs, layers, and river shoes locals actually use on Buffalo River trips.',
  getyourguide: 'Guided floats, cave tours, ziplines, and day trips you can book today.',
  outdoorsy: 'Delivery-ready RVs and camper vans for Table Rock, Beaver Lake, and beyond.',
  vrbo: 'Whole-home cabin rentals with kitchens, hot tubs, and pet-friendly filters.',
  booking: 'Flexible cancel rates on lodges and cabins across northwest Arkansas.',
};

function getAffiliateLinks() {
  return { ...DEFAULTS };
}

function getWidget(key) {
  const k = String(key || '').toLowerCase();
  if (!DEFAULTS[k]) return null;
  return {
    key: k,
    url: DEFAULTS[k],
    label: LABELS[k],
    blurb: BLURBS[k],
  };
}

function getFeaturedListings() {
  return [
    {
      name: 'Mystic Caverns',
      location: 'Berryville, AR',
      type: 'Attraction',
      blurb: 'Living cave tours minutes from Eureka Springs — cool underground break on hot days.',
      href: '/listings',
    },
    {
      name: 'Hawkins Ridge Cabins',
      location: 'Eureka Springs, AR',
      type: 'Cabin',
      blurb: 'Ridge-top porches, hot tubs, and walkable access to Victorian downtown charm.',
      href: '/listings',
    },
    {
      name: 'Riverfront BBQ Co.',
      location: 'Branson, MO',
      type: 'Food',
      blurb: 'Smoke-forward plates after a Table Rock day — locals send out-of-towners here first.',
      href: '/adventures',
    },
    {
      name: 'Ozark Trail Adventures',
      location: 'Fayetteville, AR',
      type: 'Outfitter',
      blurb: 'Shuttles, rentals, and guided days for Buffalo River and Boston Mountain trails.',
      href: '/adventures',
    },
    {
      name: 'Main Street Mercantile',
      location: 'Mountain View, AR',
      type: 'Local',
      blurb: 'Folk music capital supplies — snacks, maps, and porch-picking energy downtown.',
      href: '/guides/about-the-ozarks',
    },
    {
      name: 'The Bluegrass Barn',
      location: 'Bentonville, AR',
      type: 'Experience',
      blurb: 'Live strings and Ozarks hospitality between Crystal Bridges and the greenway.',
      href: '/adventures',
    },
  ];
}

function getRelatedGuides(currentSlug) {
  const all = [
    { slug: 'hot-tub-cabins', title: 'Hot Tub Cabins' },
    { slug: 'pet-friendly-cabins', title: 'Pet-Friendly Cabins' },
    { slug: 'treehouse-rentals', title: 'Treehouse Rentals' },
    { slug: 'glamping-ozarks', title: 'Glamping in the Ozarks' },
    { slug: 'luxury-cabins', title: 'Luxury Cabins' },
    { slug: 'ozarks-road-trip', title: 'Ozarks Road Trip' },
    { slug: 'buffalo-river-cabins', title: 'Buffalo River Cabins' },
    { slug: 'hidden-gem-cabins', title: 'Hidden Gem Cabins' },
    { slug: 'buffalo-river-kayaking', title: 'Buffalo River Kayaking' },
    { slug: 'about-the-ozarks', title: 'About the Ozarks' },
  ];
  return all.filter((g) => g.slug !== currentSlug).slice(0, 6);
}

module.exports = {
  BASE,
  getAffiliateLinks,
  getWidget,
  getFeaturedListings,
  getRelatedGuides,
};
