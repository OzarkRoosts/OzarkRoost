# Adventure Landing Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the existing 100-place Adventures hub into 100 indexable destination landing pages with internal discovery, affiliate paths, claim conversion, structured data, and sitemap coverage.

**Architecture:** Keep the first 100 records from `lib/adventures.js` as the sole public inventory exposed by `lib/adventure-directory.js`. Resolve `/adventures/:slug` against that inventory and render one reusable `views/adventure-detail.ejs` template; related destinations are selected from the same inventory. Keep outbound monetization inside the existing affiliate configuration and preserve explicit unclaimed/founding language.

**Tech Stack:** Node.js 20, Express 4, EJS, Node built-in test runner, existing `lib/affiliate-links.js` configuration.

**Spec:** `docs/superpowers/specs/2026-09-05-adventure-landing-pages-design.md`

## Global Constraints

- Public inventory is exactly the first 100 records exposed by `lib/adventure-directory.js`.
- Do not invent destination facts, coordinates, ratings, prices, hours, availability, or partnerships.
- Use escaped EJS output for destination data.
- Invalid adventure slugs return HTTP 404.
- Affiliate links use existing configured affiliate destinations only.
- Unclaimed entries remain explicitly labeled as unclaimed.
- Tests use `node --test`; full `npm test` must pass before completion.

---

### Task 1: Add the directory lookup contract

**Files:**
- Modify: `lib/adventure-directory.js`
- Test: `test/adventure-detail.test.js`

**Interfaces:**
- Produces `getAdventureBySlug(slug)` returning the matching public adventure object or `null`.
- Existing `adventures` and `categories` exports remain unchanged.

- [ ] **Step 1: Write the failing lookup/uniqueness tests**

```js
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { adventures, getAdventureBySlug } = require('../lib/adventure-directory');

test('public adventure inventory has 100 unique lowercase slugs', () => {
  assert.equal(adventures.length, 100);
  const slugs = adventures.map(a => a.slug);
  assert.equal(new Set(slugs).size, 100);
  assert.ok(slugs.every(slug => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)));
});

test('slug lookup resolves valid and invalid destinations', () => {
  assert.equal(getAdventureBySlug('buffalo-national-river').name, 'Buffalo National River');
  assert.equal(getAdventureBySlug('does-not-exist'), null);
});
```

- [ ] **Step 2: Run the focused test and verify it fails because the lookup export is missing**

Run: `node --test test/adventure-detail.test.js`
Expected: FAIL because `getAdventureBySlug` is not yet exported.

- [ ] **Step 3: Implement the minimal lookup helper**

```js
const getAdventureBySlug = slug => {
  const normalized = String(slug || '').trim().toLowerCase();
  return directory.find(adventure => adventure.slug === normalized) || null;
};
```

Export it alongside `adventures` and `categories`.

- [ ] **Step 4: Run the focused test again**

Run: `node --test test/adventure-detail.test.js`
Expected: PASS for the lookup and uniqueness tests.

- [ ] **Step 5: Commit**

```bash
git add lib/adventure-directory.js test/adventure-detail.test.js
git commit -m "feat: add adventure slug lookup"
```

### Task 2: Build the reusable detail-page template

**Files:**
- Create: `views/adventure-detail.ejs`
- Test: `test/adventure-detail.test.js`

**Interfaces:**
- Consumes `adventure`, `relatedAdventures`, `affiliateLinks`, `baseUrl`.
- Renders SEO metadata, canonical URL, breadcrumbs, destination data, official CTA, claim CTA, affiliate bundle, related adventures, and JSON-LD.

- [ ] **Step 1: Add template contract assertions**

```js
const fs = require('node:fs');
const path = require('node:path');
const detail = fs.readFileSync(path.join(__dirname, '..', 'views', 'adventure-detail.ejs'), 'utf8');

test('detail template has SEO, trust, conversion, and structured-data contract', () => {
  for (const marker of ['<title>', 'name="description"', 'rel="canonical"', 'Breadcrumb', 'Explore the official destination', 'Claim this free founding spot', 'Build the weekend', 'application/ld+json', 'TouristAttraction', 'Founding directory entry · unclaimed']) {
    assert.ok(detail.includes(marker), `missing detail marker: ${marker}`);
  }
});
```

- [ ] **Step 2: Run the focused test and verify the template assertion fails**

Run: `node --test test/adventure-detail.test.js`
Expected: FAIL because `views/adventure-detail.ejs` does not exist.

- [ ] **Step 3: Implement the template**

Use EJS escaped output (`<%= ... %>`) for all destination fields. Build the canonical URL as `${baseUrl}/adventures/${adventure.slug}`. Render the official URL with `target="_blank" rel="noopener noreferrer"`; render affiliate URLs from the existing bundle with `rel="sponsored noopener noreferrer"`. JSON-LD should contain only `@type`, `name`, `description`, and `url` from the source record plus a `mainEntityOfPage` URL; do not add unsupported coordinates, ratings, opening hours, prices, or availability.

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `node --test test/adventure-detail.test.js`
Expected: PASS for the template contract.

- [ ] **Step 5: Commit**

```bash
git add views/adventure-detail.ejs test/adventure-detail.test.js
git commit -m "feat: add adventure destination landing page"
```

### Task 3: Wire the route and related-adventure selection

**Files:**
- Modify: `server.js`
- Modify: `lib/adventure-directory.js`
- Test: `test/adventure-detail.test.js`

**Interfaces:**
- Route: `GET /adventures/:slug`.
- Valid slug renders `adventure-detail`.
- Invalid slug returns status 404 with no unrelated redirect.
- Related adventures come from the same 100-item public inventory, preferring same region and category.

- [ ] **Step 1: Add route-contract tests**

```js
const serverText = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');

test('server exposes the adventure detail route and 404 behavior', () => {
  assert.match(serverText, /app\.get\('\/adventures\/:slug'/);
  assert.match(serverText, /status\(404\)/);
  assert.match(serverText, /res\.render\('adventure-detail'/);
});
```

- [ ] **Step 2: Run the focused test and verify the route assertion fails**

Run: `node --test test/adventure-detail.test.js`
Expected: FAIL because the route is absent.

- [ ] **Step 3: Implement the route**

Use `getAdventureBySlug(req.params.slug)`. On null, return `res.status(404).send('Adventure not found')`. For a valid record, calculate related entries by sorting the other 99 records with same-region matches first, same-category matches second, then all remaining entries, and slice to six. Load `getBundle('adventure')` from `lib/affiliate-links`. Use the existing `publicBaseUrl(req)` helper.

- [ ] **Step 4: Run the focused test and full suite**

Run: `node --test test/adventure-detail.test.js && npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server.js lib/adventure-directory.js test/adventure-detail.test.js
git commit -m "feat: wire adventure detail routes"
```

### Task 4: Convert the hub to internal discovery pages

**Files:**
- Modify: `views/adventures.ejs`
- Modify: `test/adventures-page.test.js`

**Interfaces:**
- Every public destination card links to `/adventures/<slug>` as its primary internal action.
- Featured cards also link internally.
- Official destination links remain visible on the detail page.

- [ ] **Step 1: Add hub-link tests**

```js
test('adventure hub links cards to internal destination pages', () => {
  assert.match(page, /href="\/adventures\/<%= a\.slug %>"/);
  assert.match(page, /data-adventure-url="\/adventures\/<%= a\.slug %>"/);
});
```

- [ ] **Step 2: Run the focused hub test and verify the new expectations fail**

Run: `node --test test/adventures-page.test.js`
Expected: FAIL because the card hrefs still point directly to external official URLs.

- [ ] **Step 3: Update card and featured-card primary links**

Make the primary card/featured link `/adventures/<%= a.slug %>`. Keep an explicit official-site CTA only where it is clearly labeled as the official destination; do not remove the destination's official URL from the data flow.

- [ ] **Step 4: Run the hub test**

Run: `node --test test/adventures-page.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add views/adventures.ejs test/adventures-page.test.js
git commit -m "feat: connect adventure hub to landing pages"
```

### Task 5: Expand the sitemap to all 100 detail URLs

**Files:**
- Modify: `server.js`
- Test: `test/adventure-detail.test.js`

**Interfaces:**
- `/sitemap.xml` includes `/adventures` and exactly 100 `/adventures/<slug>` URLs.

- [ ] **Step 1: Add sitemap contract test**

```js
test('sitemap source includes every public adventure detail URL', () => {
  assert.match(serverText, /adventures\.map/);
  assert.match(serverText, /\/adventures\//);
});
```

- [ ] **Step 2: Implement dynamic sitemap entries**

Import `adventures` from `lib/adventure-directory.js`. Build `SITEMAP_PATHS` as the existing static paths plus `adventures.map(a => `/adventures/${a.slug}`)`. Preserve existing guide URLs and priorities.

- [ ] **Step 3: Run the full test suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add server.js test/adventure-detail.test.js
git commit -m "feat: index all adventure landing pages in sitemap"
```

### Task 6: Verify production behavior and deployment

**Files:**
- No source changes unless verification finds a failure.

- [ ] **Step 1: Run the complete local test suite**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 2: Verify the latest GitHub Actions run for the resulting commit**

Use the repository's workflow-run API and confirm the `node-tests` job has `status=completed` and `conclusion=success`.

- [ ] **Step 3: Verify the live Render deployment**

Check `https://ozartkroost.onrender.com/adventures`, one representative detail page such as `/adventures/buffalo-national-river`, and `/sitemap.xml`. Confirm the detail page returns 200, the invalid slug returns 404, and the sitemap contains all 100 detail URLs.

- [ ] **Step 4: If verification fails, stop and debug before claiming completion**

Use the failure output to make the smallest corrective change, rerun the affected tests, and re-check deployment status.

- [ ] **Step 5: Final commit only after verification**

```bash
git status
git log -5 --oneline
```

Confirm the working tree is clean and the final commit is on `main` before reporting the feature complete.
