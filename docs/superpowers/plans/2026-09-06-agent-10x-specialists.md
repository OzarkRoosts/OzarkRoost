# Agent 10x Specialist Migration Plan

> **Execution:** TDD. Migrate one specialist at a time and preserve existing behavior until the new path is verified.

## Migration order
1. SuperAgent orchestration — consume registry/context, plan through execution engine, deduplicate, recover, escalate.
2. Affiliate AI + Strategist — use shared partner state and revenue scoring; clearly separate forecast from realized revenue.
3. Affiliate Executor/Ops — execute through policy-aware action engine; turn missing credentials and provider failures into explicit blockers.
4. Autonomous Sales — qualified prospect scoring, duplicate suppression, consent/opt-out protections, provider-aware outreach execution.
5. Marketing/SEO — opportunity scoring, safe content/SEO execution, verification and outcome feedback.
6. OpsBot — health/payment/email/queue monitoring with recovery actions routed through the same lifecycle.
7. Rover — answer and recommend from shared verified context and surface current blockers/metrics accurately.
8. Command center — expose agent health, queues, opportunities, actions, blockers, evidence, and realized revenue.

## Cross-cutting requirements
- No fabricated approvals, revenue, leads, or execution evidence.
- No bulk unsolicited outreach.
- No unauthorized financial actions.
- Destructive production changes remain human-approved.
- Existing integrations remain optional and degrade gracefully.
- Preserve Render as canonical production.

## Verification
Each migration requires targeted tests, full Node suite, diff review, and deployment verification before the next specialist is promoted.
