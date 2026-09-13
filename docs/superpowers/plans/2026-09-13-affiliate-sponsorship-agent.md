# OzarkRoost Partner & Sponsorship Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an additive, recurring Partner & Sponsorship Agent that discovers, scores, applies to, tracks, integrates, and verifies affiliate and sponsorship opportunities while preserving existing outreach, affiliate, Stripe, and production systems.

**Architecture:** Add focused modules around the repository's existing Node.js/Postgres conventions: a migration-backed partner registry, policy/idempotency layer, affiliate engine, sponsorship engine, attribution/event ledger, and a scheduler/orchestrator adapter. Existing email, `/out`, Stripe, Mailchimp, and outreach services remain the system of record for their domains; this feature coordinates them rather than replacing them.

**Tech Stack:** Node.js, PostgreSQL (`pg`), existing Express/server startup, existing test runner (`node --test`), existing web/email/Stripe infrastructure.

**Spec:** `docs/superpowers/specs/2026-09-13-affiliate-sponsorship-agent-design.md`

## Global Constraints

- Additive-only initial implementation; do not overwrite or delete working files unless a narrowly scoped compatibility change is demonstrated necessary and regression-tested.
- Never fabricate approval, commission terms, traffic, audience, sponsorship commitments, clicks, conversions, or revenue.
- Automate only applications/contact forms whose rules permit automation and whose required information is legitimately available.
- Human approval is required for contracts, paid commitments, legal attestations, identity/tax certification, refunds, and other irreversible owner-level commitments.
- Preserve cold-outreach suppression/reply/bounce/cooldown/physical-address protections and keep subscriber marketing consent separate.
- Preserve existing Stay22 and Travelpayouts integrations and `/out` attribution.
- Secrets must never be stored in partner records, logs, GitHub, or generated application copy.
- Render environment self-healing must use protected individual-variable operations and must never remove critical production credentials automatically.
- All recurring work must be idempotent, bounded, rate-limited, and auditable.

---

### Task 1: Baseline and test harness

**Files:**
- Create: `test/partner-agent.test.js`
- Create: `lib/partner-agent-test-helpers.js` only if existing test helpers cannot be reused

**Interfaces:**
- Tests will target exported pure functions and dependency-injected engine methods, avoiding live network/database calls.

- [ ] Write failing tests for lifecycle transitions, deduplication, policy gates, and revenue-verification rules.
- [ ] Run `npm test -- --test-name-pattern="partner"` and confirm the new tests fail for missing behavior.
- [ ] Keep test dependencies within the existing Node test runner.

### Task 2: Partner registry migration

**Files:**
- Create: `migrations/202609130001_partner_agent_registry.js`
- Create: `lib/partner-registry.js`
- Modify: only if required by an existing migration/startup integration; otherwise no existing file changes

**Interfaces:**
- `createPartnerOpportunity(input)`
- `getPartnerOpportunity(id)`
- `findPartnerOpportunityByKey(key)`
- `transitionPartnerOpportunity(id, state, metadata)`
- `appendPartnerEvent(input)`
- `listPendingPartnerActions(options)`

- [ ] Add failing tests for idempotent partner/program keys and valid lifecycle transitions.
- [ ] Verify migration shape against existing `_migrations` runner.
- [ ] Implement focused PostgreSQL tables for opportunities, applications, sponsorships, actions/events, and attribution as required by the spec.
- [ ] Add indexes for dedupe keys, state/next-action scans, and timestamps.
- [ ] Run migration-focused tests.

### Task 3: Policy, scoring, and application gate

**Files:**
- Create: `lib/partner-policy.js`
- Create: `lib/partner-scoring.js`
- Create: `lib/partner-application.js`

**Interfaces:**
- `scoreAffiliateCandidate(candidate, context)`
- `scoreSponsorshipCandidate(candidate, context)`
- `decideApplicationAction(candidate, policyContext)`
- `prepareAffiliateApplication(candidate, businessProfile)`
- `prepareSponsorshipPitch(candidate, businessProfile)`

- [ ] Add failing tests for automation-permitted vs human-required applications.
- [ ] Add failing tests preventing duplicate active applications and false claims.
- [ ] Implement deterministic scoring with explicit factors and bounded output.
- [ ] Implement policy decisions such as `auto_submit`, `needs_human`, `blocked`, and `already_active`.
- [ ] Implement copy preparation using only verified business facts.
- [ ] Run partner-agent tests.

### Task 4: Affiliate discovery and verification engine

**Files:**
- Create: `lib/affiliate-partner-engine.js`
- Create: `lib/affiliate-partner-sources.js`

**Interfaces:**
- `discoverAffiliatePrograms(context)`
- `qualifyAffiliatePrograms(candidates, context)`
- `prepareAffiliateApplications(candidates, context)`
- `verifyAffiliateIntegration(opportunity, context)`

- [ ] Add failing tests for normalization of partner/program URLs, duplicate discovery, and approval-state handling.
- [ ] Implement source adapters for public research results supplied to the engine.
- [ ] Normalize commission/terms only when explicitly supported by source data; otherwise leave unknown.
- [ ] Preserve Stay22 and Travelpayouts as existing integrations rather than replacing them.
- [ ] Add verification hooks for `/out` destination links without inventing click or commission data.
- [ ] Run focused tests.

### Task 5: Sponsorship discovery and compliant outreach engine

**Files:**
- Create: `lib/sponsorship-engine.js`
- Create: `lib/sponsorship-offers.js`

**Interfaces:**
- `discoverSponsors(context)`
- `qualifySponsors(candidates, context)`
- `prepareSponsorPitch(opportunity, context)`
- `queueSponsorOutreach(opportunity, context)`
- `recordSponsorResponse(opportunityId, event)`

- [ ] Add failing tests for sponsorship lifecycle, suppression, cooldown, and subscriber/cold-outreach separation.
- [ ] Reuse existing outreach sender interfaces through dependency injection; do not fork the mail transport.
- [ ] Implement sponsorship inventory using existing legitimate placements such as featured destination, lodging, restaurant, adventure, homepage, newsletter, regional page, social promotion, and campaign packages.
- [ ] Require verified facts and prohibit fabricated traffic/revenue claims.
- [ ] Ensure blocked human-required actions stop retry loops.
- [ ] Run focused tests.

### Task 6: Attribution and revenue ledger

**Files:**
- Create: `lib/partner-attribution.js`
- Create: `lib/partner-revenue.js`

**Interfaces:**
- `recordPartnerEvent(event)`
- `recordAffiliateAttribution(event)`
- `recordSponsorshipAttribution(event)`
- `markRevenueVerified(source, authoritativeRecord)`

- [ ] Add failing tests proving unverified activity cannot become verified revenue.
- [ ] Implement normalized events from discovery through application, approval, integration, exposure, click, conversion, payment, fulfillment, and renewal.
- [ ] Keep Stripe/affiliate-network authoritative records as the verification boundary.
- [ ] Add idempotency keys to prevent duplicate events.
- [ ] Run focused tests.

### Task 7: Recurring orchestrator and bounded scheduling

**Files:**
- Create: `lib/partner-agent.js`
- Create: `lib/partner-agent-scheduler.js`

**Interfaces:**
- `runPartnerAgentCycle(dependencies, options)`
- `schedulePartnerAgent(dependencies, options)`
- `runAffiliateCycle(...)`
- `runSponsorshipCycle(...)`

- [ ] Add failing tests for bounded work, retry cooldowns, idempotency, and human-action suppression.
- [ ] Implement `Discover → Score → Decide → Act → Verify → Track → Optimize` orchestration.
- [ ] Keep each cycle bounded by configurable limits and never launch unbounded outreach/application work.
- [ ] Add recurring startup scheduling using the repository's existing runtime conventions.
- [ ] Ensure a blocked action is surfaced once with a next-action timestamp instead of repeatedly attempted.
- [ ] Run all partner-agent tests.

### Task 8: Render environment self-healing adapter

**Files:**
- Create: `lib/partner-runtime-config.js`
- Create: `test/partner-runtime-config.test.js`

**Interfaces:**
- `detectPartnerRuntimeConfig(config, env)`
- `planProtectedEnvChanges(current, desired, policy)`
- `applyProtectedEnvChanges(renderAdapter, changes)`

- [ ] Add failing tests for add/update/remove decisions and critical-variable protection.
- [ ] Implement dependency-injected Render operations using individual env-var add/update/delete calls.
- [ ] Never log secret values or delete protected variables automatically.
- [ ] Preserve the agent's own Render credential and produce auditable non-secret change records.
- [ ] Add deploy/health verification hooks without hard-coding credentials.
- [ ] Run focused tests.

### Task 9: Operational endpoint/dashboard surface

**Files:**
- Create: `public/partner-command-center.html`
- Create: `test/partner-command-center.test.js`

**Interfaces:**
- Read-only presentation of partner pipeline, human-required actions, verified revenue, and last-cycle status.

- [ ] Add failing tests for exact state labels, revenue-verification wording, and $49/$99/$149 listing consistency where listing offers are shown.
- [ ] Implement additive static dashboard with no secret exposure and no fabricated metrics.
- [ ] Include separate affiliate and sponsorship queues plus human-required actions.
- [ ] Link to existing money command center rather than duplicating payment logic.
- [ ] Run dashboard tests.

### Task 10: Integration, regression, and rollout verification

**Files:**
- Create: `test/partner-agent-integration.test.js`
- Modify: only the smallest existing startup/config file if integration tests prove it is required

**Interfaces:**
- Production startup invokes the partner scheduler only when explicitly enabled and remains safe when disabled.

- [ ] Add failing integration tests for disabled-by-default behavior and safe activation.
- [ ] Wire the scheduler into the canonical startup path only after the isolated module tests pass.
- [ ] Run `npm test` and verify existing outreach/Stripe/affiliate tests remain green.
- [ ] Verify migration idempotency and startup health.
- [ ] Verify no secret values are present in logs, source, or partner records.
- [ ] Verify the recurring cycle produces auditable events without duplicate applications or uncontrolled outreach.
- [ ] Commit, request code review, and deploy only after verification evidence is clean.
