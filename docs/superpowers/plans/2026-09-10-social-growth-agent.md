# OzarkRoost Social Growth Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a safe, auditable social-growth agent that can queue and publish OzarkRoost content to Facebook, X, and TikTok after platform authorization, while tracking every action.

**Architecture:** Keep platform adapters isolated behind one social publisher interface. Store encrypted/opaque platform credentials only in Render environment variables, store content/job/audit state in Postgres, and expose owner-facing APIs for queue/status/retry. TikTok uses the official Content Posting API and remains disabled until its required app/scopes/audit are approved.

**Tech Stack:** Node.js, Express, PostgreSQL, native HTTPS, existing rate limiter/security middleware, Render environment variables.

**Spec:** Approved chat design for the OzarkRoost Social Growth Agent.

## Global Constraints

- Platforms: Facebook, X/Twitter, TikTok.
- No paid advertising, follower buying, spam, mass-DMs, or account-security changes.
- Preserve opt-out/reply protection and platform rate limits.
- All posts receive UTM attribution where links are included.
- Every publish attempt is auditable.
- TikTok must use official Content Posting API authorization and must not bypass review/audit restrictions.
- GitHub `main` -> Render remains production path.

---

### Task 1: Social job/audit data model

**Files:**
- Create: `migrations/20260910000100_social_growth_agent.js`

- [ ] Write migration for social connections, queued jobs, and publish audit events.
- [ ] Add uniqueness/idempotency keys for provider + external post/job IDs.
- [ ] Add indexes for due jobs, platform status, and audit lookup.
- [ ] Verify migration is compatible with the existing startup migration runner.
- [ ] Commit.

### Task 2: Platform adapters

**Files:**
- Create: `lib/social-growth-agent.js`

- [ ] Define provider-neutral publish contract.
- [ ] Implement X adapter using OAuth bearer/access-token environment configuration.
- [ ] Implement Facebook Page adapter using Meta Graph API Page access token configuration.
- [ ] Implement TikTok adapter using Content Posting API with explicit enable flag and required access token/app configuration.
- [ ] Implement safe request timeouts, rate-limit handling, and structured errors.
- [ ] Reject publishing when a provider is not authorized/configured rather than fabricating success.
- [ ] Add UTM normalization for OzarkRoost links.
- [ ] Add audit writes for queued, attempted, published, failed, and escalated states.

### Task 3: Owner-facing social API

**Files:**
- Create: `routes/social-growth.js`
- Modify: `server.js`

- [ ] Add authenticated/admin-gated queue endpoint.
- [ ] Add status endpoint showing configured/authorized state without exposing tokens.
- [ ] Add publish/retry endpoint with idempotency.
- [ ] Add queue endpoint for platform-specific content.
- [ ] Apply existing API rate limiter and security middleware.
- [ ] Mount route under `/api/social-growth`.

### Task 4: Agent behavior and scheduling

**Files:**
- Modify: `lib/social-growth-agent.js`
- Modify: `server.js`

- [ ] Add optional startup worker behind `SOCIAL_GROWTH_ENABLED=true`.
- [ ] Process due queued jobs with bounded concurrency.
- [ ] Never auto-publish if provider authorization is missing.
- [ ] Escalate risky/ambiguous actions instead of acting.
- [ ] Keep existing marketing/social draft functionality compatible.

### Task 5: Tests

**Files:**
- Create: `test/social-growth-agent.test.js`
- Create: `test/social-growth-api.test.js`

- [ ] Test provider selection and disabled-provider behavior.
- [ ] Test UTM generation and platform-specific payload construction.
- [ ] Test idempotency and retry behavior.
- [ ] Test secret redaction from API/status output and logs.
- [ ] Test TikTok's explicit authorization gate.
- [ ] Run the full Node test suite.

### Task 6: Render configuration and launch documentation

**Files:**
- Create: `docs/social-growth-agent.md`
- Modify: `.env.example`

- [ ] Document required Facebook, X, and TikTok credentials/scopes and safe configuration.
- [ ] Document TikTok audit/public-post requirements.
- [ ] Document launch order and emergency disable switch.
- [ ] Add placeholder environment variable names only; never commit credentials.
- [ ] Run tests and inspect deployment logs after pushing `main`.
