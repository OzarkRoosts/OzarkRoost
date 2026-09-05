# Ozark Roost Adventure Landing Pages Design

**Date:** 2026-09-05
**Status:** Approved direction; implementation follows after spec review

## Goal
Turn the existing 100-destination Adventures hub into a connected, indexable network of 100 destination landing pages that can generate organic traffic, affiliate clicks, and business leads without making false partnership claims.

## Architecture
The public directory remains the existing data-driven `lib/adventure-directory.js` contract: the first 100 adventure records are the public inventory. A new `/adventures/:slug` route resolves a slug against that same inventory and renders one reusable EJS detail template. The hub links internally to each detail page while each detail page links outward only through existing official URLs and approved affiliate destinations.

## Page Contract
Each `/adventures/:slug` page will provide:
- unique, escaped HTML title and meta description derived from the adventure record;
- canonical URL based on the request's public site base URL;
- breadcrumbs back to Adventures;
- destination name, category, region, and description;
- an official-destination CTA using the record's official URL;
- a clearly labeled founding-directory/claim CTA for unclaimed entries;
- a stay/booking section using the existing affiliate bundle helpers, without implying a commercial relationship that has not been verified;
- related adventures selected from the same public 100-item inventory, preferring matching category and region;
- JSON-LD using `TouristAttraction`/`Place` fields supported by the source record, without invented coordinates, ratings, prices, hours, or availability.

## Revenue and Trust Rules
Affiliate links must use the existing affiliate-link configuration and safe outbound-link mechanism. No page may claim that a business, attraction, outfitter, lodging provider, affiliate network, or government agency is a partner unless the repository contains verified evidence of that relationship. Unclaimed directory entries remain explicitly labeled as unclaimed. Claim CTAs lead to the existing listing flow.

## SEO Rules
Every detail page must have a stable lowercase slug, unique title/meta text, canonical URL, crawlable internal links, and structured data. The sitemap must include all 100 detail URLs. Invalid slugs return HTTP 404 rather than redirecting to an unrelated destination. The hub remains the primary category/index page.

## Files and Responsibilities
- `lib/adventure-directory.js`: continue exposing the public 100-item inventory; add a small slug lookup helper if useful, keeping the data source centralized.
- `views/adventures.ejs`: change destination and featured-card primary links from dead-end cards/external-only paths to internal `/adventures/:slug` detail pages while retaining official-site links.
- `views/adventure-detail.ejs`: reusable destination detail-page presentation, SEO metadata, CTAs, related adventures, affiliate section, and JSON-LD.
- `server.js`: add `/adventures/:slug` resolution and dynamic sitemap entries for the 100 detail URLs.
- `test/adventures-page.test.js`: preserve hub coverage and add card-to-detail expectations where appropriate.
- `test/adventure-detail.test.js`: route/template contract tests, slug behavior, and 100-slug uniqueness.

## Data Flow
`adventure-directory` -> slug lookup -> route context -> `adventure-detail.ejs` -> official/affiliate/claim links. Related adventures are calculated from the same in-memory public inventory, so they cannot drift into a different or unapproved destination set.

## Error Handling
A missing slug returns a plain 404 response. A malformed or missing official URL must not be rendered as an unsafe outbound link. Affiliate sections may be omitted when no configured destination exists. Template rendering must not expose raw unescaped user input.

## Testing
Tests use the repository's Node test runner. Before implementation, tests will assert the desired route/template contract and fail against the current implementation. After implementation, the focused adventure tests and the full `npm test` suite must pass. GitHub Actions must report success before the deployment is described as green.

## Non-Goals
This change does not create fabricated destination facts, scrape third-party sites, create business accounts, send unsolicited outreach, alter payment pricing, or replace the existing affiliate infrastructure. Those can be separate projects once the landing-page foundation is live.
