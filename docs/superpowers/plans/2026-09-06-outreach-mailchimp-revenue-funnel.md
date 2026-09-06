# OzarkRoost Outreach + Subscriber + Revenue Funnel

## Scope
- Keep cold business outreach separate from opted-in subscribers.
- Add a three-stage outreach sequence with reply, opt-out, and bounce suppression.
- Add explicit-consent subscriber capture and Mailchimp audience sync.
- Route monetizable destination CTAs through `/out` with source attribution.
- Add automated tests and Render-oriented production configuration.
- Remove stale Vercel runtime references without deleting historical Git history.

## Safety
- No secrets committed to GitHub.
- No cold prospects added to Mailchimp.
- No send after reply, opt-out, or bounce.
- Payment remains explicit customer action.

## Verification
- Red/green unit tests for pure funnel behavior.
- Full npm test suite through GitHub Actions.
- Production smoke checks after Render deployment.
- Final repository search for Vercel runtime references.
