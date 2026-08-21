/**
 * OzarkRoost Local AI Engine
 *
 * Zero-credit, zero-network-by-default text engine for the always-on bots.
 * It uses deterministic templates, classifiers, extractors and content builders.
 * An external provider is used only when LOCAL_AI_EMERGENCY=true and the local
 * engine cannot satisfy a request.
 */

const SITE_NAME = 'OzarkRoost';
const SITE_URL = String(process.env.SITE_URL || process.env.APP_URL || 'https://ozartkroost.onrender.com').replace(/\/$/, '');

const topics = [
  'Hidden Gems Along Buffalo River',
  'Ultimate Buffalo National River Kayaking Guide',
  'Best Ozark Cabin Getaways',
  'Fishing Near Buffalo River',
  'Family Adventures in the Ozarks',
  'Romantic Arkansas Cabin Escapes',
];

const pick = (items, seed = '') => {
  let n = 0;
  for (const c of String(seed)) n = (n * 31 + c.charCodeAt(0)) >>> 0;
  return items[n % items.length];
};

const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
const firstSentences = (text, n = 3) => clean(text).split(/(?<=[.!?])\s+/).slice(0, n).join(' ');

function classifyEmail(body) {
  const text = clean(body).toLowerCase();
  if (/payment|paid|charge|receipt|invoice|stripe|transaction/.test(text)) return 'payment_confirmation';
  if (/affiliate|commission|partner program|referral program/.test(text)) return 'affiliate_application';
  if (/listing|list my|property|cabin|rental|monthly/.test(text)) return 'listing_inquiry';
  if (/partnership|collaborat|tourism board|directory/.test(text)) return 'partnership_inquiry';
  if (/help|problem|issue|support|broken|error/.test(text)) return 'support_request';
  if (/unsubscribe|viagra|casino|crypto|prize|winner/.test(text)) return 'spam';
  return 'other';
}

function seo(page) {
  const subject = page === 'home' ? 'Ozarks travel' : page;
  return [
    `${SITE_NAME}: ${subject} resources, Buffalo River cabins and Ozark adventures. Plan your Arkansas getaway with local travel ideas and stays.`,
    `Explore ${subject} with ${SITE_NAME} — Buffalo River cabins, outdoor adventures and practical Arkansas Ozarks travel planning in one place.`,
    `Plan a better Ozarks trip: discover ${subject}, cabin stays and Buffalo River adventures with ${SITE_NAME}.`,
  ].join('\n');
}

function blog(topic) {
  const title = topic || pick(topics);
  return `# ${title}\n\nPlanning an Ozarks getaway is easier when you build the trip around the places and activities you actually want to experience. ${SITE_NAME} helps travelers find Buffalo River cabins, outdoor adventures and practical Arkansas travel information.\n\n## Start with the right base\nChoose a cabin or stay that keeps you close to the river, trails and communities on your route. Check drive times, seasonal conditions and the amenities you actually need before booking.\n\n## Build around the outdoors\nThe Buffalo River and surrounding Ozarks offer hiking, paddling, fishing, scenic drives and quiet stretches of public land. Conditions can change quickly, so verify access, water levels, weather and local rules before heading out.\n\n## Leave room for discovery\nDo not overpack the itinerary. Pick a few anchor stops and leave time for overlooks, small towns, local food and unexpected trailheads.\n\n## Plan the return trip\nKeep fuel, food, navigation and weather in mind, especially on rural roads where services can be farther apart.\n\nReady to plan? Browse ${SITE_NAME} at ${SITE_URL}/listings and pair your stay with an Ozarks adventure.`;
}

function social(platform) {
  const variants = [
    `The Ozarks are calling. Find a Buffalo River cabin, pick an adventure and make the weekend count. ${SITE_URL}/listings`,
    `Cabin + river + fresh air = a better Arkansas getaway. Explore Ozark stays and adventures with ${SITE_NAME}. ${SITE_URL}/adventures`,
    `Planning the Buffalo River? Start with your base, check conditions, then build the adventure around it. ${SITE_URL}/guides/buffalo-river-cabins`,
    `Save this for your next Ozarks trip: scenic drives, river time, trails and a cabin that makes coming back easy. ${SITE_URL}/listings`,
    `Looking for an Arkansas cabin rental? ${SITE_NAME} connects travelers with Ozarks stays and trip ideas. ${SITE_URL}/listings`,
  ];
  return JSON.stringify(variants.map((text, i) => ({ platform, text, index: i + 1 })));
}

function outreach(prompt) {
  const p = clean(prompt).toLowerCase();
  if (p.includes('cabin')) return `Hi there,\n\nI’m reaching out from ${SITE_NAME}, an Arkansas Ozarks travel directory focused on Buffalo River cabins and outdoor experiences. We’re building a useful discovery channel for travelers looking for places to stay and things to do, and we’d like to help feature your property.\n\nIf you’re interested, reply with your preferred listing details and we can send the next steps.\n\nThanks,\nOzarkRoost`;
  if (p.includes('tourism')) return `Hello,\n\n${SITE_NAME} is building an Arkansas Ozarks travel resource covering stays, outdoor recreation and trip planning. We’d like to explore a straightforward collaboration that gives visitors better local information while sending attention to regional businesses and attractions.\n\nIf that sounds useful, please reply with the best contact for partnerships.\n\nBest,\nOzarkRoost`;
  return `Hello,\n\n${SITE_NAME} is an Ozarks travel resource focused on Buffalo River stays and outdoor adventures. We’d love to discuss being included as a useful resource for travelers planning an Arkansas trip.\n\nPlease let us know the appropriate submission or partnership process.\n\nBest,\nOzarkRoost`;
}

function landing(keyword) {
  return `# ${keyword}\n\nFind a better way to plan your Ozarks getaway with ${SITE_NAME}. Explore ${keyword}, compare trip ideas and connect your stay with the outdoor experiences that make Arkansas memorable.\n\n## Why plan with ${SITE_NAME}?\n- Ozarks-focused travel information\n- Buffalo River and Arkansas adventure ideas\n- Cabin and vacation-rental discovery\n- Practical trip-planning guidance\n\n## Plan your trip\nStart with your dates and preferred area, check the current conditions, then choose the stay and activities that fit your trip.\n\n## Frequently asked questions\n**Where should I stay?** Choose a base that minimizes unnecessary driving to your priority activities.\n\n**What should I check before visiting?** Weather, river conditions, road access, seasonal closures and local rules.\n\n**Where do I start?** Browse ${SITE_URL}/listings or explore ${SITE_URL}/adventures.`;
}

function reply(prompt) {
  const text = clean(prompt);
  const category = classifyEmail(text);
  const lead = category === 'payment_confirmation'
    ? 'Thanks for the payment update. We’ll verify the transaction and connect it to the appropriate OzarkRoost record.'
    : category === 'listing_inquiry'
      ? 'Thanks for reaching out about listing with OzarkRoost. We can help get your property in front of travelers planning Ozarks stays.'
      : category === 'affiliate_application'
        ? 'Thanks for your interest in partnering with OzarkRoost. We’ll review the program details and follow the appropriate application process.'
        : category === 'partnership_inquiry'
          ? 'Thanks for contacting OzarkRoost about a partnership. We’re interested in practical collaborations that improve the traveler experience and support regional businesses.'
          : 'Thanks for reaching out to OzarkRoost. We received your message and will review the details.';
  return `${lead}\n\nPlease reply with the relevant details or the best next step, and we’ll take it from there.\n\n— OzarkRoost OpsBot`;
}

function generate(systemPrompt, userPrompt) {
  const system = clean(systemPrompt).toLowerCase();
  const user = clean(userPrompt);
  if (system.includes('classifier') || /classify the email/i.test(user)) return classifyEmail(user);
  if (system.includes('social') || /create 5 .* posts/i.test(user)) return social((system.match(/a (twitter|facebook|instagram)/)?.[1]) || 'social');
  if (system.includes('seo') || /meta description/i.test(user)) {
    const match = user.match(/for the (.*?) page/i);
    return seo(match?.[1] || 'Ozarks travel');
  }
  if (system.includes('travel writer') || /write an 800-word article/i.test(user)) {
    const match = user.match(/titled\s+"([^"]+)"/i);
    return blog(match?.[1] || pick(topics, user));
  }
  if (system.includes('conversion-focused') || /landing-page copy/i.test(user)) {
    const match = user.match(/targeting\s+"([^"]+)"/i);
    return landing(match?.[1] || 'Ozarks vacation rentals');
  }
  if (system.includes('partnership manager') || /partnership email/i.test(user) || /collaboration email/i.test(user)) return outreach(user);
  if (system.includes('outreach specialist') || system.includes('nurture email')) return reply(user);
  if (system.includes('email classifier')) return classifyEmail(user);
  if (system.includes('opsbot') || system.includes('email')) return reply(user);
  return `OzarkRoost local engine: ${firstSentences(user, 3)}`;
}

function createEmergencyClient(originalOpenAI) {
  return class LocalFirstOpenAI {
    constructor(options = {}) { this.options = options; }
    get chat() {
      return { completions: { create: async (request) => {
        try {
          const result = generate(request.messages?.[0]?.content || '', request.messages?.[1]?.content || '');
          return { choices: [{ message: { content: result } }] };
        } catch (localError) {
          if (process.env.LOCAL_AI_EMERGENCY === 'true' && originalOpenAI) {
            console.warn(`[LocalAI] local generation failed; emergency provider enabled: ${localError.message}`);
            const fallback = new originalOpenAI(this.options);
            return fallback.chat.completions.create(request);
          }
          throw localError;
        }
      } } };
    }
    get models() {
      return { list: async () => ({ data: [{ id: 'ozarkroost-local-v1', owned_by: 'OzarkRoost' }] }) };
    }
  };
}

module.exports = { generate, createEmergencyClient, classifyEmail };
