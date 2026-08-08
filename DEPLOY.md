# Deploy OzarkRoost → Render + Neon

Leave Polsia. This app is built for **Render** (Node web + cron) and **Neon** (Postgres).

Repo: https://github.com/OzarkRoosts/OzarkRoost  
Branch: `main`

---

## 1) Neon database (5 min)

1. Open https://console.neon.tech and sign in (GitHub OK).
2. **New Project** → name `ozarkroost` → region closest to you (e.g. US East).
3. After create, open **Connection details**.
4. Copy the **pooled** connection string if shown (`-pooler` host), else the direct one.
5. It looks like:
   `postgresql://user:password@ep-xxxx.us-east-1.aws.neon.tech/neondb?sslmode=require`
6. Keep this secret — it is your `DATABASE_URL`.

Neon free tier is enough to start. Scale-to-zero is fine; `/health` does not hit the DB.

---

## 2) Render web service (8 min)

### Option A — Blueprint (recommended)

1. Open https://dashboard.render.com → sign in with **GitHub**.
2. **New** → **Blueprint**.
3. Connect **`OzarkRoosts/OzarkRoost`**, branch **`main`**.
4. Render reads `render.yaml` and creates:
   - Web service `ozarkroost`
   - Cron `ozarkroost-nurture-emails` (hourly nurture emails)
5. For every `sync: false` env var, paste values (see section 3).
6. Apply / create.

### Option B — Manual web service

1. **New** → **Web Service** → repo `OzarkRoosts/OzarkRoost` → branch `main`.
2. Runtime: **Node**.
3. Build command: `npm ci`
4. Pre-deploy command: `npm run migrate`
5. Start command: `npm start`
6. Health check path: `/health`
7. Plan: **Free** to test, or **Starter (~$7/mo)** so the site does not sleep.

### Optional cron (if not using Blueprint)

1. **New** → **Cron Job**
2. Same repo / branch
3. Schedule: `0 * * * *`
4. Build: `npm ci`
5. Command: `node jobs/send-nurture-emails.js`
6. Same `DATABASE_URL` + SMTP env vars as the web service

---

## 3) Environment variables (Render)

Set these on the **web** service (and cron where noted).

| Key | Required | Notes |
|-----|----------|--------|
| `DATABASE_URL` | **Yes** | Neon connection string |
| `NODE_ENV` | **Yes** | `production` (set in render.yaml) |
| `APP_URL` | **Yes** | Public HTTPS URL, e.g. `https://ozarkroost.onrender.com` — update after first deploy / custom domain |
| `STRIPE_SECRET_KEY` | If payments | Stripe secret |
| `STRIPE_WEBHOOK_SECRET` | If payments | From Stripe webhook endpoint |
| `STRIPE_PAYMENT_LINK_URL` | If payments | Owner listing payment link |
| `OPENAI_API_KEY` | If Rover | OpenAI key |
| `OPENAI_MODEL` | No | Default `gpt-4o-mini` |
| `SMTP_HOST` | Email | e.g. `smtp.gmail.com` (cron + web) |
| `SMTP_PORT` | Email | `587` |
| `SMTP_USER` | Email | SMTP user |
| `SMTP_PASS` | Email | App password |
| `EMAIL_FROM` | Email | e.g. `OzarkRoost <you@domain.com>` |
| `AFF_STAY22_URL` | Money | Tracked Stay22 / hotel link |
| `AFF_HIPCAMP_URL` | Money | Tracked Hipcamp |
| `AFF_GETYOURGUIDE_URL` | Money | Tracked GetYourGuide |
| `AFF_VIATOR_URL` | Money | Tracked Viator |
| `AFF_REI_URL` | Money | Tracked REI |
| `AUTONOMOUS_MODE` | No | Keep `false` until ready |
| `SUPERAGENT_ENABLED` | No | Keep `false` until ready |
| `MARKETING_ENABLED` | No | Keep `false` until ready |

Do **not** commit real secrets. Only set them in Render's UI.

---

## 4) First deploy checklist

1. Deploy finishes green in Render logs.
2. Open `https://YOUR-SERVICE.onrender.com/health` → `{"status":"healthy"}`
3. Open `/guides/hot-tub-cabins` → page loads (not 404).
4. Set `APP_URL` to the real Render URL (or custom domain), then **Manual Deploy** once more so sitemap/canonicals match.
5. Stripe (optional): webhook URL  
   `https://YOUR-SERVICE.onrender.com/webhooks/stripe`  
   Event: `checkout.session.completed`  
   Paste signing secret into `STRIPE_WEBHOOK_SECRET`.

---

## 5) Custom domain (later)

1. Render → service → **Settings** → **Custom Domains** → add `www.yourdomain.com`
2. Add the DNS records Render shows.
3. Free SSL is automatic.
4. Update `APP_URL` to `https://www.yourdomain.com` and redeploy.
5. Update Google Search Console property + sitemap to the new host.

---

## 6) Leave Polsia

After Render is healthy:

1. Point your real domain DNS away from Polsia (if any).
2. Turn off / delete the Polsia app so you are not double-billed or confused.
3. Ignore old `*.polsia.app` URLs.

---

## Local smoke test

```powershell
cd path\to\ozark
$env:DATABASE_URL="postgresql://...neon.tech/neondb?sslmode=require"
$env:APP_URL="http://localhost:3000"
npm.cmd ci
npm.cmd run migrate
npm.cmd start
```

Then open http://localhost:3000/health and http://localhost:3000/guides/hot-tub-cabins

---

## Cost guide

| Setup | Approx / month |
|-------|----------------|
| Render Free web + Neon Free | $0 (cold starts after idle) |
| Render Starter always-on + Neon Free | ~$7 |
| Growing traffic | ~$15–25 |

---

## Support files in repo

- `render.yaml` — Blueprint (web + nurture cron)
- `.env.example` — full env list
- `scripts/create_render_service.ps1` — optional local API helper (needs `RENDER_API_KEY`)
