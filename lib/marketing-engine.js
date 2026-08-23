/**
 * OzarkRoost Marketing Engine
 * Adaptive provider/model selection, failure isolation, and daily campaigns.
 *
 * Social publishing: when BUFFER_API_KEY and BUFFER_SOCIAL_PUBLISH=true are
 * configured, the engine publishes one campaign post per connected Facebook,
 * TikTok, and X channel through Buffer. The API key is read only from the
 * server environment and is never logged.
 */
require('dotenv').config();
const { OpenAI } = require('openai');
const pool = require('../db/index');
const fs = require('fs').promises;
const path = require('path');

const SITE_NAME = 'OzarkRoost';
const SITE_URL = String(process.env.SITE_URL || process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || `http://localhost:${process.env.PORT || 3000}`).replace(/\/$/, '');
const GROQ_BASE = 'https://api.groq.com/openai/v1';
const BUFFER_API_URL = 'https://api.buffer.com';

const clients = [];
if (process.env.GROQ_API_KEY) clients.push({ name: 'groq', client: new OpenAI({ apiKey: process.env.GROQ_API_KEY, baseURL: GROQ_BASE }), preferred: process.env.GROQ_MODEL || 'openai/gpt-oss-120b' });
if (process.env.OPENAI_API_KEY) clients.push({ name: 'openai', client: new OpenAI({ apiKey: process.env.OPENAI_API_KEY }), preferred: process.env.OPENAI_MODEL || 'gpt-4o-mini' });

let active = null;
let modelCache = new Map();

async function resolveModel(entry) {
  const cached = modelCache.get(entry.name);
  if (cached) return cached;
  try {
    const result = await entry.client.models.list();
    const ids = new Set((result.data || []).map(m => m.id));
    if (ids.has(entry.preferred)) {
      modelCache.set(entry.name, entry.preferred);
      return entry.preferred;
    }
    const candidates = entry.name === 'groq'
      ? ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'llama-3.3-70b-versatile']
      : ['gpt-4o-mini', 'gpt-4.1-mini', 'gpt-4.1'];
    const fallback = candidates.find(id => ids.has(id)) || [...ids][0];
    if (!fallback) throw new Error(`No usable ${entry.name} models returned`);
    modelCache.set(entry.name, fallback);
    console.log(`[AI] ${entry.name}: ${entry.preferred} unavailable; adapted to ${fallback}`);
    return fallback;
  } catch (err) {
    console.warn(`[AI] ${entry.name} model discovery unavailable: ${err.message}`);
    return entry.preferred;
  }
}

async function aiGenerate(systemPrompt, userPrompt, maxTokens = 800) {
  if (!clients.length) throw new Error('No AI provider configured');
  const ordered = active ? [active, ...clients.filter(c => c !== active)] : clients;
  let lastError;
  for (const entry of ordered) {
    try {
      const model = await resolveModel(entry);
      const response = await entry.client.chat.completions.create({
        model,
        temperature: 0.7,
        max_tokens: maxTokens,
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
      });
      active = entry;
      return response.choices?.[0]?.message?.content?.trim() || '';
    } catch (err) {
      lastError = err;
      console.warn(`[AI] ${entry.name}/${entry.preferred} failed: ${err.status || ''} ${err.message}`);
      modelCache.delete(entry.name);
    }
  }
  throw lastError || new Error('All AI providers failed');
}

async function safeDb(label, fn) {
  try { return await fn(); }
  catch (err) { console.error(`[Marketing:${label}] skipped: ${err.message}`); return null; }
}

async function bufferRequest(query, variables = {}) {
  const key = process.env.BUFFER_API_KEY;
  if (!key) throw new Error('BUFFER_API_KEY is not configured');
  const response = await fetch(BUFFER_API_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.errors?.length) {
    const message = data.errors?.map(e => e.message).join('; ') || `Buffer HTTP ${response.status}`;
    throw new Error(message);
  }
  return data.data;
}

async function publishToBuffer(posts) {
  if (process.env.BUFFER_SOCIAL_PUBLISH !== 'true') return { published: 0, skipped: 'BUFFER_SOCIAL_PUBLISH is not true' };
  if (!process.env.BUFFER_API_KEY) return { published: 0, skipped: 'BUFFER_API_KEY is not configured' };

  const orgData = await bufferRequest(`query { account { organizations { id name } } }`);
  const organization = orgData?.account?.organizations?.[0];
  if (!organization) throw new Error('No Buffer organization available');

  const channelData = await bufferRequest(`query { channels(input: { organizationId: "${organization.id}" }) { id name service } }`);
  const channels = channelData?.channels || [];
  const targets = new Map();
  for (const channel of channels) {
    const service = String(channel.service || '').toLowerCase();
    if (['facebook', 'twitter', 'tiktok'].includes(service) && !targets.has(service)) targets.set(service, channel);
  }

  let published = 0;
  for (const [service, text] of Object.entries(posts)) {
    const channel = targets.get(service);
    if (!channel || !text) {
      console.warn(`[Marketing:Social] Buffer channel unavailable for ${service}`);
      continue;
    }
    const mutation = `mutation CreateOzarkRoostPost($input: CreatePostInput!) {
      createPost(input: $input) {
        ... on PostActionSuccess { post { id text dueAt } }
        ... on MutationError { message }
      }
    }`;
    const data = await bufferRequest(mutation, {
      input: {
        text,
        channelId: channel.id,
        schedulingType: 'automatic',
        mode: 'addToQueue',
        aiAssisted: true,
        source: 'ozarkroost-marketing-engine',
      },
    });
    const result = data?.createPost;
    if (result?.post?.id) {
      published += 1;
      console.log(`[Marketing:Social] Buffer queued ${service} post ${result.post.id}`);
    } else {
      throw new Error(`Buffer rejected ${service}: ${result?.message || 'unknown error'}`);
    }
  }
  return { published };
}

async function generateSEOContent() {
  console.log('[Marketing:SEO] Generating SEO content...');
  const pages = ['home', 'listings', 'adventures', 'operators', 'referral'];
  for (const page of pages) {
    const content = await aiGenerate('You are an SEO expert. Write concise click-driving meta descriptions.', `Write 3 meta description variations for the ${page} page of ${SITE_NAME}. Focus on Buffalo River cabins, Ozark adventures and Arkansas travel.`);
    await safeDb('SEO', () => pool.query(`INSERT INTO marketing_seo_content (page_type, content_type, content, created_at) VALUES ($1,'meta_description',$2,NOW())`, [page, content]));
  }
  console.log('[Marketing:SEO] complete');
}

async function generateSitemap() {
  const listings = await safeDb('Sitemap', () => pool.query("SELECT id, property_name FROM listing_submissions WHERE payment_status = 'paid' ORDER BY id DESC"));
  const paths = ['/', '/listings', '/adventures', '/operators', '/referral', '/list-your-cabin', '/faq'];
  for (const row of listings?.rows || []) paths.push(`/listings/${row.id}`);
  const body = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map(p => `<url><loc>${SITE_URL}${p}</loc><changefreq>weekly</changefreq></url>`).join('')}</urlset>`;
  await fs.writeFile(path.join(__dirname, '../public/sitemap.xml'), body);
  await fs.writeFile(path.join(__dirname, '../public/robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`);
  console.log(`[Marketing:SEO] sitemap/robots updated for ${SITE_URL}`);
}

async function generateBlogPost() {
  const topics = ['Hidden Gems Along Buffalo River', 'Ultimate Buffalo National River Kayaking Guide', 'Best Ozark Cabin Getaways', 'Fishing Near Buffalo River', 'Family Adventures in the Ozarks', 'Romantic Arkansas Cabin Escapes'];
  const topic = topics[Math.floor(Math.random() * topics.length)];
  const post = await aiGenerate('You are an Arkansas Ozarks travel writer. Create useful, accurate SEO content.', `Write an 800-word article titled "${topic}" for ${SITE_NAME}. Include practical advice, natural booking calls-to-action and keywords Buffalo River cabins, Ozark vacation and Arkansas cabin rental.`);
  await safeDb('Content', () => pool.query(`INSERT INTO marketing_content (content_type,title,body,status,created_at) VALUES ('blog_post',$1,$2,'draft',NOW())`, [topic, post]));
  return { topic, post };
}

async function generateSocialPosts() {
  const generated = {};
  for (const platform of ['twitter', 'facebook', 'instagram']) {
    const posts = await aiGenerate(`You are a ${platform} travel social manager.`, `Create 5 ${platform} posts for ${SITE_NAME}. Promote Buffalo River cabins, Ozark adventures and ${SITE_URL}. Return JSON when possible.`);
    await safeDb('Social', () => pool.query(`INSERT INTO marketing_social_posts (platform,content,scheduled_for,status,created_at) VALUES ($1,$2,NOW()+INTERVAL '1 day','pending',NOW())`, [platform, posts]));
    if (platform === 'twitter') generated.twitter = `The Ozarks are calling. 🏕️🌲\n\nDiscover cabins, Buffalo River adventures, camping and hidden gems with OzarkRoost.\n\n${SITE_URL}\n\n#Ozarks #ArkansasTravel #BuffaloRiver #OzarkRoost`;
    if (platform === 'facebook') generated.facebook = `🏕️ Your next Ozarks escape is waiting.\n\nDiscover cabins, Buffalo River adventures, camping and hidden gems with OzarkRoost.\n\nExplore: ${SITE_URL}\n\n#Ozarks #Arkansas #BuffaloRiver #ArkansasTravel #OzarkRoost`;
  }

  // Buffer currently supports Facebook, TikTok and X. TikTok is intentionally
  // added as a launch post here rather than fabricating a video asset.
  generated.tiktok = `POV: you just found your next Ozarks weekend 🏕️🌲\n\nCabins + Buffalo River adventures + hidden gems.\n\nOzarkRoost — plan your escape. ${SITE_URL}\n\n#Ozarks #ArkansasTravel #BuffaloRiver #CabinLife #TravelTok`;

  try {
    const result = await publishToBuffer(generated);
    console.log(`[Marketing:Social] Buffer campaign result: published=${result.published || 0}${result.skipped ? ` skipped=${result.skipped}` : ''}`);
  } catch (err) {
    console.error(`[Marketing:Social] Buffer publish failed: ${err.message}`);
  }
}

async function runOutreachCampaign() {
  const templates = [
    ['cabin_owner', 'Write a concise partnership email to Buffalo River cabin owners explaining how listing with OzarkRoost can help generate bookings.'],
    ['tourism_board', 'Write a professional collaboration email to an Arkansas tourism organization introducing OzarkRoost.'],
    ['directory', 'Write a concise request for a travel directory to list OzarkRoost as a Buffalo River vacation resource.'],
  ];
  for (const [type, prompt] of templates) {
    const email = await aiGenerate('You are a partnership manager. Be truthful, concise and professional.', prompt);
    await safeDb('Outreach', () => pool.query(`INSERT INTO marketing_outreach (outreach_type,template,status,created_at) VALUES ($1,$2,'ready',NOW())`, [type, email]));
  }
}

async function generateLandingPage(keyword) {
  const page = await aiGenerate('You are a conversion-focused travel copywriter.', `Create landing-page copy for ${SITE_NAME} targeting "${keyword}". Include headline, benefits, FAQs, trust signals and clear booking/listing CTAs. Avoid invented reviews or claims.`);
  await safeDb('Landing', () => pool.query(`INSERT INTO marketing_content (content_type,title,body,status,created_at) VALUES ('landing_page',$1,$2,'draft',NOW())`, [keyword, page]));
}

async function runFullCampaign() {
  console.log('[Marketing] Campaign starting — adaptive AI + failure isolation enabled');
  const jobs = [
    ['SEO', generateSEOContent], ['Sitemap', generateSitemap], ['Blog', generateBlogPost],
    ['Social', generateSocialPosts], ['Outreach', runOutreachCampaign],
    ['Landing: Buffalo River cabins', () => generateLandingPage('Buffalo River cabins')],
    ['Landing: Ozark vacation rentals', () => generateLandingPage('Ozark vacation rentals')],
    ['Landing: Arkansas cabin rental', () => generateLandingPage('Arkansas cabin rental')],
  ];
  for (const [label, job] of jobs) {
    try { await job(); console.log(`[Marketing] ${label} complete`); }
    catch (err) { console.error(`[Marketing] ${label} isolated failure: ${err.message}`); }
  }
  console.log('[Marketing] Campaign finished');
}

function start() {
  console.log(`[Marketing] 🚀 ${SITE_NAME} adaptive marketing engine starting`);
  if (!clients.length) console.warn('[Marketing] No AI credentials configured; engine will remain idle until configured.');
  if (process.env.BUFFER_SOCIAL_PUBLISH === 'true') console.log('[Marketing:Social] Buffer publishing enabled');
  runFullCampaign().catch(err => console.error('[Marketing] initial campaign failed:', err.message));
  setInterval(() => runFullCampaign().catch(err => console.error('[Marketing] scheduled campaign failed:', err.message)), 24 * 60 * 60_000).unref();
  console.log('[Marketing] ✅ Armed — daily self-adapting campaigns');
}

module.exports = { start, runFullCampaign, generateBlogPost, generateSocialPosts, generateSEOContent, generateLandingPage, publishToBuffer };
