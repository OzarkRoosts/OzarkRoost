Deploying OzarkRoost to Render

1) Connect repository
- Push this repository to GitHub/GitLab/Bitbucket and note the remote URL.
- In the Render dashboard, create a new Web Service and connect the repo.

2) Environment variables (required)
- `DATABASE_URL` — **required**. Set to your Postgres connection string.
- `NODE_ENV` — set to `production` (already in `render.yaml`).

Optional (recommended)
- `STRIPE_PAYMENT_LINK_URL` — pre-created Stripe payment link for owners.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` — SMTP for outgoing email.
- `POLSIA_ANALYTICS_SLUG`, `EMAIL_FROM` — analytics and sender identity.

3) Render service settings
- `buildCommand` is `npm install` (see `render.yaml`).
- `startCommand` is `npm run migrate && npm start` — migrations run at startup.
- Health check path: `/health`.

4) Local testing before deploy
PowerShell:
```powershell
$env:DATABASE_URL="postgres://user:pass@host:5432/dbname"
npm install
npm start
```

5) Deploy
- After connecting the repo and setting env vars in Render, click "Create Web Service".
- Render will run `npm install`, then on start run migrations and `server.js`.

Notes
- Do NOT commit real secrets to the repo. Use Render Secrets or the dashboard environment UI.
- If migrations should run separately (e.g., manual control), update `render.yaml` to remove `npm run migrate` from `startCommand`.

If you want, I can prepare a small Git commit message and the exact `git` commands to push these changes for you.
