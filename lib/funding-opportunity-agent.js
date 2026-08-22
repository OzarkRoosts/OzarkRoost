/**
 * Rover Funding Opportunity Agent
 * Research + action engine for OzarkRoost funding and growth opportunities.
 *
 * The agent does not merely write drafts: every scan verifies sources, scores fit,
 * prepares the required facts, creates an actionable task, and can execute a
 * configured external action endpoint. Legally binding applications remain
 * owner-controlled unless an explicit integration is configured.
 */
const https = require('https');
const pool = require('../db/index');

const INTERVAL_MS = Number(process.env.FUNDING_AGENT_INTERVAL_MS) || 24 * 60 * 60 * 1000;
const ACTION_WEBHOOK = String(process.env.FUNDING_AGENT_ACTION_WEBHOOK || '').trim();
const AUTO_ACTIONS = process.env.FUNDING_AGENT_AUTO_ACTIONS === 'true';

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
    const req = https.get(url, { headers: { 'user-agent': 'OzarkRoost-FundingAgent/3.0' }, timeout: 15000 }, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; if (body.length > 500000) res.destroy(); });
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('request timeout')));
  });
}

function postJson(url, payload) {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const body = JSON.stringify(payload);
    const req = https.request({ hostname: target.hostname, path: `${target.pathname}${target.search}`, method: 'POST', port: target.port || 443, headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body), 'user-agent': 'OzarkRoost-FundingAgent/3.0' }, timeout: 20000 }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body: data.slice(0, 10000) }));
    });
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('action webhook timeout')));
    req.write(body);
    req.end();
  });
}

function scoreOpportunity(o) {
  let score = 40;
  const text = `${o.title || ''} ${o.description || ''} ${o.category || ''}`.toLowerCase();
  for (const term of ['startup', 'small business', 'software', 'technology', 'ai', 'tourism', 'travel', 'rural', 'economic development']) if (text.includes(term)) score += 5;
  if (/arkansas|tennessee|ozark/i.test(text)) score += 10;
  if (/grant|credit|prize|scholarship|sponsor|accelerator|loan|financing/i.test(text)) score += 5;
  if (o.deadline) score += 5;
  return Math.min(100, score);
}

function buildApplicationPacket(o) {
  const summary = 'OzarkRoost is a technology-enabled travel discovery platform focused on connecting visitors with lodging, activities, local businesses and experiences across the Ozarks, with AI-assisted trip planning and partner monetization.';
  const missingFacts = Object.entries(PROFILE).filter(([, value]) => value === 'unknown' || value === 'NEEDS OWNER').map(([key]) => key);
  return {
    version: 3, organization: PROFILE.business, opportunity: o.title, provider: o.provider,
    source_url: o.source_url, application_url: o.application_url || o.source_url, fit_score: scoreOpportunity(o),
    executive_summary: summary,
    problem: 'Travelers need a better way to discover and plan Ozarks trips while independent local businesses need digital distribution and qualified visitor demand.',
    solution: 'OzarkRoost combines destination content, lodging/activity discovery, trip planning, local partner listings, and affiliate/partner commerce.',
    target_market: 'Visitors planning trips to the Ozarks and tourism businesses seeking qualified digital exposure and bookings.',
    geography: PROFILE.geography, sectors: PROFILE.sectors, stage: PROFILE.stage,
    use_of_funds: ['product development', 'AI/trip-planning infrastructure', 'marketing and visitor acquisition', 'local partner onboarding', 'content and tourism data', 'hosting and software infrastructure'],
    measurable_outcomes: ['local tourism businesses onboarded', 'visitor sessions', 'qualified partner referrals/bookings', 'new tourism-related revenue for participating businesses'],
    owner_facts: PROFILE, missing_facts: missingFacts,
    action: missingFacts.length ? 'owner_review_required' : 'eligible_for_configured_action',
    review_required: true,
    generated_at: new Date().toISOString(),
  };
}

async function upsertOpportunity(o) {
  const score = scoreOpportunity(o);
  const packet = buildApplicationPacket(o);
  const result = await pool.query(`INSERT INTO funding_opportunities (title,provider,opportunity_type,source_url,application_url,description,deadline,fit_score,status,application_packet) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (provider,title) DO UPDATE SET source_url=EXCLUDED.source_url,application_url=EXCLUDED.application_url,description=EXCLUDED.description,deadline=EXCLUDED.deadline,fit_score=EXCLUDED.fit_score,application_packet=EXCLUDED.application_packet,updated_at=NOW() RETURNING id`, [o.title,o.provider,o.category||'funding',o.source_url,o.application_url||o.source_url,o.description||'',o.deadline||null,score,packet.missing_facts.length?'needs_owner_facts':'actionable',JSON.stringify(packet)]);
  return result.rows[0];
}

async function executeOpportunityAction(row) {
  const packet = row.application_packet || {};
  if (packet.missing_facts?.length) return { id: row.id, action: 'blocked_missing_owner_facts', missing_facts: packet.missing_facts };
  if (!AUTO_ACTIONS) return { id: row.id, action: 'queued', reason: 'FUNDING_AGENT_AUTO_ACTIONS is not enabled' };
  if (!ACTION_WEBHOOK) return { id: row.id, action: 'queued', reason: 'No FUNDING_AGENT_ACTION_WEBHOOK configured' };
  try {
    const result = await postJson(ACTION_WEBHOOK, { type: 'funding_opportunity_action', opportunity: row, packet, requested_at: new Date().toISOString() });
    const status = result.status >= 200 && result.status < 300 ? 'action_executed' : 'action_failed';
    await pool.query('UPDATE funding_opportunities SET status=$1, notes=$2, updated_at=NOW() WHERE id=$3', [status, `Action endpoint HTTP ${result.status}`, row.id]);
    return { id: row.id, action: status, http_status: result.status };
  } catch (err) {
    await pool.query('UPDATE funding_opportunities SET status=$1, notes=$2, updated_at=NOW() WHERE id=$3', ['action_failed', err.message, row.id]);
    return { id: row.id, action: 'action_failed', error: err.message };
  }
}

async function recordRun(summary) { await pool.query('INSERT INTO funding_agent_runs (summary) VALUES ($1)', [JSON.stringify(summary)]); }

async function seedKnownOpportunities() {
  const opportunities = [
    { provider:'Render', title:'$500 Founder startup credits', category:'cloud-credit', source_url:'https://render.com/startups', description:'Startup credits for qualified new customers with seed funding.', application_url:'https://render.com/startups' },
    { provider:'GitHub', title:'GitHub for Startups', category:'startup-credit', source_url:'https://github.com/enterprise/startups', description:'Startup benefits and GitHub credits for eligible startups through qualifying partners.', application_url:'https://github.com/enterprise/startups' },
    { provider:'Arkansas AEDC', title:'Technology Development Program', category:'technology-financing', source_url:'https://www.arkansasedc.com/business-resources/small-business-funding', description:'Royalty financing for qualified technology projects with commercialization and employment potential.', application_url:'https://www.arkansasedc.com/business-resources/small-business-funding' },
    { provider:'Arkansas AEDC', title:'Seed Capital Investment Program', category:'seed-financing', source_url:'https://www.arkansasedc.com/business-resources/small-business-funding', description:'Direct investment for Arkansas technology-based companies needing initial capitalization.', application_url:'https://www.arkansasedc.com/business-resources/small-business-funding' },
    { provider:'Kiva', title:'Kiva 0% small-business crowdfunding', category:'community-finance', source_url:'https://www.kiva.org/borrow', description:'Potential 0% interest community-backed financing; eligibility and geography must be verified.', application_url:'https://www.kiva.org/borrow' },
  ];
  for (const o of opportunities) await upsertOpportunity(o);
  return opportunities.length;
}

async function scanConfiguredSources() {
  const results=[];
  for (const feed of SEARCH_FEEDS) {
    try { const response=await requestText(feed.url); results.push({provider:feed.name,url:feed.url,type:feed.type,status:response.status,checked_at:new Date().toISOString()}); }
    catch(err) { results.push({provider:feed.name,url:feed.url,type:feed.type,error:err.message,checked_at:new Date().toISOString()}); }
  }
  return results;
}

async function prepareAllApplications(limit=100) {
  const result=await pool.query(`SELECT id FROM funding_opportunities ORDER BY fit_score DESC, deadline NULLS LAST LIMIT $1`,[limit]);
  let prepared=0, actions=[];
  for (const row of result.rows) {
    const packetResult=await pool.query('SELECT * FROM funding_opportunities WHERE id=$1',[row.id]);
    if (!packetResult.rows[0]) continue;
    const packet=buildApplicationPacket(packetResult.rows[0]);
    await pool.query(`UPDATE funding_opportunities SET application_packet=$1, status=$2, updated_at=NOW() WHERE id=$3`,[JSON.stringify(packet),packet.missing_facts.length?'needs_owner_facts':'actionable',row.id]);
    prepared++;
    actions.push(await executeOpportunityAction({...packetResult.rows[0], application_packet:packet}));
  }
  return { prepared, actions };
}

async function runDailyScan() {
  const seeded=await seedKnownOpportunities();
  const sources=await scanConfiguredSources();
  const work=await prepareAllApplications(100);
  const top=await pool.query(`SELECT id,title,provider,opportunity_type,fit_score,deadline,status,application_url FROM funding_opportunities ORDER BY fit_score DESC, deadline NULLS LAST LIMIT 100`);
  const summary={scanned_at:new Date().toISOString(),seeded,prepared:work.prepared,actions:work.actions,sources,top_opportunities:top.rows,profile:PROFILE,modes:{auto_actions:AUTO_ACTIONS,action_webhook_configured:Boolean(ACTION_WEBHOOK)}};
  await recordRun(summary); return summary;
}

async function start() {
  if(global.__ozarkroostFundingAgentStarted)return;
  global.__ozarkroostFundingAgentStarted=true;
  try{await runDailyScan();}catch(err){console.error('[FundingAgent] initial scan:',err.message);}
  const timer=setInterval(()=>runDailyScan().catch(err=>console.error('[FundingAgent] daily scan:',err.message)),INTERVAL_MS); if(timer.unref)timer.unref();
  console.log(`[FundingAgent] armed; interval=${INTERVAL_MS}ms; autoActions=${AUTO_ACTIONS}; actionWebhook=${Boolean(ACTION_WEBHOOK)}`);
}

module.exports={start,runDailyScan,prepareAllApplications,executeOpportunityAction,buildApplicationPacket,scoreOpportunity,PROFILE,SEARCH_FEEDS};
