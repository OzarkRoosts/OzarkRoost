/**
 * Affiliate Ops Superagent
 * Scans guides for monetization gaps, scores opportunities,
 * builds a living ops plan snapshot, integrates with affiliate-ai-engine.
 *
 * Usage:
 *   const ops = require('./affiliate-ops-agent');
 *   ops.start();
 *   ops.getPlan();
 */

const fs = require('fs');
const path = require('path');
const pool = require('../db/index');
const affiliateLinks = require('./affiliate-links');

const SCAN_INTERVAL_MS = Number(process.env.AFFILIATE_OPS_INTERVAL_MS) || 60 * 60 * 1000;
const GUIDES_DIR = path.join(__dirname, '..', 'views', 'guides');

let started = false;
let timer = null;
let lastPlan = null;
let lastScanAt = null;

/** Page inventory + intended affiliate categories */
const PAGE_CATALOG = [
  { path: '/', type: 'landing', potential: ['cabins', 'activities', 'rv'], widgets: ['stay22', 'vrbo'] },
  { path: '/listings', type: 'listing', potential: ['cabins', 'rv'], widgets: ['stay22', 'vrbo', 'booking'] },
  { path: '/adventures', type: 'guide', potential: ['activities', 'tours'], widgets: ['getyourguide', 'rei'] },
  { path: '/faq', type: 'support', potential: ['cabins', 'activities'], widgets: ['stay22'] },
  { path: '/guides/about-the-ozarks', type: 'guide', potential: ['cabins', 'activities', 'rv'], widgets: ['stay22', 'getyourguide'] },
  { path: '/guides/buffalo-river-cabins', type: 'guide', potential: ['cabins', 'activities'], widgets: ['stay22', 'vrbo'] },
  { path: '/guides/buffalo-river-kayaking', type: 'guide', potential: ['activities', 'trails'], widgets: ['getyourguide', 'rei'] },
  { path: '/guides/ozarks-adventures', type: 'guide', potential: ['activities', 'tours'], widgets: ['getyourguide', 'rei'] },
  { path: '/guides/ozarks-camping-rv', type: 'guide', potential: ['rv', 'camping'], widgets: ['hipcamp', 'outdoorsy'] },
  { path: '/guides/hidden-gem-cabins', type: 'guide', potential: ['cabins', 'activities'], widgets: ['stay22', 'vrbo'] },
  { path: '/guides/hot-tub-cabins', type: 'guide', potential: ['cabins'], widgets: ['stay22', 'vrbo'] },
  { path: '/guides/pet-friendly-cabins', type: 'guide', potential: ['cabins'], widgets: ['stay22', 'hipcamp'] },
  { path: '/guides/treehouse-rentals', type: 'guide', potential: ['cabins', 'glamping'], widgets: ['stay22', 'hipcamp'] },
  { path: '/guides/glamping-ozarks', type: 'guide', potential: ['glamping', 'camping'], widgets: ['hipcamp', 'stay22'] },
  { path: '/guides/luxury-cabins', type: 'guide', potential: ['cabins', 'vacations'], widgets: ['stay22', 'booking'] },
  { path: '/guides/ozarks-road-trip', type: 'guide', potential: ['cabins', 'activities', 'trails'], widgets: ['stay22', 'rei', 'getyourguide'] },
  { path: '/guides/trip-planner', type: 'lead-magnet', potential: ['cabins', 'activities', 'rv'], widgets: ['stay22', 'getyourguide'] },
];

const PLATFORM_FOR = {
  cabins: 'stay22',
  rv: 'outdoorsy',
  vacations: 'booking',
  activities: 'getyourguide',
  tours: 'getyourguide',
  trails: 'rei',
  hiking: 'rei',
  camping: 'hipcamp',
  glamping: 'hipcamp',
  experiences: 'getyourguide',
  adventures: 'getyourguide',
};

const COMMISSION = {
  stay22: 0.04,
  hipcamp: 0.08,
  getyourguide: 0.08,
  viator: 0.1,
  rei: 0.05,
  outdoorsy: 0.05,
  vrbo: 0.08,
  booking: 0.05,
};

function envEnabled() {
  if (process.env.AFFILIATE_OPS_ENABLED === 'false') return false;
  if (process.env.AFFILIATE_OPS_ENABLED === 'true') return true;
  return process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'development';
}

function withUtm(url, pagePath, platform) {
  try {
    const u = new URL(url);
    if (!u.searchParams.get('utm_source')) u.searchParams.set('utm_source', 'ozarkroost');
    if (!u.searchParams.get('utm_medium')) u.searchParams.set('utm_medium', 'affiliate');
    u.searchParams.set('utm_campaign', 'ops-agent');
    u.searchParams.set('utm_content', `${platform}${pagePath.replace(/\//g, '_')}`);
    return u.toString();
  } catch {
    return url;
  }
}

function readGuideSource(pagePath) {
  if (!pagePath.startsWith('/guides/')) return null;
  const slug = pagePath.replace('/guides/', '');
  const file = path.join(GUIDES_DIR, `${slug}.ejs`);
  if (!fs.existsSync(file)) return null;
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return null;
  }
}

function detectWidgetsInSource(source) {
  if (!source) return { hasWidgetPartial: false, widgets: [], hasFeatured: false, hasEmail: false };
  const hasWidgetPartial = /affiliate-widget/.test(source);
  const widgets = [];
  const m = source.match(/widgets:\s*\[([^\]]*)\]/);
  if (m) {
    const inner = m[1];
    const keys = inner.match(/'([^']+)'|"([^"]+)"/g) || [];
    for (const k of keys) widgets.push(k.replace(/['"]/g, ''));
  }
  return {
    hasWidgetPartial,
    widgets,
    hasFeatured: /featured-listings/.test(source),
    hasEmail: /email-capture/.test(source),
  };
}

function scoreGap({ page, detected, category, platform }) {
  let priority = 5;
  if (page.path === '/' || page.path === '/listings') priority += 3;
  if (page.path.startsWith('/guides/hot-tub') || page.path.includes('buffalo')) priority += 2;
  if (category === 'cabins') priority += 2;
  if (!detected.hasWidgetPartial) priority += 2;
  if (detected.widgets.length === 0) priority += 1;
  if (!detected.hasEmail && page.type === 'guide') priority += 1;

  // Missing recommended widget
  if (page.widgets?.length && !page.widgets.some((w) => detected.widgets.includes(w))) {
    priority += 1;
  }

  const traffic = page.path === '/' ? 5000 : page.path === '/listings' ? 2000 : 800;
  const conv = category === 'activities' ? 0.08 : 0.05;
  const commission = COMMISSION[platform] || 0.05;
  const estimated_value = Math.round(traffic * conv * 200 * commission) / 100;

  return { priority: Math.min(10, priority), estimated_value };
}

function buildSuggestedText(category, platform) {
  const name = platform.charAt(0).toUpperCase() + platform.slice(1);
  const map = {
    cabins: `Browse ${name} cabins near the Ozarks`,
    rv: `Find RV stays via ${name}`,
    activities: `Book Ozarks activities on ${name}`,
    tours: `Reserve guided tours on ${name}`,
    trails: `Gear up for trails at ${name}`,
    camping: `Find campsites on ${name}`,
    glamping: `Explore glamping on ${name}`,
    vacations: `Plan the trip on ${name}`,
  };
  return map[category] || `Discover more on ${name}`;
}

function envCoverage() {
  const keys = {
    stay22: 'AFF_STAY22_URL',
    hipcamp: 'AFF_HIPCAMP_URL',
    getyourguide: 'AFF_GETYOURGUIDE_URL',
    viator: 'AFF_VIATOR_URL',
    rei: 'AFF_REI_URL',
    outdoorsy: 'AFF_OUTDOORSY_URL',
    vrbo: 'AFF_VRBO_URL',
    booking: 'AFF_BOOKING_URL',
  };
  const report = {};
  for (const [platform, envKey] of Object.entries(keys)) {
    report[platform] = {
      env_key: envKey,
      tracked: Boolean(process.env[envKey]),
      active_url: affiliateLinks.getAffiliateLinks()[platform] || null,
    };
  }
  return report;
}

async function upsertOpportunity(opp) {
  try {
    const existing = await pool.query(
      `SELECT id FROM affiliate_opportunities
       WHERE page_path = $1 AND platform = $2 AND opportunity_type = $3 AND status != 'rejected'
       LIMIT 1`,
      [opp.page_path, opp.platform, opp.opportunity_type]
    );
    if (existing.rows[0]) {
      await pool.query(
        `UPDATE affiliate_opportunities
         SET suggested_text = $1, priority = $2, estimated_value = $3, updated_at = NOW()
         WHERE id = $4`,
        [opp.suggested_text, opp.priority, opp.estimated_value, existing.rows[0].id]
      );
      return { id: existing.rows[0].id, created: false };
    }
    const ins = await pool.query(
      `INSERT INTO affiliate_opportunities
       (page_path, page_type, opportunity_type, platform, suggested_text, priority, estimated_value)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [
        opp.page_path,
        opp.page_type,
        opp.opportunity_type,
        opp.platform,
        opp.suggested_text,
        opp.priority,
        opp.estimated_value,
      ]
    );
    return { id: ins.rows[0].id, created: true };
  } catch (err) {
    if (/relation .* does not exist/i.test(err.message || '')) {
      return { id: null, created: false, skipped: true };
    }
    throw err;
  }
}

async function upsertPageStatus(pagePath, pageType, detected, score) {
  try {
    await pool.query(
      `INSERT INTO page_monetization_status
         (page_path, page_type, has_cabin_links, has_activity_links, has_rv_links,
          monetization_score, last_scanned, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW())
       ON CONFLICT (page_path) DO UPDATE SET
         page_type = EXCLUDED.page_type,
         has_cabin_links = EXCLUDED.has_cabin_links,
         has_activity_links = EXCLUDED.has_activity_links,
         has_rv_links = EXCLUDED.has_rv_links,
         monetization_score = EXCLUDED.monetization_score,
         last_scanned = NOW(),
         updated_at = NOW()`,
      [
        pagePath,
        pageType,
        detected.widgets.some((w) => ['stay22', 'vrbo', 'booking'].includes(w)) || /cabin/i.test(detected.widgets.join()),
        detected.widgets.some((w) => ['getyourguide', 'viator', 'rei'].includes(w)),
        detected.widgets.some((w) => ['outdoorsy', 'hipcamp'].includes(w)),
        score,
      ]
    );
  } catch {
    /* optional */
  }
}

/**
 * Safe apply: refresh in-memory plan + mark low-risk env recommendations.
 * Does NOT rewrite EJS templates automatically.
 */
function applySafePlan(plan) {
  const applied = [];
  // Attach UTM'd link recommendations into plan snapshot for UI/API consumers
  const links = affiliateLinks.getAffiliateLinks();
  plan.link_pack = {};
  for (const [key, url] of Object.entries(links)) {
    plan.link_pack[key] = withUtm(url, '/ops', key);
  }
  plan.applied_at = new Date().toISOString();
  plan.apply_mode = 'safe-memory';
  applied.push('refreshed_link_pack_with_utm');
  applied.push(`queued_actions=${(plan.actions || []).length}`);
  lastPlan = plan;
  return { applied, plan };
}

async function persistPlan(plan) {
  try {
    await pool.query(
      `INSERT INTO affiliate_ops_plans (snapshot, gap_count, pending_value)
       VALUES ($1, $2, $3)`,
      [JSON.stringify(plan), plan.gaps?.length || 0, plan.totals?.pending_value || 0]
    );
  } catch {
    /* optional until migration */
  }
}

async function runScan() {
  const gaps = [];
  const pageReports = [];
  let created = 0;
  const links = affiliateLinks.getAffiliateLinks();

  for (const page of PAGE_CATALOG) {
    const source = readGuideSource(page.path);
    const detected = page.path.startsWith('/guides/')
      ? detectWidgetsInSource(source)
      : {
          hasWidgetPartial: true, // non-guide pages use other CTAs
          widgets: page.widgets || [],
          hasFeatured: true,
          hasEmail: page.path === '/guides/trip-planner',
        };

    // If guide source missing widgets entirely → gap
    const pageGaps = [];
    for (const category of page.potential) {
      const platform = PLATFORM_FOR[category] || 'stay22';
      const hasPlatformWidget =
        detected.widgets.includes(platform) ||
        (platform === 'stay22' && detected.widgets.includes('vrbo'));

      const weak =
        (page.path.startsWith('/guides/') && !detected.hasWidgetPartial) ||
        (page.path.startsWith('/guides/') && !hasPlatformWidget) ||
        !links[platform];

      if (!weak) continue;

      const { priority, estimated_value } = scoreGap({ page, detected, category, platform });
      const opp = {
        page_path: page.path,
        page_type: page.type,
        opportunity_type: category,
        platform,
        suggested_text: buildSuggestedText(category, platform),
        suggested_url: withUtm(links[platform] || links.stay22, page.path, platform),
        recommended_widgets: page.widgets,
        priority,
        estimated_value,
        reason: !detected.hasWidgetPartial
          ? 'missing_affiliate_widget_partial'
          : !hasPlatformWidget
            ? 'missing_recommended_platform_widget'
            : 'missing_link_config',
      };
      pageGaps.push(opp);
      gaps.push(opp);

      const result = await upsertOpportunity(opp);
      if (result.created) created += 1;
    }

    const monScore = Math.max(
      0,
      100 -
        pageGaps.length * 15 -
        (detected.hasWidgetPartial ? 0 : 20) -
        (detected.hasEmail || page.type !== 'guide' ? 0 : 10)
    );
    await upsertPageStatus(page.path, page.type, detected, monScore);

    pageReports.push({
      path: page.path,
      type: page.type,
      detected,
      gap_count: pageGaps.length,
      monetization_score: monScore,
      recommended_widgets: page.widgets,
    });
  }

  gaps.sort((a, b) => b.priority - a.priority || b.estimated_value - a.estimated_value);

  const actions = gaps.slice(0, 12).map((g, i) => ({
    step: i + 1,
    action: 'add_or_fix_affiliate_cta',
    page: g.page_path,
    platform: g.platform,
    category: g.opportunity_type,
    suggested_text: g.suggested_text,
    suggested_url: g.suggested_url,
    priority: g.priority,
    estimated_monthly_value: g.estimated_value,
    how: g.page_path.startsWith('/guides/')
      ? `In views${g.page_path}.ejs ensure <%- include('../partials/affiliate-widget', { widgets: ${JSON.stringify(
          g.recommended_widgets || [g.platform]
        )} }) %>`
      : `Add tracked ${g.platform} CTA on ${g.page_path}`,
  }));

  // Env gaps as plan actions
  const coverage = envCoverage();
  for (const [platform, info] of Object.entries(coverage)) {
    if (!info.tracked) {
      actions.push({
        step: actions.length + 1,
        action: 'set_env_tracked_url',
        platform,
        env_key: info.env_key,
        priority: 6,
        how: `Set ${info.env_key} in Render/host env to your tracked partner link`,
      });
    }
  }

  const pending_value = gaps.reduce((s, g) => s + (Number(g.estimated_value) || 0), 0);

  const plan = {
    agent: 'affiliate-ops',
    timestamp: new Date().toISOString(),
    pages_scanned: PAGE_CATALOG.length,
    gaps_found: gaps.length,
    opportunities_created: created,
    totals: { pending_value: Math.round(pending_value * 100) / 100 },
    env_coverage: coverage,
    pages: pageReports,
    gaps: gaps.slice(0, 50),
    actions: actions.slice(0, 25),
    next_week_focus: actions.slice(0, 5).map((a) => a.page || a.platform),
  };

  applySafePlan(plan);
  await persistPlan(plan);
  lastScanAt = plan.timestamp;
  lastPlan = plan;

  console.log(
    `[AffiliateOps] scan complete — gaps=${gaps.length} created=${created} value~$${plan.totals.pending_value}`
  );
  return plan;
}

function getPlan() {
  return (
    lastPlan || {
      agent: 'affiliate-ops',
      status: 'no_scan_yet',
      message: 'Call runScan() or wait for interval',
    }
  );
}

function getStatus() {
  return {
    enabled: envEnabled(),
    started,
    last_scan: lastScanAt,
    gap_count: lastPlan?.gaps_found ?? null,
    pending_value: lastPlan?.totals?.pending_value ?? null,
  };
}

function start(options = {}) {
  if (started) return getStatus();
  if (!envEnabled() && !options.force) {
    console.log('[AffiliateOps] disabled (set AFFILIATE_OPS_ENABLED=true)');
    return getStatus();
  }
  started = true;
  console.log(`[AffiliateOps] armed — interval ${SCAN_INTERVAL_MS}ms`);

  setTimeout(() => {
    runScan().catch((err) => console.error('[AffiliateOps] scan error:', err.message));
  }, options.initialDelayMs ?? 20_000);

  timer = setInterval(() => {
    runScan().catch((err) => console.error('[AffiliateOps] scan error:', err.message));
  }, SCAN_INTERVAL_MS);
  if (typeof timer.unref === 'function') timer.unref();
  return getStatus();
}

function stop() {
  if (timer) clearInterval(timer);
  timer = null;
  started = false;
}

module.exports = {
  start,
  stop,
  runScan,
  getPlan,
  getStatus,
  applySafePlan,
  PAGE_CATALOG,
  withUtm,
};
