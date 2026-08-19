/**
 * Site Health Superagent
 * Probes critical pages, tracks errors, self-heals safe issues.
 * Uses the local Render process by default so APP_URL typos/DNS cannot
 * make a healthy service report itself dead.
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const pool = require('../db/index');
const errorTracker = require('../middleware/error-tracker');

const PROBE_INTERVAL_MS = Number(process.env.SITE_HEALTH_INTERVAL_MS) || 3 * 60 * 1000;
const MEMORY_WARN_MB = Number(process.env.SITE_HEALTH_MEMORY_MB) || 450;
const ERROR_RATE_WARN = Number(process.env.SITE_HEALTH_ERROR_RATE) || 0.15;
const PROBE_CONCURRENCY = Math.max(1, Number(process.env.SITE_HEALTH_CONCURRENCY) || 2);
const CRITICAL_PATHS = [
  '/health','/','/listings','/adventures','/faq','/sitemap.xml','/robots.txt',
  '/guides/hot-tub-cabins','/guides/pet-friendly-cabins','/guides/treehouse-rentals',
  '/guides/glamping-ozarks','/guides/luxury-cabins','/guides/ozarks-road-trip',
  '/guides/buffalo-river-cabins','/guides/trip-planner',
];
const GUIDE_VIEWS_DIR = path.join(__dirname, '..', 'views', 'guides');
let started = false;
let timer = null;
let lastRun = null;
let lastReport = null;
let consecutiveDbFails = 0;
let healActions = [];

function envEnabled() {
  if (process.env.SITE_HEALTH_ENABLED === 'false') return false;
  if (process.env.SITE_HEALTH_ENABLED === 'true') return true;
  return process.env.NODE_ENV === 'production';
}

function baseUrl() {
  const explicit = process.env.SITE_HEALTH_BASE_URL;
  if (explicit) return String(explicit).replace(/\/$/, '');
  return `http://127.0.0.1:${process.env.PORT || 3000}`;
}

function pushHeal(action, detail) {
  const entry = { at: new Date().toISOString(), action, detail };
  healActions.unshift(entry);
  if (healActions.length > 40) healActions.length = 40;
  console.log(`[SiteHealth] heal: ${action} — ${detail}`);
  return entry;
}

async function persistIncident(severity, message, meta = {}) {
  try {
    await pool.query(
      `INSERT INTO agent_incidents (agent, severity, message, meta) VALUES ($1, $2, $3, $4)`,
      ['site-health', severity, String(message).slice(0, 1000), JSON.stringify(meta)]
    );
  } catch (err) {
    if (!/relation .* does not exist/i.test(err.message || '')) console.warn('[SiteHealth] incident persist skipped:', err.message);
  }
}

function probeUrl(url, timeoutMs = 8000) {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    let settled = false;
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, { timeout: timeoutMs, headers: { 'User-Agent': 'OzarkSiteHealth/1.1' } }, (res) => {
      res.resume();
      res.on('end', () => {
        if (settled) return;
        settled = true;
        resolve({ ok: res.statusCode >= 200 && res.statusCode < 400, status: res.statusCode, ms: Date.now() - startedAt });
      });
    });
    req.on('timeout', () => {
      req.destroy();
      if (!settled) { settled = true; resolve({ ok: false, status: 0, ms: Date.now() - startedAt, error: 'timeout' }); }
    });
    req.on('error', (err) => {
      if (!settled) { settled = true; resolve({ ok: false, status: 0, ms: Date.now() - startedAt, error: err.message }); }
    });
  });
}

async function probePaths(base) {
  const results = [];
  let next = 0;
  async function worker() {
    while (true) {
      const index = next++;
      if (index >= CRITICAL_PATHS.length) return;
      const p = CRITICAL_PATHS[index];
      const result = await probeUrl(`${base}${p}`);
      results[index] = { path: p, ...result };
      if (!result.ok) console.warn(`[SiteHealth] probe ${p} failed: status=${result.status || 0} error=${result.error || 'none'} ms=${result.ms}`);
    }
  }
  await Promise.all(Array.from({ length: Math.min(PROBE_CONCURRENCY, CRITICAL_PATHS.length) }, worker));
  return results;
}

async function checkDatabase() {
  try {
    const t0 = Date.now();
    await pool.query('SELECT 1 AS ok');
    consecutiveDbFails = 0;
    return { ok: true, ms: Date.now() - t0 };
  } catch (err) {
    consecutiveDbFails += 1;
    return { ok: false, error: err.message, fails: consecutiveDbFails };
  }
}

function checkGuideTemplates() {
  const expected = ['hot-tub-cabins.ejs','pet-friendly-cabins.ejs','treehouse-rentals.ejs','glamping-ozarks.ejs','luxury-cabins.ejs','ozarks-road-trip.ejs','buffalo-river-cabins.ejs','trip-planner.ejs'];
  const missing = expected.filter((file) => !fs.existsSync(path.join(GUIDE_VIEWS_DIR, file)));
  return { ok: missing.length === 0, missing };
}

function checkEnv() {
  const warnings = [];
  if (!process.env.DATABASE_URL) warnings.push('DATABASE_URL missing');
  if (!process.env.APP_URL && process.env.NODE_ENV === 'production') warnings.push('APP_URL missing in production (canonical/sitemap may be wrong)');
  const affKeys = ['AFF_STAY22_URL','AFF_HIPCAMP_URL','AFF_VIATOR_URL','AFF_REI_URL','AFF_GETYOURGUIDE_URL'];
  if (affKeys.every((k) => !process.env[k])) warnings.push('No AFF_* tracked URLs set — using default partner links');
  return { ok: warnings.length === 0, warnings };
}

function memorySnapshot() {
  const mem = process.memoryUsage();
  const heapMb = Math.round(mem.heapUsed / 1024 / 1024);
  return { heap_mb: heapMb, rss_mb: Math.round(mem.rss / 1024 / 1024), warn: heapMb >= MEMORY_WARN_MB };
}

async function runHeals(report) {
  const actions = [];
  if (report.memory?.warn && typeof global.gc === 'function') {
    try { global.gc(); actions.push(pushHeal('gc', `heap was ${report.memory.heap_mb}MB`)); } catch {}
  } else if (report.memory?.warn) actions.push(pushHeal('memory-warn', `heap ${report.memory.heap_mb}MB — consider restart or lower load`));
  if (report.database && !report.database.ok && report.database.fails >= 3) {
    errorTracker.reset();
    actions.push(pushHeal('error-buffer-reset', 'DB failed 3+ times; cleared error ring buffer'));
    await persistIncident('critical', 'Database unreachable', report.database);
  }
  if (report.templates && !report.templates.ok) {
    actions.push(pushHeal('template-gap', `missing: ${report.templates.missing.join(', ')}`));
    await persistIncident('warning', 'Guide templates missing', { missing: report.templates.missing });
  }
  if (report.errors && report.errors.rate >= ERROR_RATE_WARN && report.errors.total_5xx >= 10) {
    actions.push(pushHeal('error-rate-high', `rate=${report.errors.rate}`));
    await persistIncident('warning', 'Elevated 5xx rate', report.errors);
  }
  const failed = (report.probes || []).filter((p) => !p.ok);
  if (failed.length) {
    await persistIncident('warning', `${failed.length} path probe(s) failed`, { paths: failed.map((f) => f.path), details: failed });
    actions.push(pushHeal('probe-fail', failed.map((f) => `${f.path}(${f.status || f.error || 'unknown'})`).join(', ')));
  }
  return actions;
}

async function runScan() {
  const startedAt = Date.now();
  const base = baseUrl();
  const [database, probes] = await Promise.all([checkDatabase(), probePaths(base)]);
  const templates = checkGuideTemplates();
  const env = checkEnv();
  const memory = memorySnapshot();
  const errors = errorTracker.getStats();
  const probeFails = probes.filter((p) => !p.ok).length;
  let status = 'healthy';
  if (!database.ok || probeFails > 3 || (errors.rate >= ERROR_RATE_WARN && errors.total_5xx >= 10)) status = 'degraded';
  if (!database.ok && consecutiveDbFails >= 5) status = 'critical';
  const report = {
    agent: 'site-health', status, timestamp: new Date().toISOString(), duration_ms: Date.now() - startedAt,
    uptime_s: Math.floor(process.uptime()), base_url: base, database, probes,
    probe_summary: { total: probes.length, ok: probes.length - probeFails, failed: probeFails },
    templates, env, memory, errors, recent_heals: healActions.slice(0, 10),
  };
  report.heals_this_run = await runHeals(report);
  lastRun = report.timestamp;
  lastReport = report;
  try { await pool.query(`INSERT INTO agent_health_snapshots (agent, status, report) VALUES ($1, $2, $3)`, ['site-health', status, JSON.stringify(report)]); } catch {}
  console.log(`[SiteHealth] ${status} — probes ${report.probe_summary.ok}/${report.probe_summary.total}, db=${database.ok ? 'ok' : 'fail'}, base=${base}`);
  return report;
}

function getStatus() {
  return { enabled: envEnabled(), started, last_run: lastRun, report: lastReport, heal_log: healActions.slice(0, 20), error_stats: errorTracker.getStats() };
}

function start(options = {}) {
  if (started) return getStatus();
  if (!envEnabled() && !options.force) { console.log('[SiteHealth] disabled (set SITE_HEALTH_ENABLED=true to arm)'); return getStatus(); }
  started = true;
  console.log(`[SiteHealth] armed — interval ${PROBE_INTERVAL_MS}ms, concurrency ${PROBE_CONCURRENCY}, base ${baseUrl()}`);
  setTimeout(() => runScan().catch((err) => console.error('[SiteHealth] scan error:', err.message)), options.initialDelayMs ?? 15000);
  timer = setInterval(() => runScan().catch((err) => console.error('[SiteHealth] scan error:', err.message)), PROBE_INTERVAL_MS);
  if (typeof timer.unref === 'function') timer.unref();
  return getStatus();
}

function stop() { if (timer) clearInterval(timer); timer = null; started = false; }

module.exports = { start, stop, runScan, getStatus, CRITICAL_PATHS };
