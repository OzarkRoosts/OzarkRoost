# OzarkRoost — What This App Does

Curated affiliate lead site for cabin, camping, and RV rentals in the Arkansas Ozarks. Earns commission when users click through to Vrbo and Booking.com.

## Stack

Express.js + EJS + Neon PostgreSQL (hosted on Render).

## Directory Map

- `server.js` — Express entry point, route mounts, middleware
- `routes/` — Express route handlers (list-your-cabin.js, referral.js, operators.js, guides.js)
- `db/` — Database queries (listing-submissions.js, referral-submissions.js, operator-inquiries.js, index.js)
- `lib/` — Shared utilities (landing page context builder)
- `views/` — EJS templates (layout.ejs, partials/, listings.ejs, guides/)
- `public/css/` — theme.css (design tokens, all component styles)
- `migrate.js` — Database migration runner (used at startup)

## Database

Single Neon PostgreSQL instance. Schema lives in migrations run at deploy.

- `listing_submissions` — owner submissions from /list-your-cabin, payment status tracked
- `referral_submissions` — affiliate partner applications from /referral
- `operator_inquiries` — cabin/camping/RV operator inquiries from /operators

## External Integrations

- **R2** — Polsia asset storage for generated images
- **Stripe** — Payment links for owner sponsored listings ($20/month)
- **Vrbo / Booking.com** — Affiliate links in listings (external, no API)

## Recent Changes

- 2026-06-26 — Added /guides/about-the-ozarks destination storytelling page (Buffalo River, Blanchard Springs, Eureka Springs) with editorial copy and SEO structured data
- 2026-06-25 — Added /faq FAQ page covering booking, listings, operator contact, cancellation, pet policies, and seasonal availability (SEO + support load reduction)
- 2026-06-24 — Added /operators cabin/camping/RV operator referral page with inquiry form (saves to operator_inquiries table, $20/month listing call-to-action)
- 2026-06-22 — Added 5 SEO destination guide pages (/guides/buffalo-river-cabins, ozarks-adventures, ozarks-camping-rv, hidden-gem-cabins, buffalo-river-kayaking) with OG tags, Schema.org Article structured data, and sitemap entries
- 2026-06-21 — Added /referral operator partner program page with application form (affiliate commissions up to 8%, cabin referral fees $75)
- 2026-06-17 — Added /adventures page with 12 curated Ozarks activity categories (water, land, road trips, Jesse James Trail, Missing Gold legend) + Viator/AllTrails affiliate links