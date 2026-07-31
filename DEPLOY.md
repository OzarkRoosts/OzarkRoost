Deploying OzarkRoost to Render

1) Connect repository
- Push this repository to GitHub/GitLab/Bitbucket and note the remote URL.
- In the Render dashboard, create a new Web Service and connect the repo.

2) Environment variables (required)
- `DATABASE_URL` - PostgreSQL connection string.
- `NODE_ENV` - production (declared in `render.yaml`).
- `STRIPE_SECRET_KEY` - Stripe secret key.
- `STRIPE_WEBHOOK_SECRET` - signing secret for `https://<service>/webhooks/stripe`.
- `STRIPE_PAYMENT_LINK_URL` - recurring Payment Link for owner listings.
- `OPENAI_API_KEY` - Rover assistant API key.
- `APP_URL` - public HTTPS base URL for payment and email links.

Optional: `OPENAI_MODEL` (defaults to `gpt-4o-mini`), `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `EMAIL_FROM` for email jobs.

3) Render service settings
- `buildCommand` is `npm ci`.
- `preDeployCommand` is `npm run migrate`.
- `startCommand` is `npm start`.
- Health check path: `/health`.

4) Stripe webhook
- In Stripe, create `https://<service>/webhooks/stripe` and subscribe to `checkout.session.completed`.
- Put the endpoint signing secret in `STRIPE_WEBHOOK_SECRET`.
- Listings activate only after Stripe sends a signed paid checkout event.

5) Local testing
```powershell
$env:DATABASE_URL="postgres://user:pass@host:5432/dbname"
npm.cmd run migrate
npm.cmd start
```

Do not commit real secrets. Configure them in Render's environment UI.
