# Affiliate Autonomous Acquisition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make affiliate acquisition and approved-link activation autonomous within the no-spend/human-verification boundary.

**Architecture:** Keep the existing AffiliateExecutor for web onboarding, add a persistent registry for legitimate approved tracking URLs, and make the existing affiliate-link helper consume that registry as an override while retaining current fallbacks.

**Tech Stack:** Node.js, PostgreSQL, node:test, Express/EJS.

**Spec:** `docs/superpowers/specs/2026-09-05-affiliate-autonomous-acquisition-design.md`

## Global Constraints

- No purchases, paid subscriptions, paid plans, deposits, or financial credentials.
- No CAPTCHA, MFA, identity verification, government-ID, SSN, legal/authorized-representative attestations, or human-only verification bypasses.
- Only official/verified HTTPS partner URLs may be activated.
- Never fabricate approval, commission terms, tracking IDs, or partnerships.

---

### Task 1: Link activation rules
**Files:**
- Create: `test/affiliate-link-registry.test.js`
- Create: `lib/affiliate-link-registry.js`

- [ ] Write failing tests for approved-link eligibility, URL validation, and fallback behavior.
- [ ] Run `npm test` and confirm the new tests fail because the registry module does not exist.
- [ ] Implement minimal pure registry functions.
- [ ] Run the focused tests and full suite.

### Task 2: Persistent database registry
**Files:**
- Create: `lib/affiliate-link-registry-db.js`
- Test: `test/affiliate-link-registry.test.js`

- [ ] Add runtime-safe table creation for affiliate partner links.
- [ ] Persist only approved/applied response URLs from existing applications.
- [ ] Ignore invalid or non-HTTPS URLs and human-required statuses.
- [ ] Add refresh/read functions with graceful DB failure handling.
- [ ] Run tests.

### Task 3: Automatic site integration
**Files:**
- Modify: `lib/affiliate-links.js`
- Modify: `start.js`

- [ ] Refresh approved partner links at startup and on a bounded interval.
- [ ] Override matching generic affiliate destinations with the stored legitimate tracking URL.
- [ ] Preserve existing environment-variable links as the next fallback.
- [ ] Keep the synchronous public helper API used by current routes/templates.
- [ ] Run full test suite.

### Task 4: Autonomous acquisition coverage
**Files:**
- Modify: `lib/openai-partner-adventure-agent.js`
- Modify: `lib/affiliate-application-executor.js`
- Test: existing affiliate tests plus new focused tests

- [ ] Expand verified target coverage with official partner URLs only.
- [ ] Ensure queued free applications are executed automatically.
- [ ] Retry recoverable failures with bounded attempts.
- [ ] Preserve human-required stop conditions.
- [ ] Run full suite.

### Task 5: Production verification
- [ ] Push to `main` in small commits.
- [ ] Verify GitHub CI on the resulting commit.
- [ ] Verify Render deployment reaches `live`.
- [ ] Inspect Render logs for AffiliateExecutor submission attempts and link-registry refresh.
- [ ] Verify no payment/identity bypass behavior was introduced.
