# Free-Ad Domination Additive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a non-destructive, immediately usable OzarkRoost advertising/distribution hub with verified free-placement opportunities and exact paid listing tiers.

**Architecture:** Add only new static/data/test/docs files. The existing Express static middleware will serve the new campaign page without any change to `server.js`. Browser localStorage provides submission tracking so the feature works without database migrations or production schema changes.

**Tech Stack:** Static HTML, CSS, browser JavaScript, JSON, Node.js built-in test runner.

**Spec:** `docs/superpowers/specs/2026-09-12-free-ad-domination-design.md`

## Global Constraints

- Do not modify, replace, or delete any existing repository file.
- Exact paid listing tiers are $49, $99, and $149.
- Do not automate spam or bypass submission/community rules.
- Do not fabricate traffic, revenue, or conversion metrics.
- Use the existing production URL `https://ozartkroost.onrender.com` for campaign examples.

### Task 1: Add the verified opportunity dataset

**Files:**
- Create: `public/campaign/free-ad-opportunities.json`

- [ ] **Step 1: Create the dataset with current verified opportunities**

Each object must include `id`, `name`, `region`, `type`, `cost`, `eligibility`, `submissionUrl`, `sourceUrl`, `priority`, `notes`, and `checkedAt`.

Seed entries:
- VisitMO.com — free Missouri tourism business/event listing.
- Arkansas.com — free Arkansas tourism business profile.
- Arkansas Biz Connection — one free Arkansas business listing for eligible owners.
- Ozark Area Chamber/Locable — free local directory and community promotion program.
- Mountain Home Evolution — free basic business listing in the Arkansas Ozarks.
- Best Lake Attractions — free Lake of the Ozarks business listing.
- Go Local 417 — free listing for qualifying top-rated local businesses.
- BizHwy — free business directory listing.
- Pulaski County Tourism Bureau — complimentary partner listings for eligible tourism businesses.

- [ ] **Step 2: Validate JSON locally**

Run: `node -e "JSON.parse(require('fs').readFileSync('public/campaign/free-ad-opportunities.json','utf8')); console.log('valid')"`

Expected: `valid`

### Task 2: Build the standalone Advertising Hub

**Files:**
- Create: `public/campaign/advertising-hub.html`

- [ ] **Step 1: Add the page shell and brand positioning**

Use the headline `OzarkRoost Free Distribution & Advertising Hub` and the positioning `Discover the Ozarks. Stay. Eat. Explore.`.

- [ ] **Step 2: Add the exact paid offer**

Show only these paid listing prices: `$49`, `$99`, `$149`. Include a free founding listing callout without assigning it a conflicting paid price.

- [ ] **Step 3: Add the opportunity tracker**

Load `free-ad-opportunities.json`, render cards, provide `Open Submission` links, and store each opportunity's status in localStorage with states `Not started`, `Submitted`, and `Verified live`.

- [ ] **Step 4: Add copy-ready distribution assets**

Provide a concise directory description and a UTM example using `https://ozartkroost.onrender.com/?utm_source=<placement>&utm_medium=referral&utm_campaign=free_distribution`.

- [ ] **Step 5: Add responsible-use notice**

State that OzarkRoost should use legitimate free listings, comply with each site's eligibility rules, and avoid duplicate/spam submissions.

### Task 3: Add regression coverage

**Files:**
- Create: `test/advertising-hub.test.js`

- [ ] **Step 1: Write tests for the new files**

Test that the hub exists, the JSON parses, all required dataset fields exist, exactly three paid tiers are present with values 49/99/149, and the hub contains the production URL plus responsible-submission language.

- [ ] **Step 2: Run the focused test**

Run: `node --test test/advertising-hub.test.js`

Expected: all tests pass.

- [ ] **Step 3: Run the existing test suite**

Run: `npm test`

Expected: the pre-existing suite remains green; no existing source files were changed.

### Task 4: Review additive-only diff

**Files:**
- Inspect only the new files from Tasks 1–3.

- [ ] **Step 1: Confirm no existing file was overwritten**

Run: `git diff --name-status main...HEAD`

Expected: every changed path begins with `A` (added); no `M` or `D` entries.

- [ ] **Step 2: Confirm the page is directly addressable**

Use the existing static middleware behavior to verify `/campaign/advertising-hub.html` can be served without a route edit.

- [ ] **Step 3: Commit the additive feature**

Commit message: `feat: add additive free-ad distribution hub`
