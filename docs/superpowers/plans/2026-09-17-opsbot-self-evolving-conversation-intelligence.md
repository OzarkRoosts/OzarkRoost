# OpsBot Self-Evolving Conversation Intelligence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn OpsBot from a template-driven email responder into a guarded, context-aware learning system that improves from real OzarkRoost conversations without allowing unverified learning to change production behavior automatically.

**Architecture:** A deterministic policy engine sits in front of and behind AI generation. A conversation-memory layer assembles recent thread context and durable contact state; a learning pipeline extracts structured lessons from completed interactions, scores them, and stores only approved/safe lessons for future prompts. Automated sending defaults to guarded mode, with complaints, removals, payment claims, low confidence, and contradictory context routed to review rather than guessed replies.

**Tech Stack:** Node.js, node:test, PostgreSQL, existing OpenAI/Groq client, existing OpsBot email/IMAP pipeline, Render runtime, GitHub main branch.

**Spec:** Existing OpsBot behavior in `lib/opsbot.js`, `lib/inbound-email-policy.js`, and `test/inbound-email-policy.test.js`.

## Global Constraints

- Never invent payment status, business facts, partnerships, prices, or claims from an email.
- A complaint or false-information report must not trigger sales language or an automatic payment reply.
- Explicit removal/opt-out requests suppress future promotional outreach.
- Automated senders and delivery failures never receive conversational replies.
- Learning is additive and structured; raw emails are not blindly copied into future prompts.
- New learned behavior is quarantined until confidence and safety checks pass.
- Existing `$49`, `$99`, and `$149` listing options remain unchanged.
- Production remains GitHub → Render; no Vercel/Floot production migration.
- Every behavior change gets a regression test before implementation.

---

### Task 1: Lock down the failure modes with tests

**Files:**
- Modify: `test/inbound-email-policy.test.js`
- Create: `test/opsbot-decision-engine.test.js`

**Interfaces:**
- Produces tests for `classifyInboundMessage(input)` and `decideReply(classification, state)`.

- [ ] **Step 1: Write failing tests** for complaint/false-information, removal request, payment claim without verified payment, contextual positive inquiry, automated sender, and low-confidence/unknown messages.
- [ ] **Step 2: Run `npm test` and confirm the new tests fail because the decision engine does not yet exist.
- [ ] **Step 3: Keep the tests deterministic; no network or model calls.
- [ ] **Step 4: Commit as `test: define OpsBot conversation safety decisions`.

### Task 2: Build the deterministic decision engine

**Files:**
- Create: `lib/opsbot-decision-engine.js`
- Test: `test/opsbot-decision-engine.test.js`

**Interfaces:**
- `classifyInboundMessage({ sender, subject, body }) -> { intent, confidence, signals }`
- `decideReply({ classification, state }) -> { action, reasonCodes, requireHuman, allowSales, allowPaymentClaims }`

- [ ] **Step 1: Implement only the minimum rules required by the failing tests.
- [ ] **Step 2: Add explicit intents for `complaint`, `false_information`, `removal_request`, `opt_out`, `payment_question`, `payment_claim`, `listing_inquiry`, `partnership_inquiry`, `support_request`, `automated`, and `unknown`.
- [ ] **Step 3: Make complaint/removal/payment-safety decisions deterministic before any AI-generated reply is considered.
- [ ] **Step 4: Run the focused tests and then `npm test`.
- [ ] **Step 5: Commit as `feat: add guarded OpsBot decision engine`.

### Task 3: Add durable conversation memory

**Files:**
- Create: `migrations/2026091700000_opsbot_conversation_memory.js`
- Create: `lib/opsbot-memory.js`
- Create: `test/opsbot-memory.test.js`

**Interfaces:**
- `getConversationState(client, threadKey) -> state`
- `recordConversationEvent(client, event) -> void`
- `upsertContactState(client, contact) -> void`

- [ ] **Step 1: Write failing persistence/normalization tests.
- [ ] **Step 2: Run focused tests and confirm failure.
- [ ] **Step 3: Add tables for conversation state/events, including sender, thread key, intent, outcome, suppression flag, last response hash, and timestamps.
- [ ] **Step 4: Implement memory helpers with parameterized SQL and safe defaults when no prior state exists.
- [ ] **Step 5: Run focused tests plus the existing suite.
- [ ] **Step 6: Commit as `feat: add OpsBot conversation memory`.

### Task 4: Add a guarded learning system

**Files:**
- Create: `migrations/2026091700100_opsbot_learning.js`
- Create: `lib/opsbot-learning.js`
- Create: `test/opsbot-learning.test.js`

**Interfaces:**
- `extractLesson({ inbound, outbound, outcome }) -> lessonCandidate`
- `scoreLesson(lessonCandidate) -> { confidence, safety, status }`
- `buildLearningContext(approvedLessons, limit) -> string`

- [ ] **Step 1: Write failing tests proving repeated successful patterns can become candidates while unsafe/one-off claims remain quarantined.
- [ ] **Step 2: Run focused tests and confirm failure.
- [ ] **Step 3: Store structured lessons with category, trigger, response principle, evidence count, confidence, status, and created/approved timestamps.
- [ ] **Step 4: Ensure no lesson can directly mutate prices, policies, payment claims, suppression rules, or business facts.
- [ ] **Step 5: Build a compact learning context for future replies using approved lessons only.
- [ ] **Step 6: Run tests and commit as `feat: add guarded OpsBot learning loop`.

### Task 5: Integrate memory + decisions + learning into inbound email processing

**Files:**
- Modify: `lib/opsbot.js`
- Modify: `lib/inbound-email-policy.js` if needed
- Test: `test/opsbot-integration.test.js`

**Interfaces:**
- `processInboundEmail(email)` must load state, classify, decide, generate only when permitted, validate the draft against the decision, then send or queue for review.

- [ ] **Step 1: Write failing integration tests reproducing the Buffalo-style false-information complaint and proving no payment/sales reply is sent.
- [ ] **Step 2: Run the focused integration test and confirm failure against current template behavior.
- [ ] **Step 3: Refactor inbound processing to load thread/contact state before generating a reply.
- [ ] **Step 4: Add a post-generation policy gate that rejects drafts containing unsupported payment claims or sales language when the decision forbids it.
- [ ] **Step 5: Record every decision and outcome for future learning.
- [ ] **Step 6: Keep automated replies disabled for complaint, removal, payment-claim, unknown, and low-confidence cases unless explicitly configured otherwise.
- [ ] **Step 7: Run the full suite and commit as `feat: integrate self-evolving OpsBot conversation loop`.

### Task 6: Prevent repetitive and context-blind outreach

**Files:**
- Modify: `lib/opsbot.js`
- Test: `test/opsbot-outreach-guard.test.js`

**Interfaces:**
- Outreach must check suppression, recent-contact cooldown, prior outcome, and conversation intent before sending.

- [ ] **Step 1: Write failing tests for opt-out suppression, duplicate follow-up prevention, and context-aware continuation.
- [ ] **Step 2: Run focused tests and confirm failure.
- [ ] **Step 3: Add deterministic suppression/cooldown checks before `sendEmail`.
- [ ] **Step 4: Generate follow-ups from conversation state rather than a fixed template alone.
- [ ] **Step 5: Run the full suite and commit as `fix: make OpsBot outreach context aware`.

### Task 7: Add safe operating modes and observability

**Files:**
- Modify: `lib/opsbot.js`
- Create: `docs/opsbot-self-evolving.md`
- Test: `test/opsbot-runtime-policy.test.js`

**Interfaces:**
- `OPSBOT_AUTOREPLY_MODE=review|guarded|auto`, default `review`.
- `OPSBOT_AUTO_SEND_MIN_CONFIDENCE`, default `0.90`.
- `OPSBOT_LEARNING_ENABLED`, default `true`.

- [ ] **Step 1: Write failing configuration tests.
- [ ] **Step 2: Run focused tests and confirm failure.
- [ ] **Step 3: Implement safe defaults and structured decision logs.
- [ ] **Step 4: Document how approved lessons, review items, suppressions, and sent replies are audited.
- [ ] **Step 5: Run the full suite and commit as `feat: add OpsBot safe runtime controls`.

### Task 8: Verify production readiness

**Files:**
- No production code changes unless verification finds a defect.

- [ ] **Step 1: Run `npm test` on the complete suite.
- [ ] **Step 2: Run `npm run build`.
- [ ] **Step 3: Verify migrations are included in the existing startup migration flow.
- [ ] **Step 4: Inspect the final diff and confirm no Vercel/Floot production path was introduced.
- [ ] **Step 5: Deploy through the existing Render main-branch path only after all tests pass.
- [ ] **Step 6: Verify Render startup, migration success, OpsBot mode, and absence of automatic replies to automated/bounce traffic.
- [ ] **Step 7: Verify the Buffalo-style regression remains blocked from automatic payment/sales replies.
