# Self-Expanding Traffic System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make OzarkRoost's sitemap, IndexNow, internal linking, and guide/adventure discovery automatically expand from one validated site inventory.

**Architecture:** Create a shared `lib/site-inventory.js` that owns crawlable URL discovery and metadata, then make sitemap generation, IndexNow, and discovery helpers consume it. Keep existing route/content sources intact and add only focused adapters and template integrations needed to remove duplicated URL maintenance.

**Tech Stack:** Node.js/CommonJS, Express/EJS, existing guide/adventure inventories, Node test runner, Render build/deploy.

**Spec:** `docs/superpowers/specs/2026-09-15-traffic-system-design.md`

## Global Constraints

- The shared inventory is the single source of truth for crawlable public URLs.
- Existing guide and adventure content remains the source of content truth; do not duplicate full content records.
- Do not fabricate `lastmod` metadata.
- Empty or invalid inventories must fail validation rather than generating a misleading sitemap.
- Do not create thin doorway pages or automated spam.
- Preserve the existing Travelpayouts/affiliate behavior and existing conversion routes.
- Do not introduce a sitemap index until URL volume requires it.

---

### Task 1: Build the shared site inventory

**Files:**
- Create: `lib/site-inventory.js`
- Test: `test/site-inventory.test.js`

**Interfaces:**
- Consumes: `lib/adventure-directory.js`, `lib/high-intent-guides-cluster-2.js`, `lib/high-intent-guides-cluster-3.js`, `lib/high-intent-guides-cluster-4.js`, and the existing legacy guide slug set currently used by `scripts/generate-sitemap.js`.
- Produces: `buildSiteInventory()` returning deterministic URL records `{ route, type, slug, title, categories }`; `buildUrlSet()` returning a deduplicated `Map` keyed by normalized route; `validateSiteInventory(records)` returning `{ valid, errors }`.

- [ ] **Step 1: Write failing inventory tests**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { buildSiteInventory, buildUrlSet, validateSiteInventory } = require('../lib/site-inventory');

test('inventory contains core discovery and conversion routes', () => {
  const routes = new Set(buildSiteInventory().map(item => item.route));
  for (const route of ['/', '/guides/', '/listings', '/adventures', '/list-your-cabin', '/referral', '/faq', '/trip-planner']) {
    assert.ok(routes.has(route), `missing ${route}`);
  }
});

test('inventory contains every public adventure and guide cluster', () => {
  const routes = new Set(buildSiteInventory().map(item => item.route));
  assert.ok(routes.has('/adventures/' + 'white-rock-mountain'));
  assert.ok([...routes].some(route => route.startsWith('/guides/')));
});

test('inventory rejects duplicate and invalid routes', () => {
  const result = validateSiteInventory([
    { route: '/guides/test', type: 'guide' },
    { route: '/guides/test', type: 'guide' },
    { route: 'not-absolute', type: 'guide' }
  ]);
  assert.equal(result.valid, false);
  assert.ok(result.errors.length >= 2);
});
```

- [ ] **Step 2: Run the focused tests and confirm they fail**

Run: `node --test test/site-inventory.test.js`
Expected: FAIL because `lib/site-inventory.js` does not yet expose the required functions.

- [ ] **Step 3: Implement the minimal shared inventory**

```js
const { adventures } = require('./adventure-directory');
const { CLUSTER_TWO_GUIDES } = require('./high-intent-guides-cluster-2');
const { CLUSTER_THREE_GUIDES } = require('./high-intent-guides-cluster-3');
const { CLUSTER_FOUR_GUIDES } = require('./high-intent-guides-cluster-4');

const CORE_ROUTES = ['/', '/guides/', '/listings', '/adventures', '/list-your-cabin', '/referral', '/faq', '/trip-planner'];
const LEGACY_GUIDES = ['about-the-ozarks', 'buffalo-river-cabins', 'ozarks-adventures', 'ozarks-camping-rv', 'hidden-gem-cabins', 'buffalo-river-kayaking', 'hot-tub-cabins', 'pet-friendly-cabins', 'treehouse-rentals', 'glamping-ozarks', 'luxury-cabins', 'ozarks-road-trip'];

function normalizeRoute(route) {
  if (route === '/') return '/';
  const value = String(route || '').trim();
  if (!value.startsWith('/')) throw new Error(`invalid route: ${value}`);
  return `/${value.replace(/^\/+|\/+$/g, '')}`;
}

function buildSiteInventory() {
  const records = [];
  for (const route of CORE_ROUTES) records.push({ route: normalizeRoute(route), type: 'core' });
  for (const slug of LEGACY_GUIDES) records.push({ route: normalizeRoute(`/guides/${slug}`), type: 'guide', slug });
  for (const cluster of [CLUSTER_TWO_GUIDES, CLUSTER_THREE_GUIDES, CLUSTER_FOUR_GUIDES]) {
    for (const guide of cluster) if (guide?.slug) records.push({ route: normalizeRoute(`/guides/${guide.slug}`), type: 'guide', slug: guide.slug, title: guide.title, categories: guide.categories || [] });
  }
  for (const adventure of adventures) if (adventure?.slug) records.push({ route: normalizeRoute(`/adventures/${adventure.slug}`), type: 'adventure', slug: adventure.slug, title: adventure.title, categories: adventure.categories || [] });
  return [...new Map(records.map(record => [record.route, record])).values()].sort((a, b) => a.route.localeCompare(b.route));
}

function buildUrlSet() {
  return new Map(buildSiteInventory().map(record => [record.route, record]));
}

function validateSiteInventory(records) {
  const errors = [];
  const seen = new Set();
  for (const record of records) {
    if (!record || typeof record.route !== 'string' || !record.route.startsWith('/')) errors.push(`invalid route: ${record?.route}`);
    if (record && seen.has(record.route)) errors.push(`duplicate route: ${record.route}`);
    if (record) seen.add(record.route);
  }
  return { valid: errors.length === 0, errors };
}

module.exports = { buildSiteInventory, buildUrlSet, validateSiteInventory, normalizeRoute };
```

- [ ] **Step 4: Run focused tests and verify they pass**

Run: `node --test test/site-inventory.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/site-inventory.js test/site-inventory.test.js
git commit -m "feat: add shared site inventory"
```

### Task 2: Make sitemap generation consume the inventory

**Files:**
- Modify: `scripts/generate-sitemap.js`
- Modify: `test/sitemap-generator.test.js`

**Interfaces:**
- Consumes: `buildSiteInventory()` from `lib/site-inventory.js`.
- Produces: existing `buildSitemap(siteUrl)` and `buildUrlMap()` exports with the same public behavior, now backed by the shared inventory.

- [ ] **Step 1: Add regression coverage proving the sitemap and inventory agree**

```js
const { buildSiteInventory } = require('../lib/site-inventory');
const { buildUrlMap } = require('../scripts/generate-sitemap');

test('sitemap URL map exactly covers the shared inventory routes', () => {
  const inventoryRoutes = new Set(buildSiteInventory().map(item => item.route));
  const sitemapRoutes = new Set(buildUrlMap().keys());
  assert.deepEqual(sitemapRoutes, inventoryRoutes);
});
```

- [ ] **Step 2: Run the focused sitemap tests and confirm the new assertion fails**

Run: `node --test test/sitemap-generator.test.js`
Expected: FAIL until the generator imports the shared inventory.

- [ ] **Step 3: Replace the duplicated route/cluster loops with the shared inventory**

```js
const { buildSiteInventory, validateSiteInventory } = require('../lib/site-inventory');

function buildUrlMap() {
  const inventory = buildSiteInventory();
  const validation = validateSiteInventory(inventory);
  if (!validation.valid) throw new Error(`invalid site inventory: ${validation.errors.join('; ')}`);
  return new Map(inventory.map(item => [item.route, {
    changefreq: item.type === 'core' ? 'weekly' : 'monthly',
    priority: item.type === 'core' ? '0.9' : item.type === 'guide' ? '0.8' : '0.7'
  }]));
}
```

Retain the existing XML escaping, deterministic sorting, output path, and module export contract.

- [ ] **Step 4: Run sitemap tests and the full test suite**

Run: `node --test test/sitemap-generator.test.js && npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/generate-sitemap.js test/sitemap-generator.test.js
git commit -m "refactor: generate sitemap from shared inventory"
```

### Task 3: Unify IndexNow with the same inventory

**Files:**
- Modify: `scripts/indexnow-submit.js`
- Test: `test/indexnow-submit.test.js`

**Interfaces:**
- Consumes: `buildSiteInventory()` from `lib/site-inventory.js`.
- Produces: the existing IndexNow request behavior, with URL batches derived directly from inventory.

- [ ] **Step 1: Add a pure URL-list test**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { buildIndexNowUrls } = require('../scripts/indexnow-submit');
const { buildSiteInventory } = require('../lib/site-inventory');

test('IndexNow URL list is derived from the shared inventory', () => {
  const expected = new Set(buildSiteInventory().map(item => `https://example.com${item.route}`));
  assert.deepEqual(new Set(buildIndexNowUrls('https://example.com')), expected);
});
```

- [ ] **Step 2: Run the focused test and confirm it fails**

Run: `node --test test/indexnow-submit.test.js`
Expected: FAIL because `buildIndexNowUrls` is not yet exported.

- [ ] **Step 3: Implement the shared-inventory URL builder and safe batching**

```js
const { buildSiteInventory } = require('../lib/site-inventory');

function buildIndexNowUrls(siteUrl) {
  const base = String(siteUrl).replace(/\/$/, '');
  return [...new Set(buildSiteInventory().map(item => `${base}${item.route}`))];
}

function chunk(items, size = 10000) {
  const batches = [];
  for (let i = 0; i < items.length; i += size) batches.push(items.slice(i, i + size));
  return batches;
}
```

Use `buildIndexNowUrls(SITE_URL)` in the existing async submission flow. Export the pure helpers for tests. Keep the existing key, key-location convention, HTTPS request behavior, status checking, and useful logging. Do not make a failed IndexNow submission mutate site content.

- [ ] **Step 4: Run IndexNow tests and full tests**

Run: `node --test test/indexnow-submit.test.js && npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/indexnow-submit.js test/indexnow-submit.test.js
 git commit -m "refactor: drive IndexNow from shared inventory"
```

### Task 4: Add reusable related-content discovery

**Files:**
- Create: `lib/content-discovery.js`
- Test: `test/content-discovery.test.js`

**Interfaces:**
- Consumes: inventory records from `buildSiteInventory()`.
- Produces: `getRelatedContent(currentRoute, options)` returning deterministic records `{ route, type, slug, title, categories }` with the current route excluded.

- [ ] **Step 1: Write failing tests for deterministic, non-self recommendations**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { getRelatedContent } = require('../lib/content-discovery');

test('related content excludes current page and duplicates', () => {
  const items = getRelatedContent('/guides/about-the-ozarks', { limit: 8 });
  assert.ok(items.length <= 8);
  assert.ok(!items.some(item => item.route === '/guides/about-the-ozarks'));
  assert.equal(new Set(items.map(item => item.route)).size, items.length);
});

test('related content is deterministic', () => {
  assert.deepEqual(getRelatedContent('/adventures/white-rock-mountain', { limit: 6 }), getRelatedContent('/adventures/white-rock-mountain', { limit: 6 }));
});
```

- [ ] **Step 2: Run the focused test and confirm failure**

Run: `node --test test/content-discovery.test.js`
Expected: FAIL because the helper does not yet exist.

- [ ] **Step 3: Implement relationship scoring using existing metadata only**

```js
const { buildSiteInventory } = require('./site-inventory');

function getRelatedContent(currentRoute, { limit = 6, types } = {}) {
  const inventory = buildSiteInventory();
  const current = inventory.find(item => item.route === currentRoute);
  const allowed = types ? new Set(types) : null;
  return inventory
    .filter(item => item.route !== currentRoute && (!allowed || allowed.has(item.type)))
    .map(item => {
      let score = item.type === current?.type ? 2 : 0;
      const currentCategories = new Set(current?.categories || []);
      for (const category of item.categories || []) if (currentCategories.has(category)) score += 3;
      if (current?.slug && item.slug && item.slug.split('-').some(part => current.slug.split('-').includes(part))) score += 1;
      return { item, score };
    })
    .sort((a, b) => b.score - a.score || a.item.route.localeCompare(b.item.route))
    .slice(0, limit)
    .map(({ item }) => item);
}

module.exports = { getRelatedContent };
```

- [ ] **Step 4: Run tests and verify pass**

Run: `node --test test/content-discovery.test.js && npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/content-discovery.js test/content-discovery.test.js
git commit -m "feat: add inventory-driven content discovery"
```

### Task 5: Integrate discovery into guide/adventure surfaces

**Files:**
- Modify: `views/guides/index.ejs`
- Identify and modify the existing guide detail template and adventure detail template that already render the corresponding pages; do not replace routing.
- Test: extend `test/content-discovery.test.js` with template-contract assertions where practical.

**Interfaces:**
- Consumes: `getRelatedContent()` and existing route-provided data.
- Produces: crawlable related-guide/adventure links on existing pages without changing affiliate tracking or primary CTAs.

- [ ] **Step 1: Add a guide-hub contract test for inventory-driven rendering**

```js
test('guide hub template accepts a discovery collection', () => {
  const fs = require('node:fs');
  const template = fs.readFileSync('views/guides/index.ejs', 'utf8');
  assert.match(template, /related|discovery|guides\.forEach/i);
});
```

- [ ] **Step 2: Run the focused test before integration**

Run: `node --test test/content-discovery.test.js`
Expected: Existing guide loop remains present; the new discovery assertion may fail until the explicit related section is added.

- [ ] **Step 3: Add compact related sections using server-provided discovery data**

The guide hub should continue rendering its existing `guides` collection, then render an additional discovery block from a `discovery`/`relatedContent` collection supplied by the route. Guide detail pages should link to a small deterministic set of related guides and adventures. Adventure detail pages should link to related adventures and relevant guides. Every link must be a normal crawlable `<a href="...">` and must exclude the current URL.

- [ ] **Step 4: Run tests and render-level checks**

Run: `npm test`
Expected: PASS. Also run the application locally with the repository's existing start command and request `/guides/`, one guide URL, `/adventures/`, and one adventure URL; verify the related sections contain valid internal links and no self-link.

- [ ] **Step 5: Commit**

```bash
git add views/guides/index.ejs <actual-guide-detail-template> <actual-adventure-detail-template> test/content-discovery.test.js
 git commit -m "feat: expand guide and adventure discovery"
```

### Task 6: Build/deploy validation and production crawl checks

**Files:**
- Modify: `test/sitemap-generator.test.js` only if a missing invariant is discovered during validation.
- No production code changes unless validation exposes a real defect.

**Interfaces:**
- Consumes: the completed shared inventory, sitemap generator, IndexNow URL builder, and discovery helpers.
- Produces: verified build artifacts and a verified live Render sitemap/discovery surface.

- [ ] **Step 1: Run the complete automated test suite**

Run: `npm test`
Expected: PASS with no sitemap, inventory, or discovery regressions.

- [ ] **Step 2: Run the production sitemap generator**

Run: `node scripts/generate-sitemap.js`
Expected: output reports a non-zero URL count and writes `public/sitemap.xml` successfully.

- [ ] **Step 3: Verify sitemap invariants programmatically**

Run: `node -e "const {buildUrlMap}=require('./scripts/generate-sitemap'); const u=[...buildUrlMap().keys()]; if(!u.length||new Set(u).size!==u.length) process.exit(1); console.log('sitemap URLs:',u.length)"`
Expected: exits 0 and prints the URL count.

- [ ] **Step 4: Verify the Render deployment for `oZARTKrOOST`**

Use the connected Render service/deploy tooling for service `srv-d9klcvtbedkc73av9ai0` in workspace `tea-d9jldqfaqgkc73bnkrpg`. Confirm the commit is deployed successfully before claiming completion.

- [ ] **Step 5: Verify live crawl surfaces**

Request the deployed `/sitemap.xml`, `/guides/`, `/adventures/`, one guide page, and one adventure page. Confirm HTTP success, sitemap URL count matches the generated inventory, and discovery links resolve to internal inventory routes.

- [ ] **Step 6: Commit any validation-only fixes**

```bash
git add <only-files-changed-by-validation-fixes>
git commit -m "fix: harden traffic system validation"
```

Do not create a commit if validation finds no code defect.
