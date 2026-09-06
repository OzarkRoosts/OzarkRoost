# Agent 10x Observability Plan

> **Execution:** TDD. Observability must never invent operational or revenue values.

## Objective
Provide a reliable command center for the user and agents.

## Work
1. Add machine-readable status aggregation for registry health, last run, queue depth, action counts, blockers, failures, evidence, and outcomes.
2. Add explicit forecast-vs-realized revenue fields and source metadata.
3. Add recent action timeline with agent, capability, target, state, attempt count, and blocker reason.
4. Add safe human-readable endpoint/view using existing application patterns.
5. Add alerts/escalations for persistent blockers, failed providers, stale queues, and degraded site health.
6. Ensure sensitive configuration values never appear in status output.

## Tests
- stable status schema
- correct state aggregation
- forecast and realized revenue separation
- secret redaction
- blocker/escalation detection
- graceful behavior when optional integrations are unavailable

## Rollout
Ship after specialist migrations so the command center reports the new lifecycle consistently, then verify against Render production state.
