# Render-Native Revenue Command Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove Floot from the operating path and make OzarkRoost's GitHub→Render application the single source of truth for sales execution, revenue telemetry, and safe business outreach.

**Architecture:** Keep the existing Express/Postgres application as the only production control plane. Consolidate proactive business outreach onto `opsbot_sales_prospects`, make one executor authoritative, require a real provider message ID before recording a send, and expose the resulting state through authenticated server-rendered/admin endpoints rather than a separate dashboard product.

**Tech Stack:** Node.js 20, Express 4, PostgreSQL, EJS/static HTML, Nodemailer, existing migrations, Node test runner, GitHub Actions, Render.

**Spec:** Approved in-chat architecture on 2026-09-08: Floot removed; GitHub + Render canonical; qualified prospect→public business email→suppression/dedupe/cooldown→queue→claim→provider→message ID→event→dashboard→follow-up; inbound auto-replies fail closed; paid commitments require owner action.

## Global Constraints

- Floot is not a runtime dependency, deployment target, dashboard dependency, or source of truth.
- Render production remains the canonical deployment and GitHub `main` remains the source branch.
- No outbound commercial email is counted as sent without a real provider message ID.
- No outreach may bypass suppression, opt-out, bounce, cooldown, sender configuration, or compliance requirements.
- Cold business outreach remains separate from opted-in subscriber marketing.
- Paid commitments and purchases require explicit owner/customer action; automation may prepare them but may not silently commit money.
- Inbound email automation must never reply to arbitrary senders; only recognized business/listing/partnership/support/payment contexts may be eligible for a response, and bounce/opt-out signals stop future outreach.
- Tests must pass before production promotion.

---

### Task 1: Make `opsbot_sales_prospects` the sole proactive outreach source

**Files:**
- Modify: `lib/proactive-outreach.js`
- Modify: `lib/outreach-lead-seeder.js`
- Modify: `lib/aggressive-outreach-runner.js`
- Modify: `lib/local-outreach-agent.js`
- Test: `test/opsbot-outreach.test.js`
- Test: `test/aggressive-outreach-runner.test.js`

**Interfaces:**
- `proactive-outreach.run()` remains the only proactive sales entry point.
- `proactive-outreach.renderEmail(prospect, stage)` continues to produce subject/text/html.
- `aggressive-outreach-runner` is converted into a compatibility facade that delegates to `proactive-outreach` or is no longer started; it must not create a second queue.

- [ ] **Step 1: Add failing tests for the single-source rule.**

```js
test('proactive outreach uses opsbot_sales_prospects as its only sales source', () => {
  assert.match(worker, /FROM opsbot_sales_prospects/);
  assert.doesNotMatch(worker, /FROM local_outreach_prospects/);
});

test('aggressive runner does not enqueue a second local prospect pipeline', () => {
  assert.doesNotMatch(aggressive, /seedLocalProspects/);
  assert.doesNotMatch(aggressive, /FROM local_outreach_prospects/);
});
```

- [ ] **Step 2: Run the focused tests and verify the new assertions fail against the current duplicate pipeline.**

Run: `npm test -- --test-name-pattern="single-source|second local prospect"`
Expected: FAIL because the current aggressive runner imports the local seeder and queries `local_outreach_prospects`.

- [ ] **Step 3: Replace the duplicate aggressive queue path with a delegating compatibility runner.**

The compatibility module must call `proactiveOutreach.run()` and expose `start`, `runOnce`, and `snapshot`, while retaining only in-memory telemetry. It must not seed or query `local_outreach_prospects` and must not send mail itself.

- [ ] **Step 4: Stop `local-outreach-agent` from owning a production timer.**

Keep its public prospect data available for migration/seeding, but change `start()` to return a disabled/deprecation result unless an explicit compatibility environment flag is set. The production server must use `proactive-outreach` only.

- [ ] **Step 5: Update the lead seeder to seed `opsbot_sales_prospects` directly.**

Map the existing public business-contact tuples into the existing sales-prospect columns, preserve `source_url`, and use a unique normalized email/business key so repeated startup cycles cannot create duplicate sales targets.

- [ ] **Step 6: Run focused tests and commit.**

Run: `npm test -- --test-name-pattern="opsbot|outreach"`
Expected: PASS.

Commit: `refactor: consolidate proactive outreach onto sales prospects`

---

### Task 2: Enforce provider-message-ID truth and durable outreach state

**Files:**
- Modify: `lib/proactive-outreach.js`
- Create: `migrations/2026090801000_revenue_outreach_state.js`
- Test: `test/proactive-outreach-execution.test.js`

**Interfaces:**
- `proactive-outreach.run()` returns `{ sent, skipped, enabled, failed, blocked }`.
- A successful send records `provider_message_id`, `sent_at`, and the stage in durable state.
- A provider response without a message ID is treated as a failed/unknown delivery and is never recorded as `sent`.

- [ ] **Step 1: Write failing tests for missing message IDs and durable events.**

```js
test('provider acceptance without messageId is not a verified send', async () => {
  const result = await executeWithProviderResult({ messageId: null });
  assert.equal(result.verified, false);
});

test('verified send requires a provider message ID', () => {
  assert.match(source, /provider_message_id/);
  assert.match(source, /messageId/);
  assert.match(source, /sent/);
});
```

- [ ] **Step 2: Run focused tests and confirm failure.**

Run: `node --test test/proactive-outreach-execution.test.js`
Expected: FAIL until the durable send contract exists.

- [ ] **Step 3: Add the migration.**

Create `outreach_execution_events` with an identity, prospect ID, stage, recipient, provider message ID, status, error text, timestamps, and a unique provider-message-ID index. Add indexes for prospect/status and sent-at ordering.

- [ ] **Step 4: Make the sender fail closed.**

After `sendOutboundEmail`, require `info.messageId || info.message_id`. If absent, write a failed execution event and leave the prospect eligible for controlled retry rather than advancing the sequence.

- [ ] **Step 5: Record a verified event before advancing the prospect stage.**

Insert the durable event first; only after the insert succeeds update `outreach_stage`, `last_outreach_at`, and follow-up timing. If the event insert fails, do not mark the prospect as contacted.

- [ ] **Step 6: Run focused tests and commit.**

Run: `node --test test/proactive-outreach-execution.test.js`
Expected: PASS.

Commit: `feat: make outbound delivery evidence durable`

---

### Task 3: Harden suppression, dedupe, cooldown, opt-out, and bounce handling

**Files:**
- Modify: `lib/proactive-outreach.js`
- Modify: `lib/marketing-funnel.js`
- Modify: `migrations/2026090801000_revenue_outreach_state.js`
- Test: `test/proactive-outreach-execution.test.js`

**Interfaces:**
- `shouldSuppressOutreach(prospect)` remains the common suppression predicate.
- Every send checks normalized email suppression, prior verified events, last-contact cooldown, `opted_out`, `replied_at`, and `bounced_at` immediately before provider submission.

- [ ] **Step 1: Add failing tests for duplicate email, cooldown, reply, unsubscribe, and bounce.**

```js
test('a second send is blocked by the durable cooldown', async () => {
  const result = await decideForProspect({ last_outreach_at: new Date().toISOString() });
  assert.equal(result.allowed, false);
});

test('unsubscribe and bounce permanently suppress future stages', async () => {
  const result = await decideForProspect({ opted_out: true, bounced_at: new Date().toISOString() });
  assert.equal(result.allowed, false);
});
```

- [ ] **Step 2: Run the focused tests and verify they fail where current logic relies on incomplete local state.**

Run: `node --test test/proactive-outreach-execution.test.js`
Expected: FAIL for the new durable suppression cases.

- [ ] **Step 3: Add normalized email suppression and event checks.**

Use `LOWER(email)` consistently, consult `outreach_suppression`, and query durable successful events before submission. A prospect with any matching suppression, reply, bounce, or active cooldown is blocked.

- [ ] **Step 4: Expand inbound signal handling.**

Only mark a prospect as replied when the sender exactly matches a known prospect email and the inbound timestamp is at or after the latest verified outreach. Recognize unsubscribe and bounce phrases and persist those states.

- [ ] **Step 5: Run tests and commit.**

Run: `node --test test/proactive-outreach-execution.test.js test/opsbot-outreach.test.js`
Expected: PASS.

Commit: `fix: enforce durable outreach suppression and cooldowns`

---

### Task 4: Fail closed for arbitrary inbound email

**Files:**
- Modify: `lib/opsbot.js`
- Modify: `migrations/2026090802000_opsbot_inbound_safety.js`
- Test: `test/opsbot-inbound-safety.test.js`

**Interfaces:**
- `processInboundEmail(email)` may only send a reply when the sender maps to a known sales prospect, listing inquiry, affiliate/partnership record, or support flow.
- `isAuthorizedInboundSender(email)` is a pure helper used by the processor and tests.

- [ ] **Step 1: Write failing tests proving arbitrary senders cannot receive replies.**

```js
test('mailer-daemon is never an automated reply target', () => {
  assert.equal(isAuthorizedInboundSender({ sender: 'mailer-daemon@googlemail.com' }), false);
});

test('unknown sender is quarantined instead of replied to', () => {
  assert.equal(decideInboundAction({ sender: 'unknown@example.com', category: 'other' }), 'quarantine');
});
```

- [ ] **Step 2: Run the focused tests and verify failure.**

Run: `node --test test/opsbot-inbound-safety.test.js`
Expected: FAIL because current `processInboundEmail` can reply after classification regardless of sender provenance.

- [ ] **Step 3: Add an inbound authorization lookup.**

Match normalized sender against `opsbot_sales_prospects.email`, `operator_inquiries.email`, and existing support/listing records where available. Exclude known automated/bounce addresses and require a recognized record before any reply.

- [ ] **Step 4: Quarantine unknown messages.**

Set status to `quarantined`, record the classifier category and reason, and never call `sendEmail` for an unauthorized sender.

- [ ] **Step 5: Make unsubscribe/bounce messages update suppression before any other automation.**

If the sender is a known prospect and the body signals unsubscribe or bounce, update suppression state and return without generating a reply.

- [ ] **Step 6: Run tests and commit.**

Run: `node --test test/opsbot-inbound-safety.test.js`
Expected: PASS.

Commit: `fix: fail closed on unauthorized inbound email`

---

### Task 5: Build the native Render Command Center inside OzarkRoost

**Files:**
- Create: `public/command-center.html`
- Create: `routes/command-center-api.js`
- Modify: `server.js`
- Test: `test/command-center-api.test.js`

**Interfaces:**
- `GET /command-center` serves the native dashboard.
- `GET /api/command-center/summary` returns live DB-backed revenue, prospect, outreach, affiliate, and system execution metrics.
- `GET /api/command-center/outreach` returns stage counts, recent verified events, blocked reasons, and current queue state.
- All command-center APIs require `HEALTH_API_KEY` or `OPS_API_KEY`; no key means local-only access behavior must be explicit and documented.

- [ ] **Step 1: Write failing route tests.**

```js
test('command center exposes a protected summary endpoint', async () => {
  const res = await request('/api/command-center/summary');
  assert.equal(res.status, 401);
});

test('command center route exists', async () => {
  const res = await request('/command-center');
  assert.equal(res.status, 200);
});
```

- [ ] **Step 2: Run tests and verify failure.**

Run: `node --test test/command-center-api.test.js`
Expected: FAIL because the route does not yet exist.

- [ ] **Step 3: Implement authenticated JSON endpoints.**

Use parameterized SQL only. Summary fields must include realized paid listings/MRR, prospect counts by stage, verified sends, failed sends, suppressed prospects, follow-ups due, affiliate clicks, and site-health status. No forecast is presented as realized revenue.

- [ ] **Step 4: Build the native dashboard.**

Use the existing visual language from `public/monitor.html`, but make the page revenue-first: realized revenue, paid listings, verified sends, prospects by stage, next follow-ups, blockers, recent provider message IDs, traffic/affiliate signals, and health. Display exact blocker states instead of generic zeroes.

- [ ] **Step 5: Mount the route and API before static middleware conflicts.**

Register `/command-center` and `/api/command-center` in `server.js` after middleware initialization and before the generic static fallback where needed.

- [ ] **Step 6: Run tests and commit.**

Run: `npm test`
Expected: PASS.

Commit: `feat: add native Render revenue command center`

---

### Task 6: Remove Floot references and duplicate control-plane assumptions

**Files:**
- Modify: any remaining project docs/config discovered by repository search
- Test: `test/control-plane.test.js`

**Interfaces:**
- Repository contains no Floot runtime/build/deployment reference.
- Command Center links point to the Render-hosted application.

- [ ] **Step 1: Add a repository guard test.**

```js
test('production control plane does not reference Floot', () => {
  assert.equal(findProductionFlootReferences(), 0);
});
```

- [ ] **Step 2: Search the repository and run the guard.**

Run: `git grep -ni floot || true` and `node --test test/control-plane.test.js`
Expected: no production references and PASS after cleanup.

- [ ] **Step 3: Remove only genuine production/control-plane references found by the search.**

Do not delete historical troubleshooting notes unless they create a runtime/build dependency; keep history understandable while ensuring deployment/runtime code is Floot-free.

- [ ] **Step 4: Run full tests and commit.**

Run: `npm test`
Expected: PASS.

Commit: `chore: remove external dashboard control-plane dependency`

---

### Task 7: Production verification on Render

**Files:**
- Modify: `.github/workflows/test.yml` only if required to enforce the final test gate
- Test: production endpoints and Render deploy logs

**Interfaces:**
- GitHub Actions must pass on the implementation branch.
- Render must deploy the branch without startup failure.
- Production evidence must demonstrate the full outbound state transition or a precise fail-closed blocker.

- [ ] **Step 1: Run the complete local test suite.**

Run: `npm test`
Expected: all tests PASS.

- [ ] **Step 2: Push the implementation branch and wait for GitHub Actions.**

Expected: Node 20 install and test job PASS.

- [ ] **Step 3: Open/update the PR against `main` and verify the final diff.**

Expected: only the Render-native revenue/control-plane changes are included; no Floot dependency is introduced.

- [ ] **Step 4: Merge only after the branch is green and the change set is reviewed.**

Expected: `main` advances to the verified implementation commit and Render auto-deploys.

- [ ] **Step 5: Verify Render startup logs.**

Expected: migrations apply cleanly, one proactive outreach worker is active, no duplicate local-outreach timer is active, and OpsBot inbound monitor reports unauthorized messages as quarantined rather than replied to.

- [ ] **Step 6: Verify the command center against production APIs.**

Expected: the dashboard reports live database-backed values and distinguishes `verified`, `blocked`, `failed`, and `pending` states.

- [ ] **Step 7: Verify the end-to-end outreach acceptance test.**

Expected sequence: qualified real prospect exists → public business email stored → suppression/dedupe/cooldown passes → executable action runs → provider returns real message ID → durable event is written → prospect advances → follow-up is scheduled → command center increments verified sends.

- [ ] **Step 8: If provider credentials are absent, verify the fail-closed path instead of fabricating success.**

Expected: zero verified sends, an explicit sender-configuration blocker, and no prospect incorrectly marked contacted.

Commit: `chore: verify Render-native revenue control plane`
