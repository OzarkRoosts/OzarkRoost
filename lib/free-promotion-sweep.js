/**
 * OzarkRoost Free Promotion Sweep
 *
 * Finds and prioritizes legitimate free/organic promotion surfaces for the
 * OzarkRoost brand. It prepares compliant listing copy and tracks the work.
 * It deliberately does NOT bypass CAPTCHAs, create fake accounts, scrape
 * private data, or mass-submit spam. Sources with official APIs can be wired
 * to a publisher separately.
 */
const pool = require('../db/index');
const { OpenAI } = require('openai');

const SITE_NAME = 'OzarkRoost';
const SITE_URL = String(process.env.SITE_URL || process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || '').replace(/\/$/, '');

const FREE_SOURCES = [
  ['Google Business Profile', 'https://www.google.com/business/', 'search', 100],
  ['Bing Places', 'https://www.bingplaces.com/', 'search', 95],
  ['Apple Business Connect', 'https://businessconnect.apple.com/', 'search', 90],
  ['Yelp Business', 'https://biz.yelp.com/', 'local', 85],
  ['Tripadvisor', 'https://www.tripadvisor.com/Owners', 'travel', 85],
  ['Facebook Page', 'https://www.facebook.com/pages/create/', 'social', 80],
  ['Nextdoor Business', 'https://business.nextdoor.com/', 'local', 75],
];

function buildBrandCopy() {
  return {
    name: SITE_NAME,
    website: SITE_URL,
    shortDescription: 'OzarkRoost is a travel guide for Buffalo River and Ozarks stays, adventures, restaurants, attractions, guides and local businesses.',
    longDescription: 'OzarkRoost helps travelers discover the Ozarks, including Buffalo River cabins, outdoor adventures, restaurants, attractions, guides and other local businesses. Explore the region and connect with the places that make an Ozark trip worth taking.',
    tags: ['Ozark travel', 'Buffalo River', 'Arkansas travel', 'Ozark cabins', 'Ozark adventures', 'Buffalo National River']
  };
}

async function upsertSource([name, url, category, priority]) {
  await pool.query(`
    INSERT INTO marketing_directory_submissions
      (directory_name, directory_url, category, submission_method, eligibility, priority, last_checked_at, notes)
    VALUES ($1,$2,$3,'manual','unknown',$4,NOW(),'Free/organic promotion target. Verify current eligibility before submission.')
    ON CONFLICT (directory_url) DO UPDATE SET
      directory_name = EXCLUDED.directory_name,
      category = EXCLUDED.category,
      priority = EXCLUDED.priority,
      last_checked_at = NOW()
  `, [name, url, category, priority]);
}

async function generateSubmissionCopy() {
  const brand = buildBrandCopy();
  if (!process.env.OPENAI_API_KEY && !process.env.GROQ_API_KEY) return brand;
  const apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;
  const baseURL = process.env.GROQ_API_KEY ? 'https://api.groq.com/openai/v1' : undefined;
  const client = new OpenAI({ apiKey, ...(baseURL ? { baseURL } : {}) });
  const model = process.env.GROQ_API_KEY ? (process.env.GROQ_MODEL || 'openai/gpt-oss-20b') : (process.env.OPENAI_MODEL || 'gpt-4o-mini');
  try {
    const r = await client.chat.completions.create({
      model,
      temperature: 0.4,
      max_tokens: 500,
      messages: [
        { role: 'system', content: 'Write truthful business-directory copy. Never invent reviews, awards, traffic, partnerships, rankings, or customer counts.' },
        { role: 'user', content: `Create a 250-word directory description plus 10 comma-separated tags for ${brand.name}. Website: ${brand.website}. Focus on Buffalo River and Ozarks travel. Keep it factual.` }
      ]
    });
    return { ...brand, aiCopy: r.choices?.[0]?.message?.content?.trim() || '' };
  } catch (err) {
    console.warn(`[Marketing:FreeSweep] copy generation skipped: ${err.message}`);
    return brand;
  }
}

async function runFreePromotionSweep() {
  console.log('[Marketing:FreeSweep] Scanning free/organic promotion surfaces...');
  for (const source of FREE_SOURCES) {
    try { await upsertSource(source); }
    catch (err) { console.warn(`[Marketing:FreeSweep] ${source[0]} skipped: ${err.message}`); }
  }
  const copy = await generateSubmissionCopy();
  await pool.query(`
    INSERT INTO marketing_outreach (outreach_type, template, status, created_at)
    VALUES ('free_promotion_copy', $1, 'ready', NOW())
  `, [JSON.stringify(copy)]);
  await pool.query(`
    INSERT INTO marketing_analytics (campaign_type, metric_name, metric_value)
    VALUES ('free_promotion', 'opportunities_tracked', $1)
  `, [FREE_SOURCES.length]);
  console.log(`[Marketing:FreeSweep] ${FREE_SOURCES.length} free/organic opportunities tracked and copy prepared.`);
  return { opportunities: FREE_SOURCES.length, copy };
}

module.exports = { runFreePromotionSweep, buildBrandCopy };
