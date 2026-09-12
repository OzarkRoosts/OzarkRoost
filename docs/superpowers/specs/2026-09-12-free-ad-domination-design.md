# OzarkRoost Free-Ad Domination Design

## Goal
Create an additive, non-destructive distribution layer that gives OzarkRoost a repeatable way to identify and track legitimate free tourism/business directory placements while turning that distribution into traffic, affiliate clicks, leads, and paid listing opportunities.

## Hard constraint
Do not modify, replace, or delete any existing repository file for this feature. All implementation is new files only. Existing outreach, affiliate, Stripe, SEO, and Render behavior remains untouched.

## Product surface
Add a standalone static Advertising Hub under `public/campaign/advertising-hub.html`. Because the existing Express app already serves `public/` as static assets before route-specific handlers, the page is reachable at `/campaign/advertising-hub.html` without changing `server.js`.

The hub will:
- present the OzarkRoost brand package and destination positioning;
- show current verified free distribution opportunities;
- provide direct submission links;
- track local submission status in browser storage;
- provide copy-ready listing text and a standard tracking URL convention;
- show the exact paid listing tiers: $49, $99, and $149;
- emphasize legitimate submissions only, with no bulk spam or community ToS violations.

## Data model
Add `public/campaign/free-ad-opportunities.json` containing one record per opportunity with:
- `id`
- `name`
- `region`
- `type`
- `cost`
- `eligibility`
- `submissionUrl`
- `sourceUrl`
- `priority`
- `notes`
- `checkedAt`

The first dataset will focus on currently verifiable opportunities across Arkansas and Missouri, plus broad business directories where an OzarkRoost business profile is appropriate.

## Measurement
Use a consistent outbound convention in copy and links:
`https://ozartkroost.onrender.com/?utm_source=<placement>&utm_medium=referral&utm_campaign=free_distribution`

The hub must not fabricate traffic or conversion numbers. It records submission progress locally and points to the existing production site.

## Conversion offer
The hub will present:
- Free founding listing: limited-time acquisition offer.
- $49 listing.
- $99 listing.
- $149 listing.

No other listing prices will be introduced.

## Safety and quality
Only legitimate public submission/listing opportunities are included. Each opportunity is labeled with eligibility and source evidence. No automated form submission is added. The system is a human-assisted distribution tracker, not a spam bot.

## Testing
Add a new test file that verifies:
1. the static hub exists;
2. the opportunity JSON parses and contains required fields;
3. the three paid tiers are exactly $49/$99/$149;
4. the page contains the production tracking convention and responsible-submission language.

## Future integration boundary
This first implementation deliberately does not edit `server.js`, existing routes, database modules, or existing views. A later approved change can add navigation, server-side persistence, and automatic campaign reporting without risking the current production surface.
