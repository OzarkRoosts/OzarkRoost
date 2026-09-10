'use strict';

const https = require('https');
const pool = require('../db/index');

const PLATFORMS = new Set(['facebook', 'x', 'tiktok']);
const enabled = process.env.SOCIAL_GROWTH_ENABLED === 'true';

function configured(platform) {
  if (platform === 'x') return Boolean(process.env.X_ACCESS_TOKEN && process.env.X_USER_ID);
  if (platform === 'facebook') return Boolean(process.env.FACEBOOK_PAGE_ACCESS_TOKEN && process.env.FACEBOOK_PAGE_ID);
  if (platform === 'tiktok') return process.env.TIKTOK_SOCIAL_ENABLED === 'true' && Boolean(process.env.TIKTOK_ACCESS_TOKEN);
  return false;
}

function publicStatus() {
  return Object.fromEntries([...PLATFORMS].map((platform) => [platform, {
    enabled: platform === 'tiktok' ? process.env.TIKTOK_SOCIAL_ENABLED === 'true' : enabled,
    configured: configured(platform),
    authorization_required: !configured(platform)
  }]));
}

function requestJson(url, { method = 'POST', headers = {}, body, timeout = 20000 } = {}) {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const payload = body === undefined ? null : JSON.stringify(body);
    const req = https.request({
      hostname: target.hostname,
      path: `${target.pathname}${target.search}`,
      method,
      port: target.port || 443,
      headers: { ...(payload ? { 'content-type': 'application/json', 'content-length': Buffer.byteLength(payload) } : {}), ...headers },
      timeout
    }, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let parsed = null;
        try { parsed = data ? JSON.parse(data) : null; } catch (_) {}
        if (res.statusCode >= 200 && res.statusCode < 300) return resolve(parsed || {});
        const err = new Error(`social provider HTTP ${res.statusCode}`);
        err.statusCode = res.statusCode;
        err.providerBody = parsed || data.slice(0, 1000);
        reject(err);
      });
    });
    req.on('timeout', () => req.destroy(new Error('social provider timeout')));
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function trackedUrl(raw, source, campaign = 'social') {
  if (!raw) return raw;
  try {
    const url = new URL(raw);
    url.searchParams.set('utm_source', source);
    url.searchParams.set('utm_medium', 'social');
    url.searchParams.set('utm_campaign', campaign);
    return url.toString();
  } catch (_) { return raw; }
}

async function publishX(job) {
  if (!configured('x')) throw new Error('X is not authorized/configured');
  const text = [job.content, trackedUrl(job.link_url, 'x')].filter(Boolean).join('\n\n');
  return requestJson('https://api.x.com/2/tweets', {
    headers: { authorization: `Bearer ${process.env.X_ACCESS_TOKEN}` },
    body: { text: text.slice(0, 25000) }
  });
}

async function publishFacebook(job) {
  if (!configured('facebook')) throw new Error('Facebook is not authorized/configured');
  const params = new URLSearchParams({ access_token: process.env.FACEBOOK_PAGE_ACCESS_TOKEN, message: job.content });
  const link = trackedUrl(job.link_url, 'facebook');
  if (link) params.set('link', link);
  return requestJson(`https://graph.facebook.com/${encodeURIComponent(process.env.FACEBOOK_GRAPH_VERSION || 'v23.0')}/${encodeURIComponent(process.env.FACEBOOK_PAGE_ID)}/feed`, { body: Object.fromEntries(params) });
}

async function publishTikTok(job) {
  if (!configured('tiktok')) throw new Error('TikTok is not authorized/configured');
  if (!job.media_url) throw new Error('TikTok direct publishing requires media_url');
  const payload = {
    post_info: { title: job.content.slice(0, 2200), privacy_level: process.env.TIKTOK_PRIVACY_LEVEL || 'PUBLIC_TO_EVERYONE', disable_comment: false, is_aigc: false },
    source_info: { source: 'PULL_FROM_URL', video_url: job.media_url }
  };
  return requestJson('https://open.tiktokapis.com/v2/post/publish/video/init/', {
    headers: { authorization: `Bearer ${process.env.TIKTOK_ACCESS_TOKEN}` },
    body: payload
  });
}

async function publish(job) {
  if (!PLATFORMS.has(job.platform)) throw new Error('Unsupported social platform');
  if (job.platform === 'x') return publishX(job);
  if (job.platform === 'facebook') return publishFacebook(job);
  return publishTikTok(job);
}

async function audit(jobId, platform, action, outcome, detail = {}) {
  try { await pool.query('INSERT INTO social_publish_audit (job_id, platform, action, outcome, detail) VALUES ($1,$2,$3,$4,$5)', [jobId, platform, action, outcome, JSON.stringify(detail)]); } catch (err) { console.error('[social audit]', err.message); }
}

async function queueJob({ platform, content, mediaUrl = null, linkUrl = null, scheduledFor = new Date(), idempotencyKey }) {
  if (!PLATFORMS.has(platform)) throw new Error('Unsupported social platform');
  if (!content || !idempotencyKey) throw new Error('content and idempotencyKey are required');
  const result = await pool.query(`INSERT INTO social_publish_jobs (platform, content, media_url, link_url, scheduled_for, idempotency_key) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (idempotency_key) DO UPDATE SET updated_at = NOW() RETURNING *`, [platform, content, mediaUrl, linkUrl, scheduledFor, idempotencyKey]);
  await audit(result.rows[0].id, platform, 'queue', 'accepted');
  return result.rows[0];
}

async function publishJob(job) {
  await pool.query('UPDATE social_publish_jobs SET status=$1, attempts=attempts+1, updated_at=NOW() WHERE id=$2', ['publishing', job.id]);
  await audit(job.id, job.platform, 'publish', 'attempted');
  try {
    const response = await publish(job);
    const externalPostId = response?.data?.id || response?.data?.publish_id || response?.id || null;
    await pool.query('UPDATE social_publish_jobs SET status=$1, external_post_id=$2, published_at=NOW(), last_error=NULL, updated_at=NOW() WHERE id=$3', ['published', externalPostId, job.id]);
    await audit(job.id, job.platform, 'publish', 'published', { external_post_id: externalPostId });
    return { ok: true, externalPostId, response };
  } catch (err) {
    await pool.query('UPDATE social_publish_jobs SET status=$1, last_error=$2, updated_at=NOW() WHERE id=$3', ['failed', err.message, job.id]);
    await audit(job.id, job.platform, 'publish', 'failed', { error: err.message });
    return { ok: false, error: err.message };
  }
}

async function processDueJobs(limit = 5) {
  if (!enabled) return { processed: 0, disabled: true };
  const jobs = await pool.query(`SELECT * FROM social_publish_jobs WHERE status='queued' AND scheduled_for <= NOW() ORDER BY scheduled_for ASC LIMIT $1`, [limit]);
  let processed = 0;
  for (const job of jobs.rows) { await publishJob(job); processed += 1; }
  return { processed, disabled: false };
}

function start() {
  if (!enabled) return;
  const interval = Number(process.env.SOCIAL_GROWTH_INTERVAL_MS || 300000);
  processDueJobs().catch(err => console.error('[social-growth] initial worker error:', err.message));
  setInterval(() => processDueJobs().catch(err => console.error('[social-growth] worker error:', err.message)), interval).unref();
}

module.exports = { PLATFORMS, configured, publicStatus, trackedUrl, queueJob, publishJob, processDueJobs, start };
