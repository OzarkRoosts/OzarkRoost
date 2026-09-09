# Ozark Roost Growth Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn Ozark Roost into a compounding traffic and revenue acquisition engine across search, destinations, events, social distribution, email capture, business acquisition, affiliate clicks, and measurable conversion.

**Architecture:** Build a reusable content/distribution layer rather than hand-authoring isolated pages. A canonical destination/activity/event dataset feeds indexable landing pages, internal-link relationships, metadata/schema, social-ready content, newsletter hooks, and revenue CTAs. Existing Stripe listing revenue and Render-native outreach remain the monetization backbone.

**Tech Stack:** Existing Node.js/Express/Postgres application, server-rendered/static HTML where appropriate, existing SEO/sitemap infrastructure, existing outreach engine, existing Stripe listing flow, GitHub Actions, Render.

**Spec:** Approved in chat on 2026-09-09; this plan operationalizes the agreed “go big” traffic strategy.

## Global Constraints

- Paid listing tiers remain exactly **$49/month, $99/month, and $149/month**.
- Keep the limited-time free Founding listing path separate from paid tiers.
- Render is production; GitHub is source of truth; do not add Floot.
- Use real, verifiable destinations and businesses; never fabricate reviews, rankings, events, prices, availability, or partnerships.
- Automated outreach must respect suppression, opt-out, identity, rate limits, and applicable commercial-email requirements.
- Affiliate revenue must be clearly attributable and must not be represented as guaranteed earnings.
- Every growth surface must have measurable attribution back to a page, campaign, or CTA.

---

### Task 1: Audit the existing growth surface

**Files:**
- Inspect: `server.js`
- Inspect: `package.json`
- Inspect: existing SEO/sitemap routes and `public/`
- Inspect: existing command-center and outreach modules
- Inspect: existing tests under `test/`

**Interfaces:**
- Consumes: current production routes, DB schema, SEO implementation, outreach telemetry.
- Produces: a concrete map of existing reusable growth primitives and missing surfaces.

- [ ] **Step 1: Inventory existing routes and content generators**
- [ ] **Step 2: Inventory existing sitemap/robots/schema support**
- [ ] **Step 3: Inventory existing Postgres tables containing destinations, businesses, prospects, listings, and events**
- [ ] **Step 4: Inventory existing analytics/telemetry and command-center metrics**
- [ ] **Step 5: Identify duplicate or obsolete growth paths before adding new ones**
- [ ] **Step 6: Record findings in the implementation branch notes**

---

### Task 2: Build a canonical Ozark destination/content model

**Files:**
- Create or modify: `db/` model/query module for canonical destinations
- Create: migration for canonical destination records if no suitable table exists
- Create: `lib/growth-content.js`
- Test: `test/growth-content.test.js`

**Interfaces:**
- Consumes: verified destination/business/event data already available in the application.
- Produces: stable records with slug, name, region, category, description, source URL, and related entities suitable for page generation.

- [ ] **Step 1: Write tests for stable slugs and required destination fields**
- [ ] **Step 2: Run the focused test and confirm failure**
- [ ] **Step 3: Implement the minimal canonical model/query helpers**
- [ ] **Step 4: Add deterministic related-content selection**
- [ ] **Step 5: Run focused tests and full test suite**
- [ ] **Step 6: Commit the canonical content model**

---

### Task 3: Create high-intent SEO landing-page generation

**Files:**
- Create: `lib/seo-page-generator.js`
- Modify: existing route/page generation entrypoint
- Create: tests for title/description/canonical/schema/internal-link output

**Interfaces:**
- Consumes: canonical destinations plus verified categories and related entities.
- Produces: indexable pages for combinations such as destination + activity, destination + lodging intent, seasonal intent, trip planning, and itinerary intent.

- [ ] **Step 1: Write failing tests for one destination page and one intent variant**
- [ ] **Step 2: Run focused tests and confirm failure**
- [ ] **Step 3: Implement page generation with unique copy inputs and canonical URLs**
- [ ] **Step 4: Add BreadcrumbList/Article/LocalBusiness schema only when the source data supports it**
- [ ] **Step 5: Add contextual internal links to destinations, lodging, activities, events, and itineraries**
- [ ] **Step 6: Add duplicate-content safeguards so pages are not thin template clones**
- [ ] **Step 7: Run tests and inspect representative generated HTML**
- [ ] **Step 8: Commit the SEO landing-page engine**

---

### Task 4: Expand sitemap and crawl discovery safely

**Files:**
- Modify: existing sitemap route/generator
- Modify: `robots.txt` generation if required
- Test: sitemap coverage/regression tests

**Interfaces:**
- Consumes: generated indexable pages.
- Produces: segmented sitemap output with only canonical, indexable URLs.

- [ ] **Step 1: Write failing sitemap coverage tests**
- [ ] **Step 2: Implement segmented sitemap generation if URL volume requires it**
- [ ] **Step 3: Exclude redirects, duplicates, noindex pages, and incomplete records**
- [ ] **Step 4: Verify robots.txt points crawlers to the canonical sitemap**
- [ ] **Step 5: Run tests and inspect sitemap XML**
- [ ] **Step 6: Commit crawl-discovery changes**

---

### Task 5: Build the event and seasonal traffic layer

**Files:**
- Create: event ingestion/query module using only permitted/public sources already available to the app
- Create: seasonal content configuration
- Modify: SEO page generator
- Test: event/seasonal page tests

**Interfaces:**
- Consumes: verified event records and deterministic seasonal topics.
- Produces: useful event/seasonal pages with dates and source attribution where applicable.

- [ ] **Step 1: Write tests for current/future event rendering and stale-event exclusion**
- [ ] **Step 2: Implement source-normalized event records**
- [ ] **Step 3: Add event pages and destination/event cross-links**
- [ ] **Step 4: Add seasonal guides such as fall foliage, spring waterfalls, summer floating, and winter cabin trips without inventing conditions**
- [ ] **Step 5: Add date-aware noindex/archive behavior for stale event pages**
- [ ] **Step 6: Run tests and commit**

---

### Task 6: Turn every strong page into a distribution package

**Files:**
- Create: `lib/social-content.js`
- Modify: newsletter/social integration points already present in the repo
- Test: social copy/UTM tests

**Interfaces:**
- Consumes: canonical page metadata and verified destination facts.
- Produces: platform-neutral short-form copy, suggested visual hooks, and tracked URLs; no automatic spam posting.

- [ ] **Step 1: Write tests for deterministic UTM attribution**
- [ ] **Step 2: Implement social package generation for Facebook, Instagram, TikTok, X, and Pinterest-ready copy**
- [ ] **Step 3: Generate multiple hooks from the same page without duplicating the page verbatim**
- [ ] **Step 4: Attach source and campaign attribution parameters**
- [ ] **Step 5: Expose packages to existing marketing workflows**
- [ ] **Step 6: Run tests and commit**

---

### Task 7: Strengthen visitor conversion and newsletter capture

**Files:**
- Modify: high-traffic page templates/components
- Modify: existing newsletter signup route and consent handling
- Modify: command-center telemetry
- Test: consent and attribution tests

**Interfaces:**
- Consumes: page context and campaign attribution.
- Produces: consented subscriber records plus measurable conversion events.

- [ ] **Step 1: Write tests for explicit consent, attribution preservation, and duplicate suppression**
- [ ] **Step 2: Add contextual newsletter CTAs based on page intent**
- [ ] **Step 3: Add itinerary/trip-planning CTA where supported by existing product capabilities**
- [ ] **Step 4: Preserve source/medium/campaign metadata through signup**
- [ ] **Step 5: Add conversion events to the command center**
- [ ] **Step 6: Run tests and commit**

---

### Task 8: Connect traffic to affiliate and paid-listing revenue

**Files:**
- Modify: existing affiliate tracking helpers
- Modify: paid-listing CTA components
- Modify: command-center revenue telemetry
- Test: revenue attribution tests

**Interfaces:**
- Consumes: page context, verified partner/listing data, existing Stripe checkout URLs.
- Produces: measurable outbound affiliate clicks, listing checkout clicks, and paid-listing conversions.

- [ ] **Step 1: Write failing tests for page → CTA → attribution continuity**
- [ ] **Step 2: Implement consistent affiliate UTM/sub-ID conventions where supported**
- [ ] **Step 3: Add paid-listing CTAs to appropriate business-facing surfaces**
- [ ] **Step 4: Record checkout-click telemetry without fabricating revenue**
- [ ] **Step 5: Extend command center with traffic-to-revenue funnel metrics**
- [ ] **Step 6: Run tests and commit**

---

### Task 9: Add a measurable growth command center

**Files:**
- Modify: existing `/command-center.html`
- Modify: existing telemetry queries/routes
- Test: command-center metric tests

**Interfaces:**
- Consumes: page views/events where available, outbound clicks, outreach events, checkout events, Stripe paid listings.
- Produces: verified funnel metrics: traffic, top pages, leads, email subscribers, outreach sent/replied/interested, checkout clicks, paid listings, MRR, and next actions.

- [ ] **Step 1: Write tests that distinguish verified values from unavailable values**
- [ ] **Step 2: Add traffic acquisition breakdown by source/medium/campaign**
- [ ] **Step 3: Add top landing pages and conversion rates**
- [ ] **Step 4: Add paid-listing MRR using the canonical $49/$99/$149 tier values only when subscription state is verified**
- [ ] **Step 5: Add affiliate-click and checkout-click counts separately from revenue**
- [ ] **Step 6: Add outreach funnel metrics from the authoritative tables/events**
- [ ] **Step 7: Run tests and inspect the production command center**
- [ ] **Step 8: Commit**

---

### Task 10: Production growth verification and Render rollout

**Files:**
- Modify: only production configuration files required by the implementation
- Test: full repository test suite and CI

**Interfaces:**
- Consumes: completed growth modules.
- Produces: production deployment on Render with verified routes, sitemap, robots, conversion paths, and telemetry.

- [ ] **Step 1: Run the full Node test suite**
- [ ] **Step 2: Verify GitHub Actions is green**
- [ ] **Step 3: Merge the growth branch into `main` after review**
- [ ] **Step 4: Verify Render deploy uses the merged `main` commit**
- [ ] **Step 5: Smoke-test canonical pages, sitemap, robots, newsletter CTA, listing checkout CTA, and command center**
- [ ] **Step 6: Inspect Render logs for startup/errors**
- [ ] **Step 7: Report exact deployed commit and verified metrics; never claim traffic or revenue that was not observed**

---

## Self-Review Checklist

- Every approved growth requirement maps to at least one task.
- No task depends on fabricated data or unverifiable partnerships.
- Paid pricing remains exactly $49/$99/$149 monthly.
- SEO pages have canonical URLs and safeguards against thin duplication.
- Event pages expire/archive safely.
- Social generation produces tracked content but does not imply automatic platform posting without an authenticated integration.
- Revenue metrics distinguish clicks, opportunities, subscriptions, and realized revenue.
- Render remains the production deployment target.
- No Floot dependency is introduced.
