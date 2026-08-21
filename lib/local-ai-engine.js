/**
 * OzarkRoost Local AI Engine
 *
 * Deterministic, dependency-free generation for production fallback/offline use.
 * No OpenAI, Groq, network calls, API keys, or usage credits are required.
 * The engine uses task-aware templates, keyword extraction, scoring, and
 * variation selection so the application can continue operating on its own.
 */

const SITE_NAME = 'OzarkRoost';
const SITE_URL = String(process.env.SITE_URL || process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || 'https://ozartkroost.onrender.com').replace(/\/$/, '');

const TOPICS = [
  'Buffalo River cabins', 'Ozark vacation rentals', 'Arkansas cabin rentals',
  'Buffalo National River kayaking', 'Ozark hiking adventures',
  'family trips in the Ozarks', 'romantic cabin getaways', 'pet-friendly cabins',
  'Ozark camping and RV stays', 'hidden-gem cabins'
];

const STOP = new Set(['the','and','for','with','that','this','from','your','you','are','about','write','create','page','site','include','return','json','when','possible']);

function words(text = '') {
  return String(text).toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/).filter(w => w && !STOP.has(w));
}

function topicFrom(prompt = '') {
  const lower = String(prompt).toLowerCase();
  return TOPICS.find(t => lower.includes(t.toLowerCase())) || 'Ozark travel';
}

function pick(list, seed = '') {
  const n = [...words(seed)].reduce((sum, w) => sum + w.charCodeAt(0), 0);
  return list[Math.abs(n) % list.length];
}

function meta(page, seed) {
  const subject = page === 'home' ? 'Buffalo River cabins, Ozark adventures and Arkansas travel' : `${page} at ${SITE_NAME}`;
  const variants = [
    `Plan your ${subject} with ${SITE_NAME}. Find memorable stays, outdoor adventures and practical Ozark trip ideas.`,
    `Explore ${subject} with ${SITE_NAME} — discover cabins, adventures and useful travel ideas for the Arkansas Ozarks.`,
    `Ready for the Ozarks? ${SITE_NAME} helps you discover ${subject}, with practical guides and places to stay.`
  ];
  return variants.join('\n');
}

function blog(title) {
  const topic = title || pick(['Hidden Gems Along Buffalo River','Ultimate Buffalo National River Kayaking Guide','Best Ozark Cabin Getaways','Fishing Near Buffalo River','Family Adventures in the Ozarks','Romantic Arkansas Cabin Escapes'], title);
  return `# ${topic}\n\nThe Arkansas Ozarks are built for slow mornings, clear-water rivers, wooded trails and memorable cabin stays. ${SITE_NAME} helps travelers turn that scenery into a practical trip plan.\n\n## Start with the right home base\nChoose a stay that fits the trip: a quiet cabin for couples, a family-friendly property near outdoor activities, or an RV and camping option when flexibility matters. Check the property's current amenities, rules, location and availability directly before booking.\n\n## Build the day around the outdoors\nThe Buffalo National River and surrounding Ozarks offer opportunities for paddling, hiking, fishing, wildlife viewing and scenic drives. Conditions can change, so check current river levels, weather, trail conditions and local rules before heading out.\n\n## Keep the itinerary flexible\nA good Ozark trip leaves room for weather and discovery. Pick a few priorities, allow extra drive time on rural roads, and keep backup activities ready.\n\n## Find your next Ozark stay\nBrowse ${SITE_NAME} for cabin ideas, outdoor adventures and trip-planning resources. Verify current pricing, availability and policies with the operator before booking.\n\nPlan smart, get outside and make the Ozarks the part of the trip you remember.`;
}

function social(platform, seed) {
  const topic = topicFrom(seed);
  const hooks = {
    twitter: [`Planning ${topic}? Start with the stay, then build the adventure. Explore ${SITE_URL}.`, `Fresh-air plans: ${topic}, a good route, and room for one unexpected stop. ${SITE_URL}`],
    facebook: [`Planning an Ozarks getaway? Explore ${topic} and build a trip around cabins, rivers, trails and local adventures. Start here: ${SITE_URL}`],
    instagram: [`Ozarks mode: ON 🌲\n\n${topic}. Scenic roads. River days. Cabin nights.\n\nPlan it with ${SITE_NAME}: ${SITE_URL}`]
  };
  const base = hooks[platform] || hooks.facebook;
  return Array.from({ length: 5 }, (_, i) => `${base[i % base.length]}\n\n#Ozarks #BuffaloRiver #ArkansasTravel #OzarkRoost`);
}

function outreach(prompt) {
  const target = /tourism/i.test(prompt) ? 'tourism organization' : /directory/i.test(prompt) ? 'travel directory' : 'cabin owner';
  return `Subject: Partnership opportunity with ${SITE_NAME}\n\nHello,\n\nI’m reaching out from ${SITE_NAME}, an Arkansas Ozarks travel site focused on helping visitors discover places to stay and things to do. We would like to explore a straightforward partnership with your ${target}.\n\nWe can feature relevant information, send qualified visitors to your official booking or information page, and keep the presentation useful and transparent for travelers. We do not promise bookings or invent performance claims.\n\nIf this is a fit, please reply with the best contact and partnership information.\n\nThanks,\n${SITE_NAME}\n${SITE_URL}`;
}

function landing(keyword) {
  return `# ${keyword}\n\nDiscover a better way to plan an Arkansas Ozarks getaway with ${SITE_NAME}.\n\n## Why start here?\n- Find relevant places to stay and outdoor ideas in one place.\n- Use practical guides to shape your itinerary.\n- Compare options and verify current details with the operator before booking.\n\n## Plan around what you actually want\nWhether your priority is river access, hiking, a quiet cabin, an RV stay or a weekend adventure, start with the location and experience that matter most.\n\n## FAQs\n**Is availability live?** Verify current availability directly with the property or provider.\n\n**Are prices guaranteed?** No. Prices and policies can change; confirm them before booking.\n\n**Where should I start?** Browse ${SITE_NAME}, then narrow your trip by stay, activity and location.\n\n## Start planning\nExplore ${SITE_URL} and build an Ozark trip that fits your group.`;
}

function answer(message = '') {
  const q = String(message).trim();
  if (!q) return 'Tell me what you want to do in the Ozarks and I’ll help you build a practical trip plan.';
  const l = q.toLowerCase();
  if (/emergency|911|danger|injur|stranded/.test(l)) return 'If you are in immediate danger or need emergency assistance, contact local emergency services. For trip planning, I can help with routes, stays and activities once you are safe.';
  if (/cabin|stay|lodg|rental/.test(l)) return `For a cabin or stay, start with location, dates, group size and must-have amenities. ${SITE_NAME} can help you narrow the options; verify current availability, price and policies with the operator before booking.`;
  if (/kayak|canoe|float|river|paddl/.test(l)) return 'For a Buffalo River outing, check current river conditions and weather first, choose an outfitter or launch appropriate for your experience, and plan transportation between put-in and take-out points.';
  if (/hike|trail|waterfall|outdoor|adventure/.test(l)) return 'For an Ozark outdoor day, pick a trail or activity that matches your ability, check current conditions, carry water and navigation essentials, and allow extra time for rural roads.';
  if (/food|eat|restaurant|bar/.test(l)) return 'Tell me the town or area, your preferred food, and whether you want casual, family-friendly or a special-occasion spot, and I can help structure the search.';
  return `I can help plan an Arkansas Ozarks trip. Start with your dates, group size, preferred area, budget range and the experience you want (river, hiking, cabin, camping, food or a mix). ${SITE_NAME}: ${SITE_URL}`;
}

async function generate(systemPrompt = '', userPrompt = '', options = {}) {
  const text = `${systemPrompt}\n${userPrompt}`;
  const lower = text.toLowerCase();
  if (/meta description|seo/.test(lower)) return meta(topicFrom(userPrompt), userPrompt);
  if (/800-word|article|blog post/.test(lower)) return blog(topicFrom(userPrompt));
  if (/social|twitter|facebook|instagram/.test(lower)) return social(/instagram/i.test(lower) ? 'instagram' : /twitter/i.test(lower) ? 'twitter' : 'facebook', userPrompt).join('\n\n---\n\n');
  if (/partnership email|outreach|directory|tourism organization|cabin owner/.test(lower)) return outreach(userPrompt);
  if (/landing-page|landing page/.test(lower)) return landing(topicFrom(userPrompt));
  return answer(userPrompt);
}

module.exports = { generate, answer, blog, social, outreach, landing };
