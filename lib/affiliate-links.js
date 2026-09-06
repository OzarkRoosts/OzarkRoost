// Central affiliate / monetization link config.
// Commissionable URLs must come from environment variables or the approved-link registry.
// Public fallback URLs are intentionally non-commissionable until a partner URL is configured.
const BASE = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
const UTM = 'utm_source=ozarkroost&utm_medium=affiliate&utm_campaign=travel';
const AMAZON_TAG = process.env.AFF_AMAZON_TAG || '';
const registry = require('./affiliate-link-registry-db');

const official = {
  stay22: 'https://www.stay22.com/embed/gm?address=Ozarks%20Arkansas', travelpayouts: 'https://www.travelpayouts.com/', hipcamp: 'https://www.hipcamp.com/en-US/d/united-states/arkansas/camping/all',
  rei: 'https://www.rei.com/search?q=camping+gear', getyourguide: 'https://www.getyourguide.com/s/?q=Ozarks%20Arkansas', viator: 'https://www.viator.com/searchResults/all?text=Ozarks%20Arkansas',
  outdoorsy: 'https://www.outdoorsy.com/rv-search?address=Arkansas', rvshare: 'https://rvshare.com/rv-rental/arkansas', vrbo: 'https://www.vrbo.com/search?destination=Ozarks%20Arkansas',
  booking: 'https://www.booking.com/searchresults.html?ss=Ozarks+Arkansas', publiclands: 'https://www.publiclands.com/search?q=camping', expedia: 'https://www.expedia.com/Hotel-Search?destination=Ozarks%2C%20Arkansas',
  hotels: 'https://www.hotels.com/Hotel-Search?destination=Ozarks%2C%20Arkansas', kayak: 'https://www.kayak.com/hotels/Ozarks,Arkansas-c30831', tripadvisor: 'https://www.tripadvisor.com/Search?q=Ozarks%20Arkansas%20cabins',
  klook: 'https://www.klook.com/en-US/search/?query=Arkansas', alltrails: 'https://www.alltrails.com/us/arkansas', airbnb: 'https://www.airbnb.com/s/Ozarks--Arkansas/homes',
  recreation: 'https://www.recreation.gov/search?q=Buffalo%20National%20River', koa: 'https://koa.com/campgrounds/', cabela: 'https://www.cabelas.com/search?q=camping%20gear', nationalparktrips: 'https://www.nationalparktrips.com/',
  amazon_camping: 'https://www.amazon.com/s?k=camping+gear+essentials', amazon_kayak: 'https://www.amazon.com/s?k=inflatable+kayak', amazon_binoculars: 'https://www.amazon.com/s?k=travel+binoculars'
};
const env = (name, fallback) => process.env[name] || `${fallback}${fallback.includes('?') ? '&' : '?'}${UTM}`;
const DEFAULTS = {
  stay22: env('AFF_STAY22_URL', official.stay22), travelpayouts: env('AFF_TRAVELPAYOUTS_URL', official.travelpayouts), hipcamp: env('AFF_HIPCAMP_URL', official.hipcamp), rei: env('AFF_REI_URL', official.rei),
  getyourguide: env('AFF_GETYOURGUIDE_URL', official.getyourguide), viator: env('AFF_VIATOR_URL', official.viator), outdoorsy: env('AFF_OUTDOORSY_URL', official.outdoorsy), rvshare: env('AFF_RVSHARE_URL', official.rvshare),
  vrbo: env('AFF_VRBO_URL', official.vrbo), booking: env('AFF_BOOKING_URL', official.booking), publiclands: env('AFF_PUBLICLANDS_URL', official.publiclands), expedia: env('AFF_EXPEDIA_URL', official.expedia),
  hotels: env('AFF_HOTELS_URL', official.hotels), kayak: env('AFF_KAYAK_URL', official.kayak), tripadvisor: env('AFF_TRIPADVISOR_URL', official.tripadvisor), klook: env('AFF_KLOOK_URL', official.klook),
  alltrails: env('AFF_ALLTRAILS_URL', official.alltrails), airbnb: env('AFF_AIRBNB_URL', official.airbnb), recreation: env('AFF_RECREATION_URL', official.recreation), koa: env('AFF_KOA_URL', official.koa),
  cabela: env('AFF_CABELA_URL', official.cabela), nationalparktrips: env('AFF_NATIONALPARKTRIPS_URL', official.nationalparktrips),
  amazon_camping: process.env.AFF_AMAZON_CAMPING_URL || (AMAZON_TAG ? `${official.amazon_camping}&tag=${encodeURIComponent(AMAZON_TAG)}&${UTM}` : `${official.amazon_camping}?${UTM}`),
  amazon_kayak: process.env.AFF_AMAZON_KAYAK_URL || (AMAZON_TAG ? `${official.amazon_kayak}&tag=${encodeURIComponent(AMAZON_TAG)}&${UTM}` : `${official.amazon_kayak}?${UTM}`),
  amazon_binoculars: process.env.AFF_AMAZON_BINOCULARS_URL || (AMAZON_TAG ? `${official.amazon_binoculars}&tag=${encodeURIComponent(AMAZON_TAG)}&${UTM}` : `${official.amazon_binoculars}?${UTM}`),
  list_cabin: `${BASE}/list-your-cabin`, operators: `${BASE}/operators`
};
const LABELS = {
  stay22:'Find cabins on Stay22 map', travelpayouts:'Compare travel deals', hipcamp:'Browse Hipcamp stays', rei:'Gear up at REI', getyourguide:'Book tours on GetYourGuide', viator:'Book experiences on Viator',
  outdoorsy:'Rent an RV on Outdoorsy', rvshare:'Find RVs on RVshare', vrbo:'Browse Vrbo cabins', booking:'Search Booking.com', publiclands:'Outfit at Public Lands', expedia:'Compare hotels on Expedia',
  hotels:'Search Hotels.com', kayak:'Compare travel prices on Kayak', tripadvisor:'Read reviews on Tripadvisor', klook:'Browse activities on Klook', alltrails:'Map trails on AllTrails', airbnb:'Browse Airbnb Ozarks homes',
  recreation:'Reserve on Recreation.gov', koa:'Find KOA campgrounds', cabela:'Shop camping gear at Cabela’s', nationalparktrips:'Explore national park trips', amazon_camping:'Camping essentials on Amazon',
  amazon_kayak:'Kayaks & paddles on Amazon', amazon_binoculars:'Travel binoculars on Amazon', list_cabin:'List your business on OzarkRoost', operators:'Partner with OzarkRoost'
};
const BLURBS = {
  stay22:'Compare bookable stays near your Ozarks route.', travelpayouts:'Travel-search options for lodging and trip planning when an approved Travelpayouts link is configured.', hipcamp:'Unique land stays, glamping sites, and private campgrounds.', rei:'Camping, hiking, fishing, and river gear.', getyourguide:'Book guided tours and activities for your trip.', viator:'Search experiences, tours, and tickets for your itinerary.',
  outdoorsy:'RV and camper rentals for Arkansas road trips.', rvshare:'Peer-to-peer RV rentals near the Ozarks.', vrbo:'Whole-home cabin rentals and vacation homes.', booking:'Search lodging inventory across Arkansas.', publiclands:'Camping and trail gear for public-land weekends.', expedia:'Compare hotels and stays when you need options.',
  hotels:'Find lodging near lakes, towns, and attractions.', kayak:'Compare travel prices in one search.', tripadvisor:'Traveler reviews and photos before you book.', klook:'Tickets and activities for your itinerary.', alltrails:'Trail maps for Ozarks hikes and adventures.', airbnb:'Unique homes and host-run stays.',
  recreation:'Official camping and recreation reservations.', koa:'Campground options for road trips.', cabela:'Outdoor gear for camping, fishing, and road trips.', nationalparktrips:'Trip inspiration for public lands and national park adventures.', amazon_camping:'Camp kitchen, lights, and packing-list staples.',
  amazon_kayak:'Portable boats and paddling gear.', amazon_binoculars:'Compact glass for wildlife and overlooks.', list_cabin:'Get discovered by travelers planning Ozarks trips.', operators:'Put your tourism business in front of Ozarks travelers.'
};
const DIRECTORY_CATEGORIES = [
  { key:'lodging',label:'Cabins & Lodging',icon:'🏡',href:'/listings',description:'Cabins, resorts, inns, vacation homes and unique stays.' }, { key:'restaurants',label:'Restaurants & Bars',icon:'🍽️',href:'/guides/about-the-ozarks',description:'Local restaurants, diners, breweries, bars and nightlife.' },
  { key:'adventures',label:'Adventures & Tours',icon:'🛶',href:'/adventures',description:'Guides, outfitters, floats, caves, ATVs, zip lines and tours.' }, { key:'camping',label:'Camping & RV',icon:'⛺',href:'/guides/ozarks-camping-rv',description:'Campgrounds, RV parks, glamping and public camping.' },
  { key:'fishing',label:'Fishing & Hunting',icon:'🎣',href:'/guides/ozarks-adventures',description:'Fishing guides, boat rentals, outfitters and outdoor services.' }, { key:'rentals',label:'Rentals',icon:'🚐',href:'/adventures',description:'Kayaks, canoes, boats, RVs, bikes and outdoor equipment.' },
  { key:'attractions',label:'Attractions & Events',icon:'🗺️',href:'/adventures',description:'Caves, parks, museums, music, festivals and local experiences.' }, { key:'gear',label:'Ozarks Gear',icon:'🎒',href:'/adventures',description:'Camping, hiking, fishing and road-trip gear from affiliate partners.' }
];
const BUNDLES = {
  stays:['stay22','travelpayouts','hipcamp','vrbo','booking','airbnb','expedia','hotels','kayak'], luxury:['stay22','travelpayouts','vrbo','booking','expedia','hotels'],
  camping:['hipcamp','koa','outdoorsy','rvshare','recreation','rei','publiclands','cabela','amazon_camping'], adventure:['getyourguide','viator','alltrails','klook','travelpayouts','amazon_kayak'],
  roadtrip:['travelpayouts','stay22','kayak','expedia','hotels','tripadvisor','alltrails','outdoorsy'], gear:['rei','publiclands','cabela','amazon_camping','amazon_binoculars'],
  parks:['travelpayouts','recreation','alltrails','nationalparktrips','hipcamp'], monetize_all:['stay22','travelpayouts','hipcamp','vrbo','booking','airbnb','expedia','hotels','kayak','getyourguide','viator','klook','outdoorsy','rvshare','recreation','koa','rei','publiclands','alltrails','tripadvisor','cabela','nationalparktrips','amazon_camping','amazon_kayak','amazon_binoculars']
};
function getAffiliateLinks() { return { ...DEFAULTS, ...registry.getOverrides() }; }
function getWidget(key) { const k=String(key||'').toLowerCase(); const overrides=registry.getOverrides(); if(!DEFAULTS[k]&&!overrides[k]) return null; return { key:k,url:overrides[k]||DEFAULTS[k],label:LABELS[k],blurb:BLURBS[k],active:Boolean(overrides[k]||process.env[`AFF_${k.toUpperCase()}_URL`]) }; }
function getBundle(name) { return (BUNDLES[name]||BUNDLES.stays).map(getWidget).filter(Boolean); }
function getAllWidgets() { return Object.keys(DEFAULTS).map(getWidget).filter(Boolean); }
function getDirectoryCategories() { return DIRECTORY_CATEGORIES.map(category=>({...category})); }
function getFeaturedListings() { return []; }
function getRelatedGuides(currentSlug) { return [['hot-tub-cabins','Hot Tub Cabins'],['pet-friendly-cabins','Pet-Friendly Cabins'],['treehouse-rentals','Treehouse Rentals'],['glamping-ozarks','Glamping in the Ozarks'],['luxury-cabins','Luxury Cabins'],['ozarks-road-trip','Ozarks Road Trip'],['buffalo-river-cabins','Buffalo River Cabins'],['hidden-gem-cabins','Hidden Gem Cabins'],['buffalo-river-kayaking','Buffalo River Kayaking'],['about-the-ozarks','About the Ozarks'],['ozarks-adventures','Ozarks Adventures'],['ozarks-camping-rv','Camping & RV']].filter(g=>g[0]!==currentSlug).slice(0,6).map(([slug,title])=>({slug,title})); }
module.exports={BASE,DEFAULTS,LABELS,BLURBS,BUNDLES,DIRECTORY_CATEGORIES,getAffiliateLinks,getWidget,getBundle,getAllWidgets,getDirectoryCategories,getFeaturedListings,getRelatedGuides};
