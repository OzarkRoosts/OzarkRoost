/**
 * Rover Free Growth Agent
 *
 * Finds legitimate no-cost visibility opportunities for OzarkRoost:
 * startup directories, travel/tourism directories, local listings,
 * community calendars, launch platforms, partnerships, awards and
 * other editorial/listing opportunities.
 *
 * Research and draft mode are autonomous. External submissions are gated
 * so Rover never creates accounts, accepts terms, pays fees, or publishes
 * claims without explicit authorization.
 */

const DEFAULT_INTERVAL_MS = 24 * 60 * 60 * 1000;
const intervalMs = Number(process.env.GROWTH_AGENT_INTERVAL_MS) || DEFAULT_INTERVAL_MS;

const SEED_SOURCES = [
  { name: 'Google Business Profile', url: 'https://www.google.com/business/', category: 'local-listing', free: true },
  { name: 'Apple Business', url: 'https://business.apple.com/', category: 'local-listing', free: true },
  { name: 'Launchory', url: 'https://www.launchory.app/submit', category: 'startup-directory', free: true },
  { name: 'Founder.best', url: 'https://www.founder.best/directories', category: 'startup-directory', free: true },
];

const CHANNELS = [
  'startup-directories',
  'travel-directories',
  'tourism-organizations',
  'local-chambers',
  'community-calendars',
  'free-business-listings',
  'launch-platforms',
  'founder-communities',
  'podcasts-and-interviews',
  'awards-and-competitions',
  'creator-partnerships',
  'editorial-and-pr',
  'social-communities',
  'ai-search-visibility',
];

let timer = null;
let lastRun = null;
let state = { opportunities: [], actions: [], trends: [], lastRun: null };

function enabled() {
  return process.env.GROWTH_AGENT_ENABLED !== 'false';
}

function autoSubmitEnabled() {
  return process.env.GROWTH_AGENT_AUTO_SUBMIT === 'true';
}

function buildSearchPlan() {
  return CHANNELS.map((channel) => ({
    channel,
    queries: [
      `free ${channel} submission travel website 2026`,
      `free ${channel} Ozarks Tennessee Arkansas travel`,
      `free ${channel} startup listing application`,
    ],
  }));
}

function scoreOpportunity(item = {}) {
  let score = 0;
  if (item.free === true) score += 30;
  if (item.relevant) score += 25;
  if (item.audience_fit) score += 20;
  if (item.editorial_or_authority) score += 15;
  if (item.backlink_or_profile) score += 10;
  if (item.requires_payment) score -= 100;
  if (item.requires_spammy_automation) score -= 100;
  return Math.max(0, Math.min(100, score));
}

function makePlan() {
  const opportunities = SEED_SOURCES.map((source) => ({
    ...source,
    status: 'research',
    score: scoreOpportunity({ free: source.free, relevant: true, audience_fit: true, backlink_or_profile: true }),
    action: 'verify-and-prepare',
  }));

  const actions = opportunities.map((opportunity) => ({
    type: 'listing_submission',
    source: opportunity.name,
    status: autoSubmitEnabled() ? 'eligible-for-review' : 'approval-required',
  }));

  return {
    generatedAt: new Date().toISOString(),
    mode: autoSubmitEnabled() ? 'gated-auto-submit' : 'research-and-draft',
    searchPlan: buildSearchPlan(),
    opportunities,
    actions,
    guardrails: [
      'Never pay for a listing without explicit approval.',
      'Never create an account using false identity or unverified information.',
      'Never publish misleading claims, fake reviews, or fabricated traffic/revenue.',
      'Prefer relevant, reputable, free opportunities over bulk directory spam.',
      'Respect robots.txt, terms, rate limits, CAPTCHA and platform rules.',
      'Draft applications and outreach before external submission unless explicitly enabled.',
    ],
  };
}

async function run() {
  if (!enabled()) return state;
  const plan = makePlan();
  lastRun = new Date().toISOString();
  state = { ...plan, lastRun };
  return state;
}

function start() {
  if (!enabled() || timer) return;
  run().catch((err) => console.error('[growth-agent] initial run failed:', err.message));
  timer = setInterval(() => {
    run().catch((err) => console.error('[growth-agent] scheduled run failed:', err.message));
  }, intervalMs);
}

function stop() {
  if (timer) clearInterval(timer);
  timer = null;
}

function getState() {
  return state;
}

module.exports = {
  name: 'rover-free-growth-agent',
  start,
  stop,
  run,
  getState,
  scoreOpportunity,
  buildSearchPlan,
};
