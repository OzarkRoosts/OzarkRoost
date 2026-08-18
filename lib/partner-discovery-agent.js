const pool = require('../db/index');
const outreach = require('./rover-outreach-agent');

const INTERVAL_MS = Number(process.env.PARTNER_DISCOVERY_INTERVAL_MS) || 24 * 60 * 60 * 1000;
let timer = null;
let started = false;

const SEED_PROSPECTS = [
  { name: 'Viator', category: 'experiences', partner_type: 'affiliate', website_url: 'https://www.viator.com/', application_url: 'https://partnerresources.viator.com/', fit_score: 95 },
  { name: 'GetYourGuide', category: 'experiences', partner_type: 'affiliate', website_url: 'https://www.getyourguide.com/', application_url: 'https://partner.getyourguide.com/', fit_score: 95 },
  { name: 'OpenTable', category: 'restaurants', partner_type: 'partner', website_url: 'https://www.opentable.com/', application_url: 'https://dev.opentable.com/partner-portal/affiliate-partners/', fit_score: 88 },
  { name: 'Hipcamp', category: 'camping', partner_type: 'affiliate', website_url: 'https://www.hipcamp.com/', fit_score: 88 },
  { name: 'Outdoorsy', category: 'rv', partner_type: 'affiliate', website_url: 'https://www.outdoorsy.com/', fit_score: 84 },
  { name: 'Booking.com', category: 'lodging', partner_type: 'affiliate', website_url: 'https://www.booking.com/', fit_score: 90 },
  { name: 'Expedia', category: 'lodging', partner_type: 'affiliate', website_url: 'https://www.expedia.com/', fit_score: 86 },
  { name: 'Recreation.gov', category: 'public-lands', partner_type: 'partner', website_url: 'https://www.recreation.gov/', fit_score: 82 },
  { name: 'Ozark-St. Francis National Forests', category: 'public-lands', partner_type: 'direct', website_url: 'https://www.fs.usda.gov/ozark-stfrancis', fit_score: 92 },
  { name: 'Arkansas Tourism', category: 'tourism', partner_type: 'direct', website_url: 'https://www.arkansas.com/', fit_score: 94 },
];

const CATEGORY_PLAN = [
  'restaurants', 'bars', 'breweries', 'wineries', 'live-music', 'shows', 'festivals', 'attractions',
  'museums', 'caves', 'zipline', 'rafting', 'kayaking', 'fishing', 'horseback', 'atv', 'hiking',
  'camping', 'rv', 'lodging', 'public-lands', 'tourism'
];

function scoreProspect(p) {
  let score = Number(p.fit_score) || 50;
  if (['restaurants', 'shows', 'live-music', 'attractions'].includes(p.category)) score += 3;
  if (p.partner_type === 'direct') score += 2;
  if (p.application_url) score += 3;
  return Math.max(0, Math.min(100, score));
}

async function seed() {
  for (const prospect of SEED_PROSPECTS) {
    const score = scoreProspect(prospect);
    await pool.query(
      `INSERT INTO partner_prospects
        (name, category, partner_type, website_url, application_url, region, fit_score, verification_status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'needs_review')
       ON CONFLICT (name, COALESCE(website_url, '')) DO UPDATE SET
         category=EXCLUDED.category, partner_type=EXCLUDED.partner_type,
         application_url=COALESCE(EXCLUDED.application_url, partner_prospects.application_url),
         fit_score=GREATEST(partner_prospects.fit_score, EXCLUDED.fit_score), updated_at=NOW()`,
      [prospect.name, prospect.category, prospect.partner_type, prospect.website_url || null, prospect.application_url || null, 'Ozarks', score]
    );
  }
}

function buildResearchBrief(category) {
  return {
    category,
    objective: `Find legitimate affiliate programs, reservation partnerships, tourism partnerships, and direct local businesses for ${category} in the Ozarks.`,
    verify: ['official website/domain', 'current partner or affiliate terms', 'published commission/referral economics', 'Ozarks relevance', 'application/contact path', 'commercial-use terms'],
    never_claim: ['approved partnership', 'commission rate', 'availability', 'relationship with a public agency']
  };
}

async function prepareQueuedOutreach() {
  const rows = await pool.query(
    `SELECT * FROM partner_prospects
     WHERE status IN ('research','needs_review','needs_contact_research')
       AND fit_score >= $1
     ORDER BY fit_score DESC, updated_at DESC LIMIT 25`,
    [Number(process.env.ROVER_OUTREACH_MIN_FIT_SCORE) || 80]
  );
  const prepared = [];
  for (const prospect of rows.rows) {
    try { prepared.push(await outreach.prepareOutreach(prospect)); }
    catch (err) { console.error('[PartnerDiscovery] outreach prep:', err.message); }
  }
  return prepared;
}

async function runDiscovery() {
  await seed();
  const rows = await pool.query(`SELECT id,name,category,partner_type,website_url,application_url,fit_score,status,verification_status FROM partner_prospects ORDER BY fit_score DESC, updated_at DESC LIMIT 100`);
  const preparedOutreach = await prepareQueuedOutreach();
  const result = {
    categories: CATEGORY_PLAN,
    prospects: rows.rows,
    prepared_outreach: preparedOutreach,
    research_briefs: CATEGORY_PLAN.map(buildResearchBrief),
    next_actions: [
      'Verify official partner/application pages before publishing links.',
      'Prioritize restaurants, shows, live music and attractions for direct outreach.',
      'Prioritize established experience and lodging networks for affiliate applications.',
      'Treat public-land agencies as information/partnership prospects, not assumed affiliate merchants.',
      'Keep unverified prospects out of production CTAs until verified.',
      'If a contact fails, recover another verified official route before retrying.'
    ],
    generated_at: new Date().toISOString()
  };
  await pool.query(`INSERT INTO partner_discovery_runs (query, results) VALUES ($1,$2)`, [JSON.stringify({ categories: CATEGORY_PLAN }), JSON.stringify(result.prospects)]);
  return result;
}

async function start() {
  if (started) return;
  started = true;
  try { await runDiscovery(); } catch (err) { console.error('[PartnerDiscovery] initial run:', err.message); }
  timer = setInterval(() => runDiscovery().catch(err => console.error('[PartnerDiscovery] scan:', err.message)), INTERVAL_MS);
  if (timer.unref) timer.unref();
  console.log(`[PartnerDiscovery] armed; interval=${INTERVAL_MS}ms`);
}

async function getProspects({ category, status, limit = 50 } = {}) {
  const params = []; const where = [];
  if (category) { params.push(category); where.push(`category=$${params.length}`); }
  if (status) { params.push(status); where.push(`status=$${params.length}`); }
  params.push(Math.min(Number(limit) || 50, 100));
  const result = await pool.query(`SELECT * FROM partner_prospects ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY fit_score DESC, updated_at DESC LIMIT $${params.length}`, params);
  return result.rows;
}

module.exports = { start, runDiscovery, getProspects, buildResearchBrief, CATEGORY_PLAN };
