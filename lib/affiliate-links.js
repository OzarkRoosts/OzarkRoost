// Central affiliate / monetization link config.
// Override any URL via env (AFF_STAY22_URL, AFF_HIPCAMP_URL, etc.)
// Defaults use trackable UTM params so we can swap in real partner IDs later.

const BASE = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
const UTM = 'utm_source=ozarkroost&utm_medium=affiliate&utm_campaign=guides';
const AMAZON_TAG = process.env.AFF_AMAZON_TAG || 'ozarkroost-20';

const DEFAULTS = {
  stay22: process.env.AFF_STAY22_URL ||
    `https://www.stay22.com/embed/gm?aid=ozarkroost&campaign=guides&address=Ozarks%20Arkansas&${UTM}`,
  hipcamp: process.env.AFF_HIPCAMP_URL ||
    `https://www.hipcamp.com/en-US/d/united-states/arkansas/camping/all?${UTM}`,
  rei: process.env.AFF_REI_URL ||
    `https://www.rei.com/search?q=camping+gear&${UTM}`,
  getyourguide: process.env.AFF_GETYOURGUIDE_URL ||
    `https://www.getyourguide.com/s/?q=Ozarks%20Arkansas&partner_id=ozarkroost&utm_medium=affiliate`,
  viator: process.env.AFF_VIATOR_URL ||
    `https://www.viator.com/searchResults/all?text=Ozarks%20Arkansas&pid=P00000000&mcid=42383&medium=link&${UTM}`,
  outdoorsy: process.env.AFF_OUTDOORSY_URL ||
    `https://www.outdoorsy.com/rv-search?address=Arkansas&${UTM}`,
  rvshare: process.env.AFF_RVSHARE_URL ||
    `https://rvshare.com/rv-rental/arkansas?${UTM}`,
  vrbo: process.env.AFF_VRBO_URL ||
    `https://www.vrbo.com/search?destination=Ozarks%20Arkansas&${UTM}`,
  booking: process.env.AFF_BOOKING_URL ||
    `https://www.booking.com/searchresults.html?ss=Ozarks+Arkansas&aid=304142&label=ozarkroost&${UTM}`,
  publiclands: process.env.AFF_PUBLICLANDS_URL ||
    `https://www.publiclands.com/search?q=camping&${UTM}`,
  expedia: process.env.AFF_EXPEDIA_URL ||
    `https://www.expedia.com/Hotel-Search?destination=Ozarks%2C%20Arkansas&${UTM}`,
  hotels: process.env.AFF_HOTELS_URL ||
    `https://www.hotels.com/Hotel-Search?destination=Ozarks%2C%20Arkansas&${UTM}`,
  kayak: process.env.AFF_KAYAK_URL ||
    `https://www.kayak.com/hotels/Ozarks,Arkansas-c30831/2026-09-01/2026-09-04?${UTM}`,
  tripadvisor: process.env.AFF_TRIPADVISOR_URL ||
    `https://www.tripadvisor.com/Search?q=Ozarks%20Arkansas%20cabins&${UTM}`,
  klook: process.env.AFF_KLOOK_URL ||
    `https://www.klook.com/en-US/search/?query=Arkansas&${UTM}`,
  alltrails: process.env.AFF_ALLTRAILS_URL ||
    `https://www.alltrails.com/us/arkansas?${UTM}`,
  amazon_camping: process.env.AFF_AMAZON_CAMPING_URL ||
    `https://www.amazon.com/s?k=camping+gear+essentials&tag=${encodeURIComponent(AMAZON_TAG)}&${UTM}`,
  amazon_kayak: process.env.AFF_AMAZON_KAYAK_URL ||
    `https://www.amazon.com/s?k=inflatable+kayak&tag=${encodeURIComponent(AMAZON_TAG)}&${UTM}`,
  amazon_binoculars: process.env.AFF_AMAZON_BINOCULARS_URL ||
    `https://www.amazon.com/s?k=travel+binoculars&tag=${encodeURIComponent(AMAZON_TAG)}&${UTM}`,
  airbnb: process.env.AFF_AIRBNB_URL ||
    `https://www.airbnb.com/s/Ozarks--Arkansas/homes?${UTM}`,
  recreation: process.env.AFF_RECREATION_URL ||
    `https://www.recreation.gov/search?q=Buffalo%20National%20River&${UTM}`,
  list_cabin: `${BASE}/list-your-cabin`,
  operators: `${BASE}/operators`,
};

const LABELS = {
  stay22: 'Find cabins on Stay22 map',
  hipcamp: 'Browse Hipcamp stays',
  rei: 'Gear up at REI',
  getyourguide: 'Book tours on GetYourGuide',
  viator: 'Book experiences on Viator',
  outdoorsy: 'Rent an RV on Outdoorsy',
  rvshare: 'Find RVs on RVshare',
  vrbo: 'Browse Vrbo cabins',
  booking: 'Search Booking.com',
  publiclands: 'Outfit at Public Lands',
  expedia: 'Compare hotels on Expedia',
  hotels: 'Search Hotels.com',
  kayak: 'Compare stays on Kayak',
  tripadvisor: 'Read reviews on Tripadvisor',
  klook: 'Browse activities on Klook',
  alltrails: 'Map trails on AllTrails',
  amazon_camping: 'Camping essentials on Amazon',
  amazon_kayak: 'Kayaks & paddles on Amazon',
  amazon_binoculars: 'Travel binoculars on Amazon',
  airbnb: 'Browse Airbnb Ozarks homes',
  recreation: 'Reserve on Recreation.gov',
  list_cabin: 'List your cabin on OzarkRoost',
  operators: 'Partner with OzarkRoost',
};

const BLURBS = {
  stay22: 'Interactive map of bookable cabins near your route — compare prices in one place.',
  hipcamp: 'Unique land stays, glamping sites, and private campgrounds across the Ozarks.',
  rei: 'Packs, layers, and river shoes locals actually use on Buffalo River trips.',
  getyourguide: 'Guided floats, cave tours, ziplines, and day trips you can book today.',
  viator: 'Rated Ozarks tours, cave tickets, and adventure day trips with free cancellation on many options.',
  outdoorsy: 'Delivery-ready RVs and camper vans for Table Rock, Beaver Lake, and beyond.',
  rvshare: 'Peer-to-peer RVs near Branson, Eureka Springs, and northwest Arkansas.',
  vrbo: 'Whole-home cabin rentals with kitchens, hot tubs, and pet-friendly filters.',
  booking: 'Flexible cancel rates on lodges and cabins across northwest Arkansas.',
  publiclands: 'Camping and trail gear from a retailer built for public-land weekends.',
  expedia: 'Bundle-friendly hotel and cabin inventory when you need more dates.',
  hotels: 'Member rates and flexible lodging near the lakes and show towns.',
  kayak: 'Side-by-side price comparison for Ozarks lodging windows.',
  tripadvisor: 'Traveler photos and recent reviews before you lock dates.',
  klook: 'Tickets and day activities when your cabin crew wants a planned outing.',
  alltrails: 'Trail maps for Lost Valley, Hawksbill Crag approaches, and lake loops.',
  amazon_camping: 'Last-minute camp kitchen, lights, and packing list staples.',
  amazon_kayak: 'Portable boats and PFDs if rentals are booked out.',
  amazon_binoculars: 'Compact glass for elk watching and bluff overlooks.',
  airbnb: 'Unique homes and cabins when you want host-run stays.',
  recreation: 'Official campsites and timed entries for Buffalo National River area.',
  list_cabin: 'Get discovered by travelers already planning Ozarks trips.',
  operators: 'Tour, shuttle, and outfitter partnerships that convert guide traffic.',
};

// Recommended sets per guide theme (used by pages + affiliate ops)
const BUNDLES = {
  stays: ['stay22', 'hipcamp', 'vrbo', 'booking', 'airbnb'],
  luxury: ['stay22', 'vrbo', 'booking', 'expedia'],
  camping: ['hipcamp', 'outdoorsy', 'rvshare', 'recreation', 'rei', 'publiclands', 'amazon_camping'],
  adventure: ['getyourguide', 'viator', 'alltrails', 'klook', 'amazon_kayak'],
  roadtrip: ['stay22', 'kayak', 'expedia', 'hotels', 'tripadvisor', 'alltrails'],
  gear: ['rei', 'publiclands', 'amazon_camping', 'amazon_binoculars'],
  monetize_all: [
    'stay22', 'hipcamp', 'vrbo', 'booking', 'airbnb', 'expedia', 'hotels', 'kayak',
    'getyourguide', 'viator', 'klook', 'outdoorsy', 'rvshare', 'recreation',
    'rei', 'publiclands', 'alltrails', 'tripadvisor', 'amazon_camping',
  ],
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

function getBundle(name) {
  const keys = BUNDLES[name] || BUNDLES.stays;
  return keys.map(getWidget).filter(Boolean);
}

function getAllWidgets() {
  return Object.keys(DEFAULTS).map(getWidget).filter(Boolean);
}

function getFeaturedListings() {
  return [
    {
      name: 'Mystic Caverns',
      location: 'Berryville, AR',
      type: 'Attraction',
      blurb: 'Living cave tours minutes from Eureka Springs — cool underground break on hot days.',
      href: '/out?to=' + encodeURIComponent(DEFAULTS.viator),
    },
    {
      name: 'Hawkins Ridge Cabins',
      location: 'Eureka Springs, AR',
      type: 'Cabin',
      blurb: 'Ridge-top porches, hot tubs, and walkable access to Victorian downtown charm.',
      href: '/out?to=' + encodeURIComponent(DEFAULTS.stay22),
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
      href: '/out?to=' + encodeURIComponent(DEFAULTS.getyourguide),
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
      href: '/out?to=' + encodeURIComponent(DEFAULTS.klook),
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
    { slug: 'ozarks-adventures', title: 'Ozarks Adventures' },
    { slug: 'ozarks-camping-rv', title: 'Camping & RV' },
  ];
  return all.filter((g) => g.slug !== currentSlug).slice(0, 6);
}

module.exports = {
  BASE,
  DEFAULTS,
  LABELS,
  BLURBS,
  BUNDLES,
  getAffiliateLinks,
  getWidget,
  getBundle,
  getAllWidgets,
  getFeaturedListings,
  getRelatedGuides,
};
