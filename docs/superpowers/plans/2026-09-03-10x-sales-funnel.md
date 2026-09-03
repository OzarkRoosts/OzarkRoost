# 10x OzarkRoost Sales Funnel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn OzarkRoost from a healthy directory with a basic listing checkout into a populated, conversion-focused Ozarks marketplace that consistently presents the $49 Starter offer while preserving $99 Featured and $149 Dominant tiers and safe customer-initiated payment.

**Architecture:** Keep the existing Express/Postgres/Stripe architecture. Strengthen the existing listing funnel, sales/outreach tracking, and visitor discovery surfaces rather than adding a second billing system. Automate only reversible/low-risk operations; customer payment and external affiliate authorization remain explicit human/customer actions.

**Tech Stack:** Node.js, Express, EJS, PostgreSQL, Stripe Payment Links, existing email sender, existing affiliate widget system.

**Spec:** User-approved requirements in conversation: all Ozarks categories including adventures, camping, fishing, rentals, restaurants, lodging, attractions and sales/gear; affiliate links integrated; three paid listing tiers $49/$99/$149; focus on qualified paying business customers.

## Global Constraints

- Starter price is exactly $49/month.
- Featured price is exactly $99/month.
- Dominant price is exactly $149/month.
- Never claim payment without Stripe confirmation.
- Never charge a prospect off-session merely from an email reply.
- Never spend business funds or purchase affiliate placements automatically.
- Respect opt-outs and only use legitimate public business contact information.
- Affiliate program acceptance/OAuth/identity/legal attestations remain human-only.

## Tasks

- [ ] Add a conversion-first three-tier offer section with clear category coverage and value proof to the listing funnel.
- [ ] Expand business type selection and copy to cover lodging, restaurants, adventures, fishing, camping/RV, rentals, attractions/events and gear/services.
- [ ] Make outreach copy lead with the $49 Starter offer and clearly position $99/$149 upgrades.
- [ ] Persist sales email/conversation activity in the autonomous sales tables without changing payment safety rules.
- [ ] Add a simple funnel attribution path from outreach offer to listing submission and Stripe client reference.
- [ ] Add visitor-facing discovery links for adventure, camping, fishing and gear affiliate categories.
- [ ] Add regression tests for tier pricing, category coverage, opt-out behavior, and payment-state safety.
- [ ] Run the full test suite and verify the resulting branch before opening a PR.
