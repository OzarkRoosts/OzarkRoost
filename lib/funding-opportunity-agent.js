/**
 * Rover Funding Opportunity Agent
 *
 * Research-first funding intelligence for OzarkRoost. It tracks grants,
 * startup credits, competitions, scholarships, accelerators, sponsorships,
 * and private-funder opportunities; scores fit; maintains deadlines; and
 * prepares application packets.
 *
 * Safety boundary: it never invents eligibility, signs agreements, accepts
 * money, submits a legally binding application, or sends external outreach
 * unless the corresponding explicit environment flag is enabled. By default
 * all external actions become review-ready tasks for the owner.
 */
const https = require('https');
const pool = require('../db/index');

const INTERVAL_MS = Number(process.env.FUNDING_AGENT_INTERVAL_MS) || 24 * 60 * 60 * 1000;
const AUTO_APPLY = process.env.FUNDING_AGENT_AUTO_APPLY === 'true';
const AUTO_ACCEPT = process.env.FUNDING_AGENT_AUTO_ACCEPT === 'true';
const AUTO_OUTREACH = process.env.FUNDING_AGENT_AUTO_OUTREACH === 'true';

const SEARCH_FEEDS = [
  { name: 'Grants.gov', url: 'https://www.grants.gov/', type: 'grant' },
  { name: 'Challenge.gov', url: 'https://www.challenge.gov/', type: 'competition' },
  { name: 'Render Startups', url: 'https://render.com/startups', type: 'cloud-credit' },
  { name: 'GitHub for Startups', url: 'https://github.com/enterprise/startups', type: 'startup-credit' },
  { name: 'SBA Funding', url: 'https://www.sba.gov/funding-programs', type: 'funding' },
  { name: 'Arkansas AEDC', url: 'https://www.arkansasedc.com/business-resources/small-business-funding', type: 'grant' },
  { name: 'Tennessee Tourism', url: 'https://industry.tnvacation.com/industryresourcestourism-grants-and-scholarships', type: 'tourism' },
];

const PROFILE = {
  business: process.env.FUNDING_BUSINESS_NAME || 'OzarkRoost',
  sectors: ['travel technology', 'tourism', 'software', 'AI', 'online marketplace', 'affiliate commerce', 'rural economic development'],
  geography: ['Arkansas Ozarks', 'Tennessee', 'United States'],
  stage: process.env.FUNDING_STAGE || 'early-stage',
  funding_raised: process.env.FUNDING_RAISED || 'unknown',
  employees: process.env.FUNDING_EMPLOYEES || 'unknown',
  legal_entity: process.env.FUNDING_LEGAL_ENTITY || 'NEEDS OWNER',
  owner_name: process.env.FUNDING_OWNER_NAME || 'NEEDS OWNER',
  formation_state: process.env.FUNDING_FORMATION_STATE || 'NEEDS OWNER',
  formation_date: process.env.FUNDING_FORMATION_DATE || 'NEEDS OWNER',
  current_revenue: process.env.FUNDING_CURRENT_REVENUE || 'NEEDS OWNER',
  requested_amount_default: process.env.FUNDING_REQUESTED_AMOUNT || 'NEEDS OWNER',
  matching_funds: process.env.FUNDING_MATCHING_FUNDS || 'NEEDS OWNER',
};

function requestText(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'user-agent': 'OzarkRoost-FundingAgent/2.0' }, timeout: 15000 }, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; if (body.length > 500000) res.destroy(); });
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('request timeout')));
  });
}

function scoreOpportunity(o) {
  let score = 40;
  const text = `${o.title || ''} ${o.description || ''} ${o.category || ''}`.toLowerCase();
  for (const term of ['startup', 'small business', 'software', 'technology', 'ai', 'tourism', 'travel', 'rural', 'economic development']) {
    if (text.includes(term)) score += 5;
  }
  if (/arkansas|tennessee|ozark/i.test(text)) score += 10;
  if (/grant|credit|prize|scholarship|sponsor|accelerator|loan|financing/i.test(text)) score += 5;
  if (o.deadline) score += 5;
  return Math.min(100, score);
}

function buildApplicationPacket(o) {
  const summary = 'OzarkRoost is a technology-enabled travel discovery platform focused on connecting visitors with lodging, activities, local businesses and experiences across the Ozarks, with AI-assisted trip planning and partner monetization.';
  const useOfFunds = ['product development', 'AI/trip-planning infrastructure', 'marketing and visitor acquisition', 'local partner onboarding', 'content and tourism data', 'hosting and software infrastructure'];
  const missingFacts = [];
  for (const [key, value] of Object.entries(PROFILE)) {
    if (value === 'unknown' || value === 'NEEDS OWNER') missingFacts.push(key);
  }

  return {
    version: 2,
    organization: PROFILE.business,
    opportunity: o.title,
    provider: o.provider,
    source_url: o.source_url,
    application_url: o.application_url || o.source_url,
    fit_score: scoreOpportunity(o),
    executive_summary: summary,
    problem: 'Travelers need a more useful way to discover and plan Ozarks trips while independent local businesses need digital distribution and qualified visitor demand.',
    solution: 'OzarkRoost combines destination content, lodging and activity discovery, trip-planning tools, local partner listings, and affiliate/partner commerce in one regional travel platform.',
    target_market: 'Visitors planning trips to the Ozarks and tourism businesses seeking qualified digital exposure and bookings.',
    geography: PROFILE.geography,
    sectors: PROFILE.sectors,
    stage: PROFILE.stage,
    use_of_funds: useOfFunds,
    impact: 'Increase tourism discovery, create digital distribution for local businesses, and build scalable technology that can support tourism-related economic activity.',
    measurable_outcomes: [
      'new local tourism businesses onboarded',
      'visitor sessions and trip-planning engagements',
      'qualified partner referrals/bookings',
      'new jobs or contractor opportunities as scale permits',
      'new tourism-related revenue generated for participating businesses',
    ],
    owner_facts: {
      legal_entity: PROFILE.legal_entity,
      owner_name: PROFILE.owner_name,
      formation_state: PROFILE.formation_state,
      formation_date: PROFILE.formation_date,
      current_revenue: PROFILE.current_revenue,
      funding_raised: PROFILE.funding_raised,
      employees: PROFILE.employees,
      requested_amount: o.requested_amount || PROFILE.requested_amount_default,
      matching_funds: PROFILE.matching_funds,
    },
    application_fields: {
      company_name: PROFILE.business,
      business_description: summary,
      industry: 'Travel technology / tourism',
      website: process.env.SITE_URL || 'https://ozartkroost.onrender.com',
      stage: PROFILE.stage,
      location: PROFILE.geography.join('; '),
      requested_amount: o.requested_amount || PROFILE.requested_amount_default,
    },
    attachments_needed: [
      'business formation documentation (if required)',
      'owner identification or certification (if required)',
      'current financials / bank statements (if required)',
      'business plan or pitch deck (if required)',
      'budget and use-of-funds schedule',
      'tax/business registration documentation (if required)',
    ],
    missing_facts: missingFacts,
    review_required: true,
    submission_status: AUTO_APPLY ? 'automation_enabled_but_external_submission_requires_validation' : 'ready_for_owner_review',
    generated_at: new Date().toISOString(),
  };
}

async function upsertOpportunity(o) {
  const score = scoreOpportunity(o);
  const packet = buildApplicationPacket(o);
  const result = await pool.query(`
    INSERT INTO funding_opportunities
      (title, provider, opportunity_type, source_url, application_url, description, deadline, fit_score, status, application_packet)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'new',$9)
    ON CONFLICT (provider, title) DO UPDATE SET
      source_url=EXCLUDED.source_url, application_url=EXCLUDED.application_url,
      description=EXCLUDED.description, deadline=EXCLUDED.deadline,
      fit_score=EXCLUDED.fit_score, application_packet=EXCLUDED.application_packet,
      updated_at=NOW()
    RETURNING id
  `, [o.title, o.provider, o.category || 'funding', o.source_url, o.application_url || o.source_url, o.description || '', o.deadline || null, score, JSON.stringify(packet)]);
  return result.rows[0];
}

async function recordRun(summary) {
  await pool.query(`INSERT INTO funding_agent_runs (summary) VALUES ($1)`, [JSON.stringify(summary)]);
}

async function seedKnownOpportunities() {
  const opportunities = [
    { provider: 'Render', title: '$500 Founder startup credits', category: 'cloud-credit', source_url: 'https://render.com/startups', description: 'Startup credits for qualified new customers with seed funding.', application_url: 'https://render.com/startups' },
    { provider: 'GitHub', title: 'GitHub for Startups', category: 'startup-credit', source_url: 'https://github.com/enterprise/startups', description: 'Startup benefits and GitHub credits for eligible startups through qualifying partners.', application_url: 'https://github.com/enterprise/startups' },
    { provider: 'Arkansas AEDC', title: 'Technology Development Program', category: 'technology-financing', source_url: 'https://www.arkansasedc.com/business-resources/small-business-funding', description: 'Royalty financing for qualified technology projects with commercialization and employment potential.', application_url: 'https://www.arkansasedc.com/business-resources/small-business-funding' },
    { provider: 'Arkansas AEDC', title: 'Seed Capital Investment Program', category: 'seed-financing', source_url: 'https://www.arkansasedc.com/business-resources/small-business-funding', description: 'Direct investment for Arkansas technology-based companies needing initial capitalization.', application_url: 'https://www.arkansasedc.com/business-resources/small-business-funding' },
    { provider: 'Kiva', title: 'Kiva 0% small-business crowdfunding', category: 'community-finance', source_url: 'https://www.kiva.org/borrow', description: 'Potential 0% interest community-backed financing; eligibility and geography must be verified.', application_url: 'https://www.kiva.org/borrow' },
  ];
  for (const o of opportunities) await upsertOpportunity(o);
  return opportunities.length;
}

async function scanConfiguredSources() {
  const results = [];
  for (const feed of SEARCH_FEEDS) {
    try {
      const response = await requestText(feed.url);
      results.push({ provider: feed.name, url: feed.url, type: feed.type, status: response.status, checked_at: new Date().toISOString() });
    } catch (err) {
      results.push({ provider: feed.name, url: feed.url, type: feed.type, error: err.message, checked_at: new Date().toISOString() });
    }
  }
  return results;
}

async function prepareApplication(id) {
  const result = await pool.query('SELECT * FROM funding_opportunities WHERE id=$1', [id]);
  if (!result.rows[0]) return null;
  const packet = buildApplicationPacket(result.rows[0]);
  const status = packet.missing_facts.length ? 'ready_for_review' : 'application_ready';
  await pool.query(`UPDATE funding_opportunities SET status=$1, application_packet=$2, updated_at=NOW() WHERE id=$3`, [status, JSON.stringify(packet), id]);
  return packet;
}

async function prepareAllApplications(limit = 100) {
  const result = await pool.query(`SELECT id FROM funding_opportunities ORDER BY fit_score DESC, deadline NULLS LAST LIMIT $1`, [limit]);
  let prepared = 0;
  for (const row of result.rows) {
    await prepareApplication(row.id);
    prepared += 1;
  }
  return prepared;
}

async function runDailyScan() {
  const seeded = await seedKnownOpportunities();
  const sources = await scanConfiguredSources();
  const prepared = await prepareAllApplications(100);
  const top = await pool.query(`SELECT id,title,provider,opportunity_type,fit_score,deadline,status,application_url FROM funding_opportunities ORDER BY fit_score DESC, deadline NULLS LAST LIMIT 100`);
  const summary = { scanned_at: new Date().toISOString(), seeded, prepared, sources, top_opportunities: top.rows, profile: PROFILE, modes: { auto_apply: AUTO_APPLY, auto_accept: AUTO_ACCEPT, auto_outreach: AUTO_OUTREACH } };
  await recordRun(summary);
  return summary;
}

async function start() {
  if (global.__ozarkroostFundingAgentStarted) return;
  global.__ozarkroostFundingAgentStarted = true;
  try { await runDailyScan(); } catch (err) { console.error('[FundingAgent] initial scan:', err.message); }
  const timer = setInterval(() => runDailyScan().catch(err => console.error('[FundingAgent] daily scan:', err.message)), INTERVAL_MS);
  if (timer.unref) timer.unref();
  console.log(`[FundingAgent] armed; interval=${INTERVAL_MS}ms; autoApply=${AUTO_APPLY}; autoAccept=${AUTO_ACCEPT}; autoOutreach=${AUTO_OUTREACH}`);
}

module.exports = { start, runDailyScan, prepareApplication, prepareAllApplications, buildApplicationPacket, scoreOpportunity, PROFILE, SEARCH_FEEDS };
