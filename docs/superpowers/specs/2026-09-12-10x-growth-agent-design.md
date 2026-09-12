# OzarkRoost 10× Growth & Operations Agent — Design

## Status
Approved by owner for design/spec work. Implementation remains gated on owner review of this written spec.

## Goal
Build an internal OzarkRoost growth-and-operations orchestrator that can coordinate the connected business tools without depending on Outside Agent credits. The system should prioritize measurable revenue and traffic while preserving the existing production flows, using additive-only changes unless the owner explicitly authorizes otherwise.

## Success criteria
- One internal orchestrator can coordinate discovery, decisions, actions, verification, learning, and optimization.
- Growth work is measurable end-to-end: visitor → landing page → outbound click → lead → reply → listing → payment → revenue.
- Outreach remains compliant and protected by suppression, reply, bounce, cooldown, batch, sender, and physical-address controls.
- Website subscribers remain separated from cold-business outreach and can flow through Mailchimp only with explicit consent.
- Free-ad distribution is tracked with evidence and never falsely reported as completed.
- Social campaigns can be planned/executed through connected providers when the account is actually connected; unavailable connectors fail safely.
- Render configuration can be detected and repaired by adding/updating/removing individual environment variables, with protected-variable safeguards and post-change health verification.
- Stripe revenue, affiliate activity, listings, outreach, traffic, and failures appear in one operational dashboard.
- Tool failures are observable and recoverable without silently fabricating success.
- The core system remains useful if any optional external connector is unavailable.

## Architecture

### 1. Orchestrator
A Node.js service/module inside the existing OzarkRoost application owns the decision loop:

**Discover → Decide → Act → Verify → Learn → Optimize**

It should be idempotent, rate-limited, auditable, and capable of pausing a capability independently when a provider is unavailable or a safety gate is triggered.

### 2. Capability adapters
Create narrow adapters around available capabilities rather than coupling business logic to vendor-specific APIs:

- GitHub: repository state, CI status, release/deploy evidence.
- Render: service health, deploy state, direct environment-variable lifecycle.
- Stripe: products, prices, payment state, listing revenue.
- Mailchimp: consented audience sync, tags, campaigns/automation state.
- Meta/social: campaign/page/social actions only when the connected account exposes the required capability.
- Ahrefs/SEO: keyword, visibility, competitor and opportunity signals.
- Airtable/analytics: optional operational/marketing data sources.
- Web research: free-ad opportunities, tourism/business directories, market research.
- Email: existing outbound transport and delivery verification.
- Image generation: campaign creative generation when useful.
- Automations: scheduling/recurring execution.

The adapter registry must expose capability availability and health. The orchestrator must never assume that a connected plugin is actually authorized for a particular action.

### 3. Persistent operational state
Use the existing database layer and add focused tables/modules for:

- `agent_runs` — run id, capability, status, started/completed, outcome, error class.
- `agent_actions` — idempotency key, action type, target, provider, status, evidence reference.
- `growth_opportunities` — source, category, URL, eligibility, discovered date, verification date, status.
- `ad_submissions` — opportunity, submission state, submitted URL/evidence, follow-up date.
- `campaigns` — channel, objective, audience class, status, budget/reference, UTM metadata.
- `growth_events` — normalized traffic, click, lead, reply, listing, payment, affiliate and revenue events.
- `config_changes` — variable key, add/update/remove action, reason, actor, deployment id, verification result; values are never stored in plaintext.

Existing outreach, billing, and subscriber tables remain authoritative where they already cover the same concern. Do not duplicate production truth without a defined reconciliation rule.

### 4. Revenue engine
Prioritize actions using expected value, confidence, effort, and risk. Initial priority order:

1. Repair blockers that prevent existing revenue/outreach from functioning.
2. Convert qualified businesses into the exact `$49 / $99 / $149` listing funnel.
3. Increase high-intent traffic and monetized `/out` affiliate clicks.
4. Expand legitimate free distribution and SEO opportunities.
5. Grow opted-in subscribers and nurture them.
6. Optimize social/paid campaigns after attribution exists.

The agent must never alter the three listing prices outside an explicitly approved pricing change.

### 5. Outreach engine integration
The existing authoritative proactive outreach worker remains the single production owner for local-business outbound email. The new orchestrator schedules/observes it rather than creating a competing timer.

Required controls remain:
- `OPSBOT_PROACTIVE_OUTREACH=true` gate.
- Sender configuration required.
- Physical address required.
- Suppression/reply/bounce protection.
- Cooldown and batch limits.
- Real provider message id required for success.
- First-touch → follow-up → final-offer sequence.
- Cold-business outreach separated from opted-in subscriber marketing.

### 6. Free-ad distribution engine
Maintain a structured opportunity registry with:

`site → submission URL → category → eligibility → date submitted → status → evidence URL → next verification date → notes`

The engine may discover and prepare legitimate submissions, but must respect destination rules, rate limits, opt-outs, and manual-review requirements. It must not claim an ad was submitted or accepted without evidence.

### 7. Social campaign engine
Normalize social work into campaign intents rather than hard-coding a single provider. It can prepare:
- destination posts
- business-feature posts
- free-listing offers
- affiliate content
- seasonal/event content
- listing upgrade promotions

The system should use connected Meta/social capabilities when available and queue or pause actions when the connector is not authorized.

### 8. Render self-healing configuration
The agent may manage direct service environment variables through individual add/update/delete operations. Render documents that these endpoints operate on direct service variables; linked environment-group variables are a separate surface. Bulk replacement must not be used for routine repair because omitted variables are removed. citeturn0search0turn0search1turn0search4turn0search5

Workflow:

**Detect → Diagnose → Plan change → Apply one or more protected mutations → Deploy → Health-check → Verify dependent capability → Record evidence → Roll back or escalate if unhealthy**

Rules:
- Never log secret values.
- Never commit credentials.
- Never delete protected variables automatically.
- Never remove the agent's own Render credential before a replacement is verified.
- Prefer individual variable mutations over bulk replacement.
- Treat linked environment groups separately.
- Do not modify unrelated infrastructure merely because it is visible.
- Destructive changes require an explicit policy allowance and a verified rollback path.

Render supports direct service-variable add/update/delete operations and separates those from environment-group variables; service changes may require an explicit deploy depending on the API path used. citeturn0search0turn0search1turn0search4

### 9. Verification and observability
Every external action gets:
- idempotency key
- provider/action name
- sanitized request summary
- timestamp
- status
- evidence/reference
- retry count
- final outcome

Health checks must distinguish:
- requested
- accepted by provider
- completed
- verified
- failed

No provider response means “success.”

### 10. Dashboard
Additive dashboard surfaces should show:
- revenue today / week / month
- paid listings and MRR
- affiliate outbound clicks and attributed value
- qualified leads, replies, and outreach state
- free-ad opportunities/submissions
- subscriber growth and consent status
- social campaign status
- traffic/SEO opportunities
- Render health and deployment state
- configuration changes
- failed/retrying actions

Use existing site styling and add new files/routes rather than overwriting existing pages.

## Safety model

The agent is autonomous within explicit policy boundaries, not unrestricted. Protected operations include:
- secrets and credentials
- payment/refund actions beyond configured policy
- database destructive operations
- production infrastructure deletion
- mass outbound beyond configured rate/batch policy
- irreversible repository history changes
- changes to the canonical listing prices

For high-risk operations, the agent should produce a proposed action and require owner approval unless a pre-approved policy explicitly permits the exact operation.

## Failure handling

Provider failures are classified as authentication, authorization, rate-limit, transient, validation, configuration, or business-rule failures. Retries use bounded exponential backoff and idempotency. Persistent failures become visible operator tasks with exact remediation context, without exposing secrets.

If an infrastructure/config change causes a health regression, the agent should stop related automation, attempt the predefined rollback, re-check health, and surface the result.

## Testing strategy

Use test-driven development for new modules:
- unit tests for decision policies and safety gates
- adapter contract tests with mocked provider responses
- database migration tests
- idempotency/retry tests
- secret-redaction tests
- environment-variable lifecycle tests
- outreach non-duplication tests
- consent-separation tests
- revenue-attribution tests
- end-to-end smoke tests for dashboard and key revenue paths

Production verification must include GitHub CI status, Render deployment/health evidence, and targeted live endpoint checks where available.

## Rollout

Phase 1: internal capability registry, run/action logging, policy engine, and Render configuration safety layer.

Phase 2: revenue/event normalization and dashboard metrics.

Phase 3: free-ad distribution and social campaign engines.

Phase 4: SEO/traffic optimization and cross-channel attribution.

Phase 5: automated learning/optimization and broader self-healing policies.

Each phase ships additively, is tested, and is verified before enabling the next autonomous capability.

## Non-goals
- Replacing the existing authoritative outreach scheduler.
- Replacing Stripe or Mailchimp with a custom payment/email platform.
- Making external provider quotas disappear; internal orchestration removes dependency on Outside Agent credits, but provider limits and account permissions still apply.
- Bulk-replacing Render environment variables as a normal repair strategy.
- Unsolicited spam, platform-rule bypassing, fake submissions, fake metrics, or fabricated provider success.
- Overwriting or deleting existing production files merely to implement the new architecture.
