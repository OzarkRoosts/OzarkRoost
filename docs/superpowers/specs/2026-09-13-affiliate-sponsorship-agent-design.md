# OzarkRoost Partner & Sponsorship Agent Design

## Goal
Create an additive revenue subsystem that continuously discovers relevant affiliate programs and sponsorship opportunities, prepares and submits permitted applications/outreach, tracks approvals and responses, and routes approved partners into measurable OzarkRoost monetization without replacing the existing outreach, affiliate, Stripe, or growth systems.

## Scope
The subsystem has two coordinated engines under one agent:

1. **Affiliate Growth Engine** — discover, score, apply to, track, integrate, and verify relevant affiliate partnerships.
2. **Sponsorship Engine** — discover qualified sponsors, personalize sponsorship opportunities, submit permitted applications/contact forms, manage compliant outreach, and track the opportunity through payment/placement.

Both engines share a partner/opportunity registry, policy layer, audit trail, scheduling, and revenue attribution events.

## Operating Model
The agent follows:

**Discover → Score → Decide → Act → Verify → Track → Optimize**

Actions are policy-gated. Research, scoring, record creation, link verification, and routine follow-up may be automated. Actions requiring legal acceptance, identity/tax certification, owner signatures, paid commitments, or information not legitimately available to the system require human approval.

The agent must never fabricate partner approval, commission terms, application status, sponsorship commitments, clicks, conversions, or revenue.

## Affiliate Engine

### Discovery
Sources may include public web research, partner directories, affiliate networks, existing site integrations, and approved connected tools. Candidates are normalized into a common record with:

- partner/program name
- category
- geographic relevance
- application URL
- program URL
- commission information when publicly available
- cookie/attribution terms when available
- approval requirements
- integration method
- terms/rules URL
- discovery source
- confidence

### Scoring
Prioritize programs by Ozark relevance, traveler intent, expected commercial value, integration effort, approval likelihood, and policy compatibility.

### Application lifecycle
`discovered → qualified → application_ready → submitted → approved | rejected | needs_human → integrated → verified`

The system may submit an application only when the destination permits automated submission and all required information is legitimately available. Otherwise it creates a human action with the exact missing requirement.

### Integration
Approved programs are mapped to relevant OzarkRoost destination/category pages and the existing `/out` attribution system. Links must be verified before being treated as active. Existing Stay22 and Travelpayouts integrations remain intact.

### Monitoring
The agent periodically checks active partner links, approval state, program changes, and measurable outbound performance. Broken, expired, or disallowed links are disabled from new placements and escalated when necessary.

## Sponsorship Engine

### Discovery
Identify businesses and brands that have a strong fit with OzarkRoost audiences, including lodging, outdoor recreation, travel, food, attractions, equipment, regional brands, financial/travel services, and other relevant advertisers.

### Opportunity types
Support:

- sponsored destination pages
- featured lodging
- featured restaurant
- featured adventure
- homepage placement
- newsletter sponsorship
- sponsored regional pages
- featured social promotion
- campaign packages

### Qualification
Score prospects by audience fit, geographic fit, estimated reach, business relevance, likelihood of response, and potential sponsorship value.

### Outreach
Use the existing compliant outbound email infrastructure and permitted web/contact forms. The engine must preserve opt-out, reply, suppression, bounce, cooldown, and physical-address requirements. Sponsorship outreach must not be mixed with opted-in subscriber marketing.

### Lifecycle
`discovered → qualified → pitch_ready → contacted → replied → negotiating → awaiting_human → contracted → paid → fulfilled → renewed`

The agent may prepare proposals and track opportunities, but must not accept binding legal terms or make paid commitments without owner authorization.

## Shared Revenue Attribution
Normalize events so the system can measure:

`partner discovered → application → approval → integration → page exposure → outbound click → lead/conversion → commission/payment`

and:

`sponsor discovered → pitch → reply → proposal → agreement → payment → placement → renewal`

Revenue remains unverified until supported by Stripe, affiliate-network reporting, or another authoritative payment/reporting source.

## Shared Storage
Use the application's existing persistence conventions. Add focused entities/tables only where required. Records should support idempotency, timestamps, source URLs, current state, next action, owner-review requirement, policy decision, and audit history.

Suggested logical records:

- `partner_opportunities`
- `partner_applications`
- `sponsorship_opportunities`
- `partner_actions`
- `partner_events`
- `partner_attribution`

Names should follow the repository's existing database conventions during implementation rather than forcing a new storage technology.

## Agent Capabilities
The agent should be able to use approved connected capabilities for:

- web research
- GitHub/code changes when explicitly authorized by the owner workflow
- Render configuration self-healing through the existing protected environment-variable mechanism
- email outreach
- affiliate/link verification
- Mailchimp only for explicitly opted-in subscriber marketing
- Stripe/payment verification
- analytics and SEO research
- social distribution where connected

Secrets must never be printed, committed, or included in application records. Critical production credentials remain protected from automatic deletion.

## Scheduling
Run discovery and verification on recurring schedules with bounded work per cycle. Use idempotency and cooldowns so retries cannot duplicate applications or outreach. Human-review queues should surface blocked actions instead of repeatedly attempting them.

## Safety and Compliance
- Respect each affiliate network's application, automation, disclosure, and traffic rules.
- Respect website robots, terms, rate limits, and form policies.
- Do not submit duplicate applications when an existing application is active.
- Do not impersonate the owner or falsely attest to qualifications.
- Do not invent tax, legal, audience, traffic, or revenue claims.
- Require human approval for contracts, paid sponsorship purchases, legal attestations, identity/tax certification, refunds, and other irreversible owner-level commitments.
- Preserve existing cold-outreach suppression and subscriber-consent boundaries.

## Additive-Only Constraint
Existing files and working systems must not be overwritten or deleted as part of the initial implementation unless a narrowly scoped compatibility change is demonstrated necessary, reviewed, and covered by regression tests. Prefer new modules, migrations, tests, and adapters.

## Success Criteria
1. Affiliate opportunities can be discovered, scored, deduplicated, and tracked.
2. Permitted affiliate applications can be prepared/submitted and verified without fabrication.
3. Approved affiliate programs can be mapped to measurable OzarkRoost outbound placements.
4. Sponsorship prospects can be discovered, scored, personalized, and tracked through the existing outreach infrastructure.
5. Human-required steps are explicit and non-repeating.
6. Partner activity and revenue are attributable and auditable.
7. Existing outreach, Stripe, affiliate, and production health behavior continues to pass regression tests.
8. The system can operate on a recurring schedule without generating duplicate submissions or uncontrolled outreach.
