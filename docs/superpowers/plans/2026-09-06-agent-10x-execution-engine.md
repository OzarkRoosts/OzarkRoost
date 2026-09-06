# Agent 10x Execution Engine Plan

> **Execution:** TDD. Red test first, then minimal implementation, then green verification.

## Objective
Turn planned actions into durable, observable, retryable execution without allowing duplicate external side effects.

## Work
1. Add an action store abstraction backed by the existing Postgres layer where available, with an in-memory fallback for tests.
2. Persist idempotency key, agent, capability, target, state, attempts, timestamps, error class, evidence, and outcome.
3. Implement bounded retry with exponential backoff for explicitly retryable failures.
4. Convert missing credentials, policy restrictions, and unavailable providers into `blocked` with actionable reason codes.
5. Require verification evidence before transitioning an action to `verified`.
6. Add dead-letter handling for exhausted retryable actions.
7. Add outcome recording so later agent runs can learn from success/failure evidence.
8. Keep external side effects behind existing integration modules; the engine orchestrates rather than bypasses provider policies.

## Tests
- idempotent duplicate submissions
- valid lifecycle transitions
- retry bounds and backoff calculation
- blocked-state classification
- verification requirement
- dead-letter behavior
- outcome persistence and retrieval
- no secret leakage in action logs

## Rollout
Merge foundation first. Then migrate SuperAgent to the engine behind a feature flag, followed by affiliate execution, sales/outreach, marketing, OpsBot, and Rover. Verify the complete test suite and Render deployment after each production-facing phase.
