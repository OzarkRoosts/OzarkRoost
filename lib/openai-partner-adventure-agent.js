/**
 * OpenAI-powered partner + adventure monetization agent.
 *
 * Purpose:
 * - Keep a verified catalog of high-fit lodging, RV, camping and experience
 *   partner programs.
 * - Use OpenAI to write truthful, partner-specific application copy.
 * - Queue only legitimate application URLs for the existing affiliate executor.
 * - Never claim approval, invent commission terms, bypass CAPTCHA/MFA, or
 *   submit to an unknown domain.
 * - Never spend money or create paid subscriptions.
 */
const pool = require('../db/index');
const { OpenAI } = require('openai');

const INTERVAL_MS = Number(process.env.PARTNER_AI_INTERVAL_MS) || 6 * 60 * 60 * 1000;
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

const TARGETS = [
  // Priority revenue partners. Travelpayouts now auto-connects eligible
  // programs after Project creation; Stay22 provides immediate affiliate tools
  // after signup. The executor will stop at account creation, verification,
  // CAPTCHA/MFA, or required human attestations rather than bypassing them.
  { name: 'Stay22 Affiliate', category: 'lodging', type: 'affiliate', url: 'https://www.stay22.com/', apply: 'https://www.stay22.com/', fit: 99 },
  { name: 'Travelpayouts Affiliate', category: 'travel-network', type: 'affiliate', url: 'https://www.travelpayouts.com/', apply: 'https://www.travelpayouts.com/', fit: 99 },
  { name: 'GetYourGuide Affiliate', category: 'experiences', type: 'affiliate', url: 'https://www.getyourguide.com/', apply: 'https://partner.getyourguide.com/', fit: 96 },
  { name: 'Outdoorsy Affiliate', category: 'rv', type: 'affiliate', url: 'https://www.outdoorsy.com/', apply: 'https://www.outdoorsy.com/affiliate', fit: 94 },
  { name: 'ResortPass Affiliate', category: 'resorts-and-day-experiences', type: 'affiliate', url: 'https://www.resortpass.com/', apply: 'https://www.resortpass.com/affiliates', fit: 86 },
  { name: 'Hipcamp Partner', category: 'camping-and-glamping', type: 'affiliate', url: 'https://www.hipcamp.com/', apply: 'https://www.hipcamp.com/', fit: 93 },
  { name: 'Booking.com Partner', category: 'lodging', type: 'affiliate', url: 'https://www.booking.com/', apply: 'https://www.booking.com/affiliate-program', fit: 95 },
  { name: 'Expedia Partner', category: 'lodging', type: 'affiliate', url: 'https://www.expedia.com/', apply: 'https://www.expedia.com/affiliate-program', fit: 90 },
  { name: 'AllTrails Partner', category: 'hiking-and-trails', type: 'affiliate', url: 'https://www.alltrails.com/us/arkansas', apply: 'https://www.alltrails.com/', fit: 90 },
  { name: 'REI Partner', category: 'outdoor-gear', type: 'affiliate', url: 'https://www.rei.com/search?q=camping+gear', apply: 'https://www.rei.com/', fit: 78 },
];

const OPENAI_HOST = process.env.OPENAI_API_KEY ? true : false;

async function applicationCopy(target) {
  if (!OPENAI_HOST) {
    return `OzarkRoost is an Arkansas Ozarks travel guide and discovery site focused on cabins, outdoor recreation, road trips, local attractions, and adventure planning. ${target.name} is a strong fit for our audience because travelers use our guides to plan lodging, activities, gear, and outdoor trips. We would like to participate through your official partner program and use the tracking tools and links you provide.`;
  }
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.chat.completions.create({
    model: MODEL,
    temperature: 0.2,
    max_tokens: 220,
    messages: [
      { role: 'system', content: 'Write truthful affiliate-program application copy for OzarkRoost. Never invent traffic, audience size, approvals, commissions, partnerships, or credentials. Keep it to 2 short paragraphs.' },
      { role: 'user', content: `Partner: ${target.name}\nCategory: ${target.category}\nOzarkRoost: Arkansas Ozarks travel discovery site covering cabins, outdoor recreation, road trips, attractions and trip-planning guides. Write the application.` }
    ]
  });
  return response.choices[0]?.message?.content?.trim() || '';
}

async function upsertTarget(target) {
  const copy = await applicationCopy(target);
  await pool.query(
    `INSERT INTO partner_prospects
      (name, category, partner_type, website_url, application_url, region, fit_score, verification_status, status)
     VALUES ($1,$2,$3,$4,$5,'Ozarks',$6,'verified_source','needs_review')
     ON CONFLICT (name, COALESCE(website_url, '')) DO UPDATE SET
       category=EXCLUDED.category,
       application_url=COALESCE(EXCLUDED.application_url, partner_prospects.application_url),
       fit_score=GREATEST(partner_prospects.fit_score, EXCLUDED.fit_score),
       verification_status='verified_source', updated_at=NOW()`,
    [target.name, target.category, target.type, target.url, target.apply, target.fit]
  );

  // Feed the existing executor. It will safely stop at CAPTCHA/MFA/login walls,
  // required verification, or any required human attestation.
  await pool.query(
    `INSERT INTO opsbot_affiliate_applications
      (program_name, category, commission_rate, apply_url, application_text, status, created_at)
     SELECT $1,$2,NULL,$3,$4,'queued',NOW()
     WHERE NOT EXISTS (
       SELECT 1 FROM opsbot_affiliate_applications WHERE program_name=$1
     )`,
    [target.name, target.category, target.apply, copy]
  );
}

async function run() {
  if (process.env.PARTNER_AI_ENABLED === 'false') return;
  for (const target of TARGETS) {
    try { await upsertTarget(target); console.log(`[PartnerAI] queued/verified: ${target.name}`); }
    catch (err) { console.error(`[PartnerAI] ${target.name}:`, err.message); }
  }
  console.log(`[PartnerAI] cycle complete; OpenAI=${OPENAI_HOST ? 'enabled' : 'fallback-copy'}`);
}

function start() {
  if (process.env.PARTNER_AI_ENABLED === 'false') return;
  run().catch(err => console.error('[PartnerAI] initial cycle:', err.message));
  const timer = setInterval(() => run().catch(err => console.error('[PartnerAI] cycle:', err.message)), INTERVAL_MS);
  if (timer.unref) timer.unref();
}

module.exports = { start, run, TARGETS };