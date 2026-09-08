# OzarkRoost 10x Agent Architecture

**Status:** Approved architecture; implementation follows spec review.

## Goal
Upgrade every OzarkRoost bot/agent into a coordinated, measurable execution system that is materially faster, more capable, better informed, and more proactive while remaining compliant and permission-bounded.

## Scope
The upgrade covers the existing SuperAgent, OpsBot, affiliate agents/executors/strategist, autonomous sales, Marketing/SEO, Rover, partner discovery, payment/revenue monitoring, subscriber/outreach workflows, and shared runtime infrastructure. Existing destination, guide, affiliate-widget, and Render deployment work remains intact.

## Architecture
### 1. Shared intelligence layer
Create a common agent context contract containing current site state, business/catalog facts, destination inventory, monetization rules, partner/application state, recent outcomes, environment capability state, and operating policies. Agents consume structured context rather than repeatedly rediscovering the same information.

### 2. Agent registry and capability contracts
Every agent declares an identity, mission, capabilities, inputs, outputs, cadence, dependencies, risk class, and escalation policy. Capabilities are explicit so orchestration can select the right specialist and avoid duplicate work.

### 3. SuperAgent orchestration
SuperAgent becomes the coordinator: ingest signals, normalize them into opportunities/issues, score them, delegate to specialists, track execution, deduplicate overlapping work, recover retryable failures, and escalate actions that require human approval or unavailable credentials.

### 4. Revenue-first priority engine
Rank executable opportunities using expected revenue impact, confidence, urgency, effort, reversibility, and dependency readiness. Favor actions that can produce or protect revenue without sacrificing site reliability or compliance.

### 5. Execution engine
Standardize action lifecycle: planned -> ready -> executing -> succeeded/failed/blocked -> verified. Add idempotency keys, bounded retries with backoff, batching, caching where safe, timeout handling, dead-letter/blocked states, and outcome recording.

### 6. Knowledge and learning loop
Persist verified discoveries and outcomes. Agents record what was attempted, what happened, evidence, and reusable lessons. Future decisions use those results instead of treating every run as a blank slate.

### 7. Specialist missions
- **Affiliate AI:** discover, score, and optimize legitimate affiliate opportunities; distinguish estimated opportunity from realized revenue.
- **Affiliate Executor:** execute only actions permitted by policy and available credentials; report evidence and blockers.
- **Affiliate Ops/Strategist:** maintain partner/link health, application pipeline, gaps, and revenue opportunities.
- **Autonomous Sales:** find qualified business prospects, prioritize premium-listing opportunities, manage permitted outreach workflows, and protect against duplicate/spam contacts.
- **Marketing/SEO:** identify high-value content, technical SEO, indexing, internal-linking, and conversion opportunities and execute safe site changes.
- **OpsBot:** monitor operational health, email, payments, queues, environment readiness, and recovery opportunities.
- **SuperAgent:** coordinate all specialists and maintain the system-level priority queue.
- **Rover:** serve as the user-facing intelligence layer backed by the same verified shared context.

### 8. Observability / command center
Expose a machine-readable and human-readable operational view: agent health, last run, queue depth, opportunities, actions, failures, blockers, verified outcomes, conversion/revenue metrics, and escalation requirements. Never present estimates as realized revenue.

## Aggressive execution policy
"Aggressive" means high initiative and fast legitimate execution: continuously look for qualified revenue opportunities, recover failures, close stale gaps, improve conversion paths, and prioritize actions with measurable upside. It does not mean unsolicited bulk messaging, deceptive claims, fabricated approvals, bypassing partner rules, unauthorized financial transactions, or destructive infrastructure changes.

## Safety and authorization boundaries
- Never fabricate affiliate approvals, bookings, leads, revenue, or completed actions.
- Separate projected value from realized revenue.
- Respect opt-outs, consent, rate limits, affiliate terms, email/provider rules, and platform policies.
- Never send financial transactions or change financial credentials without explicit authorization and the required connected capability.
- Treat missing credentials as a blocked execution state with a precise remediation path.
- Destructive production actions require explicit human approval.
- All external side effects must be attributable to an agent/action record.

## Compatibility requirements
- Preserve existing routes and destination/guide behavior.
- Preserve the Render production deployment as canonical.
- Reuse existing Postgres/migration patterns.
- Reuse existing affiliate and email infrastructure where practical instead of creating duplicate systems.
- Existing integrations remain optional capabilities; agents must degrade gracefully when credentials or providers are unavailable.

## Success criteria
1. Every existing bot has a declared capability contract and shared context access.
2. SuperAgent can prioritize and delegate work without duplicate execution.
3. Actions are idempotent, observable, retryable where appropriate, and verifiable.
4. Revenue opportunity scoring clearly separates forecast from realized revenue.
5. Failed integrations become explicit blockers rather than silent/repeated failures.
6. Agent outcomes feed reusable knowledge.
7. Existing site behavior and Render deployment remain healthy.
8. Tests cover policy boundaries, orchestration, deduplication, retries, scoring, and key specialist behavior.

## Implementation sequencing
1. Shared contracts/context and persistent action/outcome model.
2. Execution/retry/idempotency layer.
3. Agent registry and SuperAgent orchestration.
4. Specialist upgrades in revenue/ops/marketing order.
5. Rover integration with shared intelligence.
6. Command center/observability.
7. Full regression, deployment verification, and production rollout.
