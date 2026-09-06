# Agent 10x Foundation Implementation Plan

> **Execution:** Use the TDD workflow. For every behavior, write the failing test first, verify the failure, implement the smallest change, verify green, then refactor.

**Goal:** establish the shared contracts that every OzarkRoost agent will use before changing production agent behavior.

## Phase 1 — Agent contracts
- Add `lib/agent-contracts.js` with canonical agent registry, mission, capabilities, dependencies, cadence, risk class, escalation policy, and action lifecycle states.
- Cover every existing core agent boundary: SuperAgent, Affiliate AI, Affiliate Executor, Affiliate Ops, Autonomous Sales, Marketing/SEO, OpsBot, Rover.
- Keep contracts pure and dependency-free so every runtime component can consume them.
- Tests: registry completeness, deterministic lookup, explicit side-effect risk classes, lifecycle validation.

## Phase 2 — Shared context contract
- Add a pure context builder that accepts site state, catalog facts, monetization rules, partner/application state, recent outcomes, environment capabilities, and operating policies.
- Normalize missing optional integrations into explicit capability states rather than errors.
- Tests: stable shape, omission-safe defaults, no secrets in serialized context.

## Phase 3 — Action identity and idempotency
- Add pure action normalization with agent ID, capability, target, payload hash, policy/risk class, and deterministic idempotency key.
- Tests: identical actions produce identical keys; materially different targets/payloads do not collide; sensitive payload fields are excluded from logs.

## Phase 4 — Revenue priority scoring
- Add deterministic scoring for expected impact, confidence, urgency, effort, reversibility, and dependency readiness.
- Return forecast metadata separately from realized revenue.
- Tests: higher verified revenue potential ranks higher when other factors are equal; blocked dependencies cannot outrank executable work; realized revenue is never inferred from forecast.

## Phase 5 — Integration seam
- Add a small orchestration interface that consumes contracts/context and returns planned actions without executing external side effects.
- Existing agents remain untouched until their specialist migration phases.
- Tests: unsupported capabilities become blocked actions; duplicate action requests collapse to one idempotent action.

## Verification
- Run targeted foundation tests first.
- Run the complete existing Node test suite.
- Inspect the resulting diff for accidental route, destination, affiliate-widget, or Render configuration changes.
- Only after green verification proceed to execution engine implementation.

## Rollout
1. Foundation branch and tests.
2. Execution/idempotency engine.
3. SuperAgent orchestration.
4. Specialist migrations.
5. Rover/shared intelligence.
6. Command center.
7. Full regression and Render deployment verification.
