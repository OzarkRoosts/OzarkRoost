# OzarkRoost 10× Growth & Operations Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an additive internal OzarkRoost growth-and-operations orchestrator that coordinates revenue, traffic, outreach, advertising, social, analytics, and Render configuration recovery without depending on Outside Agent credits.

**Architecture:** Add a small capability-driven Node.js orchestration layer to the existing application. Keep the authoritative proactive outreach scheduler as the sole outbound-email owner; the new system observes/schedules it through a single interface. Persist normalized runs/actions/events/config changes, expose an operational dashboard, and use provider adapters so unavailable connectors fail safely.

**Tech Stack:** Node.js, Express, PostgreSQL/`pg`, existing OzarkRoost modules, existing test runner (`node --test`), GitHub/Render/Mailchimp/Stripe integrations where authorized.

**Spec:** `docs/superpowers/specs/2026-09-12-10x-growth-agent-design.md`

## Global Constraints

- Additive-only implementation; do not overwrite or delete existing production files unless a task explicitly requires a minimal integration edit and preserves behavior.
- Existing proactive outreach remains the single production owner for local-business outbound email.
- Listing prices remain exactly `$49 / $99 / $149` unless the owner explicitly approves a pricing change.
- Cold-business outreach remains separate from opted-in subscriber marketing.
- Never claim provider success without provider evidence.
- Never log or persist secret values.
- Render environment-variable repair uses individual add/update/delete operations; routine bulk replacement is prohibited.
- Protected credentials and destructive production operations require explicit policy permission.
- External provider quotas and account permissions remain authoritative; the internal orchestrator removes Outside Agent credit dependency, not provider limits.

---

### Task 1: Establish isolated implementation branch and baseline

**Files:**
- Create: no production files; use a new Git branch based on the approved `main` commit.
- Test: existing repository test suite.

**Interfaces:**
- Consumes: `main` at the approved design baseline.
- Produces: isolated implementation branch and verified baseline test result.

- [ ] **Step 1: Create an implementation branch from current `main`.**

Use a branch named `feat/10x-growth-agent` from the current approved `main` commit. Do not merge the design-only PR into `main` as part of this task; the implementation branch should retain the approved design as its parent history.

- [ ] **Step 2: Run the existing test suite before changes.**

Run:

```bash
npm test
```

Expected: the repository's pre-change suite completes successfully. Record any pre-existing failures before implementation.

- [ ] **Step 3: Commit only branch setup if the repository requires a commit.**

Do not add production code in this task.

---

### Task 2: Add database-backed agent run/action/configuration state

**Files:**
- Create: `lib/agent-state.js`
- Create: `migrations/` migration using the repository's existing migration naming/pattern discovered during implementation.
- Create: `test/agent-state.test.js`

**Interfaces:**
- Consumes: existing `pg` database access/migration conventions.
- Produces:
  - `createAgentRun(input)` → run record
  - `finishAgentRun(runId, outcome)` → updated run
  - `recordAgentAction(input)` → action record
  - `recordGrowthEvent(input)` → event record
  - `recordConfigChange(input)` → sanitized configuration-change record

- [ ] **Step 1: Write failing tests for state creation and secret redaction.**

Tests must assert that run/action/event records can be created and that `recordConfigChange` never persists a supplied secret value, even when the caller includes one accidentally.

- [ ] **Step 2: Run the focused test file and verify failure.**

Run:

```bash
node --test test/agent-state.test.js
```

Expected: FAIL because the state module/tables do not yet exist.

- [ ] **Step 3: Inspect existing migration and DB patterns.**

Follow the existing migration conventions rather than introducing a second migration framework. Add only the focused tables from the spec: `agent_runs`, `agent_actions`, `growth_events`, and `config_changes`.

- [ ] **Step 4: Implement the minimal state module and migration.**

Use parameterized SQL. Store timestamps, statuses, provider/action identifiers, idempotency keys, sanitized summaries, evidence references, retry counts, and outcomes. Do not store plaintext environment-variable values.

- [ ] **Step 5: Run focused tests.**

Run:

```bash
node --test test/agent-state.test.js
```

Expected: PASS.

- [ ] **Step 6: Run migration tests/application startup checks.**

Run the repository's existing migration/startup test command and verify the new tables are created without altering existing tables unexpectedly.

- [ ] **Step 7: Commit.**

```bash
git add lib/agent-state.js migrations test/agent-state.test.js
git commit -m "feat: add agent operational state"
```

---

### Task 3: Add capability registry and policy engine

**Files:**
- Create: `lib/agent-capabilities.js`
- Create: `lib/agent-policy.js`
- Create: `test/agent-policy.test.js`

**Interfaces:**
- Consumes: adapter health/capability descriptors and environment/configuration state.
- Produces:
  - `registerCapability(name, descriptor)`
  - `getCapability(name)`
  - `listCapabilities()`
  - `evaluateAction(policyContext)` → `{ allowed, reason, requiresApproval }`

- [ ] **Step 1: Write failing policy tests.**

Cover: canonical listing-price protection; secret deletion protection; mass-outbound batch limits; database destructive-operation denial; and unavailable-provider denial. Also test that explicitly permitted low-risk actions are allowed.

- [ ] **Step 2: Run focused tests and verify failure.**

```bash
node --test test/agent-policy.test.js
```

Expected: FAIL.

- [ ] **Step 3: Implement capability registry.**

Use a provider-neutral descriptor containing capability name, provider, availability, permitted operations, health state, and a sanitized reason when unavailable.

- [ ] **Step 4: Implement policy evaluation.**

Default-deny protected operations. Enforce the exact `$49/$99/$149` pricing invariant, outreach safety limits, credential protection, and explicit approval requirements.

- [ ] **Step 5: Run tests and commit.**

```bash
node --test test/agent-policy.test.js

git add lib/agent-capabilities.js lib/agent-policy.js test/agent-policy.test.js
git commit -m "feat: add agent capability and safety policies"
```

---

### Task 4: Add provider-neutral adapter contracts

**Files:**
- Create: `lib/agent-adapters/index.js`
- Create: `lib/agent-adapters/github.js`
- Create: `lib/agent-adapters/render.js`
- Create: `lib/agent-adapters/stripe.js`
- Create: `lib/agent-adapters/mailchimp.js`
- Create: `lib/agent-adapters/web.js`
- Create: `test/agent-adapters.test.js`

**Interfaces:**
- Consumes: existing environment/configuration and provider clients available to the application.
- Produces adapters with consistent methods such as `health()`, `capabilities()`, and provider-specific read/action methods; unavailable credentials must return structured `unavailable` results rather than throwing opaque errors.

- [ ] **Step 1: Write adapter contract tests with mocked providers.**

Assert that each adapter reports capability availability, normalizes success/failure, and never returns secret values in its result payload.

- [ ] **Step 2: Run tests and verify failure.**

```bash
node --test test/agent-adapters.test.js
```

Expected: FAIL.

- [ ] **Step 3: Implement the adapter registry and narrow provider wrappers.**

Do not embed growth decisions in adapters. Adapters translate provider operations into normalized results only.

- [ ] **Step 4: Add safe unavailable behavior.**

A missing/unauthorized provider must report `available:false` and a sanitized reason. The orchestrator will decide whether to queue, pause, retry, or escalate.

- [ ] **Step 5: Run tests and commit.**

```bash
node --test test/agent-adapters.test.js
git add lib/agent-adapters test/agent-adapters.test.js
git commit -m "feat: add growth agent provider adapters"
```

---

### Task 5: Add Render environment-variable self-healing adapter

**Files:**
- Create: `lib/agent-render-config.js`
- Create: `test/agent-render-config.test.js`

**Interfaces:**
- Consumes: Render adapter and policy engine.
- Produces:
  - `listDirectEnvVars()`
  - `planEnvChange(change)`
  - `applyEnvChange(change)`
  - `verifyEnvChange(change, healthCheck)`

- [ ] **Step 1: Write failing lifecycle tests.**

Test add, update, and remove operations; protected-variable deletion denial; no plaintext secret in logs/results; and failed post-change health verification causing the operation to stop rather than silently report success.

- [ ] **Step 2: Run focused tests.**

```bash
node --test test/agent-render-config.test.js
```

Expected: FAIL.

- [ ] **Step 3: Implement individual Render mutations.**

Use the provider's direct variable endpoints for add/update/delete. Do not use bulk replacement for normal repair. Keep linked environment-group variables out of the direct-service mutation path.

- [ ] **Step 4: Implement protected-variable policy.**

Protect the agent's Render credential, database credentials, Stripe secrets, SMTP credentials, session secrets, and other owner-defined critical variables. Never expose values in action records.

- [ ] **Step 5: Add detect → diagnose → change → deploy → health-check → verify flow.**

The adapter must return evidence for each stage and support rollback/escalation when verification fails.

- [ ] **Step 6: Run tests and commit.**

```bash
node --test test/agent-render-config.test.js
git add lib/agent-render-config.js test/agent-render-config.test.js
git commit -m "feat: add safe Render config self-healing"
```

---

### Task 6: Add revenue/event normalization and priority engine

**Files:**
- Create: `lib/growth-events.js`
- Create: `lib/revenue-priority.js`
- Create: `test/growth-events.test.js`
- Create: `test/revenue-priority.test.js`

**Interfaces:**
- Consumes: normalized provider events and existing authoritative listing/outbound/outreach data.
- Produces:
  - `recordNormalizedEvent(event)`
  - `getRevenueSnapshot(window)`
  - `rankGrowthActions(actions)`

- [ ] **Step 1: Write failing event and priority tests.**

Cover visitor, outbound click, lead, reply, listing, payment, affiliate, and revenue events. Assert priority order: repair blockers → listing conversion → monetized traffic → free distribution/SEO → opted-in subscriber growth → paid/social optimization.

- [ ] **Step 2: Implement event normalization.**

Map source-specific events into the normalized growth-event model while retaining evidence/source identifiers.

- [ ] **Step 3: Implement revenue-first scoring.**

Score actions using expected value, confidence, effort, and risk. Never change listing prices.

- [ ] **Step 4: Run focused tests and commit.**

```bash
node --test test/growth-events.test.js test/revenue-priority.test.js
git add lib/growth-events.js lib/revenue-priority.js test/growth-events.test.js test/revenue-priority.test.js
git commit -m "feat: normalize growth events and prioritize revenue"
```

---

### Task 7: Integrate existing outreach without creating a second scheduler

**Files:**
- Create: `lib/agent-outreach-bridge.js`
- Create: `test/agent-outreach-bridge.test.js`
- Modify only if required: existing startup/scheduler integration point that already owns `lib/proactive-outreach.js`.

**Interfaces:**
- Consumes: authoritative proactive outreach worker.
- Produces: read/status/trigger interface that cannot create a competing timer or bypass suppression/cooldown/batch/address/provider checks.

- [ ] **Step 1: Write failing bridge tests.**

Assert that a bridge invocation delegates to the authoritative worker, respects existing gates, and cannot instantiate a second interval.

- [ ] **Step 2: Implement the bridge.**

Expose status and controlled execution while keeping the existing worker as the production owner.

- [ ] **Step 3: Run outreach regression tests.**

```bash
node --test test/agent-outreach-bridge.test.js test/opsbot-outreach.test.js
```

Expected: PASS.

- [ ] **Step 4: Commit.**

```bash
git add lib/agent-outreach-bridge.js test/agent-outreach-bridge.test.js
# include only the minimal existing integration file if a change is required
git commit -m "feat: bridge growth agent to authoritative outreach"
```

---

### Task 8: Add free-ad opportunity and submission engine

**Files:**
- Create: `lib/free-ad-engine.js`
- Create: `test/free-ad-engine.test.js`
- Extend/add data source under existing campaign data conventions without replacing `public/campaign/free-ad-opportunities.json`.

**Interfaces:**
- Consumes: verified opportunity records and web research results.
- Produces:
  - `discoverOpportunities(criteria)`
  - `prepareSubmission(opportunity, listing)`
  - `recordSubmissionEvidence(submission, evidence)`
  - `getDistributionStatus()`

- [ ] **Step 1: Write failing tests.**

Assert no submission is marked completed without evidence; duplicate submissions are prevented with idempotency keys; manual-review destinations are queued rather than falsely submitted; and opt-out/platform rules stop an action.

- [ ] **Step 2: Implement opportunity state and evidence handling.**

Reuse the existing advertising-hub data where possible and add database state only for mutable operational status.

- [ ] **Step 3: Implement preparation/tracking.**

Generate copy-ready descriptions, destination URLs, UTM metadata, and next-verification dates without pretending the destination accepted the listing.

- [ ] **Step 4: Run tests and commit.**

```bash
node --test test/free-ad-engine.test.js
git add lib/free-ad-engine.js test/free-ad-engine.test.js
git commit -m "feat: add verified free-ad distribution engine"
```

---

### Task 9: Add social campaign engine and connector-safe execution

**Files:**
- Create: `lib/social-campaign-engine.js`
- Create: `test/social-campaign-engine.test.js`

**Interfaces:**
- Consumes: campaign intents, approved copy/assets, connected social capability descriptors.
- Produces:
  - `createCampaignIntent(input)`
  - `queueCampaign(campaign)`
  - `executeCampaign(campaign)`
  - `pauseUnavailableCampaigns()`

- [ ] **Step 1: Write failing tests.**

Test destination posts, business features, free-listing offers, affiliate content, seasonal content, and upgrade promotions. Test that an unconnected Meta/social capability queues or pauses rather than claiming publication.

- [ ] **Step 2: Implement normalized campaign state.**

Keep channel-specific details behind adapters and attach UTM metadata for attribution.

- [ ] **Step 3: Implement connector-safe execution.**

Only call connected capabilities; normalize accepted/completed/verified states separately.

- [ ] **Step 4: Run tests and commit.**

```bash
node --test test/social-campaign-engine.test.js
git add lib/social-campaign-engine.js test/social-campaign-engine.test.js
git commit -m "feat: add connector-safe social campaigns"
```

---

### Task 10: Add Mailchimp consented-subscriber bridge

**Files:**
- Create: `lib/mailchimp-growth.js`
- Create: `test/mailchimp-growth.test.js`

**Interfaces:**
- Consumes: explicit-consent subscriber records and Mailchimp adapter.
- Produces:
  - `syncConsentedSubscriber(subscriber)`
  - `applySubscriberTags(subscriber, tags)`
  - `getSubscriberAutomationState()`

- [ ] **Step 1: Write failing consent-separation tests.**

Assert that cold-business prospects never enter the subscriber marketing path and only records with explicit consent can sync.

- [ ] **Step 2: Implement the bridge.**

Use stable subscriber identifiers and normalized Mailchimp results. Never copy secrets or unauthorized contacts.

- [ ] **Step 3: Run tests and commit.**

```bash
node --test test/mailchimp-growth.test.js
git add lib/mailchimp-growth.js test/mailchimp-growth.test.js
git commit -m "feat: add consented Mailchimp growth bridge"
```

---

### Task 11: Add orchestrator decision loop

**Files:**
- Create: `lib/growth-orchestrator.js`
- Create: `test/growth-orchestrator.test.js`

**Interfaces:**
- Consumes: capability registry, policy engine, state module, revenue priority, outreach bridge, free-ad engine, social engine, Mailchimp bridge, and Render config manager.
- Produces:
  - `runGrowthCycle(context)` → normalized run result
  - `planNextActions(context)` → ranked actions

- [ ] **Step 1: Write failing orchestration tests.**

Test the complete sequence: Discover → Decide → Act → Verify → Learn → Optimize. Test idempotency, unavailable providers, policy-denied actions, retries, and evidence-required success.

- [ ] **Step 2: Implement the orchestrator with explicit action boundaries.**

It must never directly call raw vendor APIs. Every external operation goes through an adapter/engine and policy evaluation.

- [ ] **Step 3: Add bounded retry/backoff.**

Classify authentication, authorization, rate-limit, transient, validation, configuration, and business-rule failures. Retry only transient/rate-limit classes within configured bounds.

- [ ] **Step 4: Run focused tests and commit.**

```bash
node --test test/growth-orchestrator.test.js
git add lib/growth-orchestrator.js test/growth-orchestrator.test.js
git commit -m "feat: add 10x growth orchestrator"
```

---

### Task 12: Add operational dashboard endpoints and UI

**Files:**
- Create: `routes/agent-growth-api.js`
- Create: `public/campaign/growth-command-center.html`
- Create: `test/growth-dashboard.test.js`
- Modify only if required: existing route registration file; add the route without replacing existing routes.

**Interfaces:**
- Consumes: revenue snapshot, growth events, agent runs/actions, distribution state, campaign state, Render health state.
- Produces dashboard sections for revenue, paid listings/MRR, affiliate clicks/value, qualified leads/replies, free-ad distribution, subscriber growth, social campaigns, SEO opportunities, Render health/deploy state, config changes, and failed/retrying actions.

- [ ] **Step 1: Write failing endpoint/UI tests.**

Assert that the API returns sanitized operational metrics and that protected configuration values are absent.

- [ ] **Step 2: Implement read-only dashboard API.**

Keep mutation endpoints out of the first dashboard slice; operational actions continue through the orchestrator/policy layer.

- [ ] **Step 3: Implement additive dashboard UI.**

Use existing OzarkRoost styling conventions and link to existing advertising/outreach surfaces instead of replacing them.

- [ ] **Step 4: Run tests and commit.**

```bash
node --test test/growth-dashboard.test.js
git add routes/agent-growth-api.js public/campaign/growth-command-center.html test/growth-dashboard.test.js
# include only the minimal route-registration edit if needed
git commit -m "feat: add growth command center"
```

---

### Task 13: Wire scheduling and configuration safely

**Files:**
- Create: `lib/agent-scheduler.js`
- Create: `test/agent-scheduler.test.js`
- Modify only if required: existing startup/automation registration point.

**Interfaces:**
- Consumes: orchestrator and existing automation conventions.
- Produces: one controlled recurring growth cycle with lock/idempotency protection.

- [ ] **Step 1: Write failing scheduler tests.**

Assert one active scheduler, no duplicate interval, safe pause on fatal configuration, and recovery after transient failure.

- [ ] **Step 2: Implement the scheduler.**

Use the existing automation framework when appropriate. Keep the growth cycle bounded and auditable.

- [ ] **Step 3: Add configuration keys only through additive configuration conventions.**

Document defaults in `.env.example` without inserting secrets. Keep all critical credentials protected.

- [ ] **Step 4: Run tests and commit.**

```bash
node --test test/agent-scheduler.test.js
git add lib/agent-scheduler.js test/agent-scheduler.test.js .env.example
# include startup integration only if required
git commit -m "feat: schedule controlled growth cycles"
```

---

### Task 14: End-to-end verification and production rollout

**Files:**
- Modify: only files required by verified failures from the preceding tasks.
- Test: full repository suite and targeted smoke checks.

**Interfaces:**
- Consumes: complete implementation branch.
- Produces: verified branch, PR, CI evidence, and production deployment evidence.

- [ ] **Step 1: Run the complete test suite.**

```bash
npm test
```

Expected: all applicable tests pass; any unrelated pre-existing failures are documented separately.

- [ ] **Step 2: Run focused regression tests for outreach, pricing, advertising hub, and the new agent modules.**

Verify that the existing `$49/$99/$149` pricing, outreach safety, advertising hub, and production route behavior remain intact.

- [ ] **Step 3: Review the diff for additive-only compliance.**

Check for accidental deletions, file replacements, credential exposure, Vercel reintroduction, duplicate outreach schedulers, or changes to canonical pricing.

- [ ] **Step 4: Open the implementation PR against `main`.**

The PR description must list tests, migrations, new capabilities, protected operations, and rollout behavior. Do not merge until CI is green and the diff has been reviewed.

- [ ] **Step 5: Verify CI and deployment.**

After merge, verify GitHub CI, Render deployment, application health, dashboard endpoint, existing advertising hub, and outreach health. Do not claim deployment success from a requested deploy alone; use provider evidence.

- [ ] **Step 6: Run a production dry-run of the orchestrator.**

Start with read/plan mode. Verify capability discovery, action ranking, safety gates, revenue metrics, and configuration inspection without making destructive changes or mass outbound actions.

- [ ] **Step 7: Enable only verified autonomous capabilities.**

Enable revenue/traffic measurement first, then free-ad/social execution only where provider authorization and destination rules permit. Preserve manual-review states for anything requiring owner approval.

- [ ] **Step 8: Commit final verification notes.**

Record exact test/deployment evidence in the PR; do not store secrets or sensitive provider payloads.

---

## Self-Review / Coverage Check

- Orchestrator: Task 11.
- Capability adapters: Task 4.
- Persistent operational state: Task 2.
- Revenue prioritization: Task 6.
- Existing outreach integration: Task 7.
- Free-ad distribution: Task 8.
- Social campaigns: Task 9.
- Mailchimp consent separation: Task 10.
- Render self-healing configuration: Task 5.
- Verification/observability: Tasks 2, 5, 11, 14.
- Dashboard: Task 12.
- Safety model: Task 3 plus per-task policy checks.
- Failure handling: Tasks 5 and 11.
- TDD: every implementation task starts with a failing test.
- Phased rollout: Tasks 1–6 establish foundations, Tasks 7–10 add growth capabilities, Tasks 11–13 enable orchestration, Task 14 verifies and rolls out.
- Non-goals: explicitly enforced through global constraints and policy tests.

## Execution Rule

Implementation must use either `superpowers:subagent-driven-development` or `superpowers:executing-plans`. No production implementation should begin until the execution mode is selected.