# Affiliate Autonomous Acquisition & Link Activation Design

## Goal
Allow OzarkRoost's affiliate system to discover, queue, and execute free/allowed partner onboarding automatically, then activate legitimate approved tracking URLs throughout the site without spending money or making human-only identity/legal attestations.

## Boundaries
- No purchases, paid subscriptions, paid plans, deposits, or financial credentials.
- No CAPTCHA, MFA, identity verification, government-ID, SSN, legal/authorized-representative attestations, or other human-only verification bypasses.
- Only official/verified partner domains and HTTPS URLs may be used.
- Never fabricate approval, commission terms, tracking IDs, or partnerships.
- Approved tracking URLs may automatically replace generic destination links where the partner status is `approved` or `applied` with a recorded response/tracking URL.

## Architecture
1. Affiliate discovery queues verified partner applications.
2. AffiliateExecutor attempts free web onboarding and records status, response URL, and errors.
3. A persistent database-backed partner-link registry stores only legitimate URLs tied to an application status.
4. The site affiliate-link helper refreshes that registry periodically and uses approved URLs automatically in existing bundles.
5. Existing templates continue to consume the same `getBundle`/`getWidget` interface.

## Success Criteria
- New eligible applications are attempted without manual intervention when their official flow is free and does not require prohibited verification.
- Recoverable failures are retried.
- Human-required flows remain clearly queued rather than falsely marked complete.
- Approved tracking URLs are automatically available to site templates.
- Existing affiliate links remain as safe fallbacks when no approved tracking URL exists.
- Tests cover eligibility, persistence/activation rules, URL validation, and fallback behavior.
