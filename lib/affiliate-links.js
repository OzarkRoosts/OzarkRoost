// Central affiliate / monetization link config.
// IMPORTANT: partner URLs are only treated as commissionable when supplied via
// Render environment variables. Never invent or ship fake partner IDs.

const BASE = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
const UTM = 'utm_source=ozarkroost&utm_medium=affiliate&utm_campaign=guides';
const AMAZON_TAG = process.env.AFF_AMAZON_TAG || '';

const official = {
  stay22: `https://www.stay22.com/embed/gm?address=Ozarks%20Arkansas`,
  hipcamp: `https://www.hipcamp.com/en-US/d/united-states/arkansas/camping/all`,
  rei: `https://www.rei.com/search?q=camping+gear`,
  getyourguide: `https://www.getyourguide.com/s/?q=Ozarks%20Arkansas`,
  outdoorsy: `https://www.outdoorsy.com/rv-search?address=Arkansas`,
  rvshare: `https://rvshare.com/rv-rental/arkansas`,
  vrbo: `https://www.vrbo.com/search?destination=Ozarks%20Arkansas`,
  booking: `https://www.booking.com/searchresults.html?ss=Ozarks+Arkansas`,
  publiclands: `https://www.publiclands.com/search?q=camping`,
  expedia: `https://www.expedia.com/Hotel-Search?destination=Ozarks%2C%20Arkansas`,
  hotels: `https://www.hotels.com/Hotel-Search?destination=Ozarks%2C%20Arkansas`,
  kayak: `https://www.kayak.com/hotels/Ozarks,Arkansas-c30831`,
  tripadvisor: `https://www.tripadvisor.com/Search?q=Ozarks%20Arkansas%20cabins`,
  klook: `https://www.klook.com/en-US/search/?query=Arkansas`,
  alltrails: `https://www.alltrails.com/us/arkansas`,
  airbnb: `https://www.airbnb.com/s/Ozarks--Arkansas/homes`,
  recreation: `https://www.recreation.gov/search?q=Buffalo%20National%20River`,
};

const env = (name, fallback) => process.env[name] || `${fallback}${fallback.includes('?') ? '&' : '?'}${UTM}`;

const DEFAULTS = {
  stay22: env('AFF_STAY22_URL', official.stay22),
  hipcamp: env('AFF_HIPCAMP_URL', official.hipcamp),
  rei: env('AFF_REI_URL', official.rei),
  getyourguide: env('AFF_GETYOURGUIDE_URL', official.getyourguide),
  outdoorsy: env('AFF_OUTDOORSY_URL', official.outdoorsy),
  rvshare: env('AFF_RVSHARE_URL', official.rvshare),
  vrbo: env('AFF_VRBO_URL', official.vrbo),
  booking: env('AFF_BOOKING_URL', official.booking),
  publiclands: env('AFF_PUBLICLANDS_URL', official.publiclands),
  expedia: env('AFF_EXPEDIA_URL', official.expedia),
  hotels: env('AFF_HOTELS_URL', official.hotels),
  kayak: env('AFF_KAYAK_URL', official.kayak),
  tripadvisor: env('AFF_TRIPADVISOR_URL', official.tripadvisor),
  klook: env('AFF_KLOOK_URL', official.klook),
  alltrails: env('AFF_ALLTRAILS_URL', official.alltrails),
  amazon_camping: process.env.AFF_AMAZON_CAMPING_URL || (AMAZON_TAG ? `https://www.amazon.com/s?k=camping+gear+essentials&tag=${encodeURIComponent(AMAZON_TAG)}&${UTM}` : 'https://www.amazon.com/s?k=camping+gear+essentials'),
  amazon_kayak: process.env.AFF_AMAZON_KAYAK_URL || (AMAZON_TAG ? `https://www.amazon.com/s?k=inflatable+kayak&tag=${encodeURIComponent(AMAZON_TAG)}&${UTM}` : 'https://www.amazon.com/s?k=inflatable+kayak'),
  amazon_binoculars: process.env.AFF_AMAZON_BINOCULARS_URL || (AMAZON_TAG ? `https://www.amazon.com/s?k=travel+binoculars&tag=${encodeURIComponent(AMAZON_TAG)}&${UTM}` : 'https://www.amazon.com/s?k=travel+binoculars'),
  airbnb: env('AFF_AIRBNB_URL', official.airbnb),
  recreation: env('AFF_RECREATION_URL', official.recreation),
  list_cabin: `${BASE}/list-your-cabin`,
  operators: `${BASE}/operators`,
};

const LABELS = {
  stay22: 'Find cabins on Stay22 map', hipcamp: 'Browse Hipcamp stays', rei: 'Gear up at REI',
  getyourguide: 'Book tours on GetYourGuide', outdoorsy: 'Rent an RV on Outdoorsy',
  rvshare: 'Find RVs on RVshare', vrbo: 'Browse Vrbo cabins', booking: 'Search Booking.com', publiclands: 'Outfit at Public Lands',
  expedia: 'Compare hotels on Expedia', hotels: 'Search Hotels.com', kayak: 'Compare stays on Kayak', tripadvisor: 'Read reviews on Tripadvisor',
  klook: 'Browse activities on Klook', alltrails: 'Map trails on AllTrails', amazon_camping: 'Camping essentials on Amazon',
  amazon_kayak: 'Kayaks & paddles on Amazon', amazon_binoculars: 'Travel binoculars on Amazon', airbnb: 'Browse Airbnb Ozarks homes',
  recreation: 'Reserve on Recreation.gov', list_cabin: 'List your cabin on OzarkRoost', operators: 'Partner with OzarkRoost',
};

const BLURBS = {
  stay22: 'Interactive map of bookable cabins near your route — compare prices in one place.', hipcamp: 'Unique land stays, glamping sites, and private campgrounds across the Ozarks.',
  rei: 'Packs, layers, and river shoes locals actually use on Buffalo River trips.', getyourguide: 'Guided floats, cave tours, ziplines, and day trips you can book today.',
  outdoorsy: 'Delivery-ready RVs and camper vans for Arkansas trips.', rvshare: 'Peer-to-peer RVs near the Ozarks.',
  vrbo: 'Whole-home cabin rentals with kitchens, hot tubs, and pet-friendly filters.', booking: 'Flexible lodging inventory across northwest Arkansas.',
  publiclands: 'Camping and trail gear from a retailer built for public-land weekends.', expedia: 'Hotel and cabin inventory when you need more dates.',
  hotels: 'Lodging near the lakes and show towns.', kayak: 'Side-by-side price comparison for Ozarks lodging.', tripadvisor: 'Traveler photos and recent reviews before you lock dates.',
  klook: 'Tickets and day activities for your Ozarks trip.', alltrails: 'Trail maps for Ozarks hikes and lake loops.', amazon_camping: 'Camp kitchen, lights, and packing-list staples.',
  amazon_kayak: 'Portable boats and PFDs if rentals are booked out.', amazon_binoculars: 'Compact glass for elk watching and bluff overlooks.', airbnb: 'Unique homes and cabins when you want host-run stays.',
  recreation: 'Official campsites and timed entries for Buffalo National River area.', list_cabin: 'Get discovered by travelers already planning Ozarks trips.', operators: 'Tour, shuttle, and outfitter partnerships that convert guide traffic.',
};

const BUNDLES = {
  stays: ['stay22', 'hipcamp', 'vrbo', 'booking', 'airbnb'],
  luxury: ['stay22', 'vrbo', 'booking', 'expedia'],
  camping: ['hipcamp', 'outdoorsy', 'rvshare', 'recreation', 'rei', 'publiclands', 'amazon_camping'],
  adventure: ['getyourguide', 'alltrails', 'klook', 'amazon_kayak'],
  roadtrip: ['stay22', 'kayak', 'expedia', 'hotels', 'tripadvisor', 'alltrails'],
  gear: ['rei', 'publiclands', 'amazon_camping', 'amazon_binoculars'],
  monetize_all: ['stay22','hipcamp','vrbo','booking','airbnb','expedia','hotels','kayak','getyourguide','klook','outdoorsy','rvshare','recreation','rei','publiclands','alltrails','tripadvisor','amazon_camping'],
};

function getAffiliateLinks() { return { ...DEFAULTS }; }
function getWidget(key) { const k = String(key || '').toLowerCase(); if (!DEFAULTS[k]) return null; return { key: k, url: DEFAULTS[k], label: LABELS[k], blurb: BLURBS[k] }; }
function getBundle(name) { const keys = BUNDLES[name] || BUNDLES.stays; return keys.map(getWidget).filter(Boolean); }
function getAllWidgets() { return Object.keys(DEFAULTS).map(getWidget).filter(Boolean); }
function getFeaturedListings() { return [
  { name: 'Mystic Caverns', location: 'Berryville, AR', type: 'Attraction', blurb: 'Living cave tours minutes from Eureka Springs.', href: '/adventures' },
  { name: 'Hawkins Ridge Cabins', location: 'Eureka Springs, AR', type: 'Cabin', blurb: 'Ridge-top porches, hot tubs, and downtown access.', href: '/out?to=' + encodeURIComponent(DEFAULTS.stay22) },
  { name: 'Riverfront BBQ Co.', location: 'Branson, MO', type: 'Food', blurb: 'Smoke-forward plates after a Table Rock day.', href: '/adventures' },
  { name: 'Ozark Trail Adventures', location: 'Fayetteville, AR', type: 'Outfitter', blurb: 'Shuttles, rentals, and guided days for Buffalo River trips.', href: '/out?to=' + encodeURIComponent(DEFAULTS.getyourguide) },
  { name: 'Main Street Mercantile', location: 'Mountain View, AR', type: 'Local', blurb: 'Folk music capital supplies downtown.', href: '/guides/about-the-ozarks' },
  { name: 'The Bluegrass Barn', location: 'Bentonville, AR', type: 'Experience', blurb: 'Live strings and Ozarks hospitality.', href: '/out?to=' + encodeURIComponent(DEFAULTS.klook) },
]; }
function getRelatedGuides(currentSlug) { return [
  ['hot-tub-cabins','Hot Tub Cabins'],['pet-friendly-cabins','Pet-Friendly Cabins'],['treehouse-rentals','Treehouse Rentals'],['glamping-ozarks','Glamping in the Ozarks'],['luxury-cabins','Luxury Cabins'],['ozarks-road-trip','Ozarks Road Trip'],['buffalo-river-cabins','Buffalo River Cabins'],['hidden-gem-cabins','Hidden Gem Cabins'],['buffalo-river-kayaking','Buffalo River Kayaking'],['about-the-ozarks','About the Ozarks'],['ozarks-adventures','Ozarks Adventures'],['ozarks-camping-rv','Camping & RV']
].filter(g => g[0] !== currentSlug).slice(0,6).map(([slug,title]) => ({slug,title})); }
module.exports = { BASE, DEFAULTS, LABELS, BLURBS, BUNDLES, getAffiliateLinks, getWidget, getBundle, getAllWidgets, getFeaturedListings, getRelatedGuides };
