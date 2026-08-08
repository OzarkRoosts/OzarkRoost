# OzarkRoost

Minimal Node.js web app: Express server, EJS templates, PostgreSQL connection,
migration runner, Render deployment config.

## Requirements

- Node.js 20+
- PostgreSQL database

## Environment Variables

- `DATABASE_URL` — PostgreSQL connection string (required)
- `PORT` — Server port (default: 3000)
- `AFF_STAY22_URL`, `AFF_HIPCAMP_URL`, `AFF_GETYOURGUIDE_URL`, `AFF_VIATOR_URL`, `AFF_REI_URL` — affiliate tracking links

## Endpoints

- `GET /` — Landing page (renders `views/layout.ejs`)
- `GET /health` — Health check
- `GET /guides/*` — SEO destination guides

## Layout

```
views/
  layout.ejs           top-level template (entry point)
  guides/              SEO guide pages
  partials/            sections included from layout via <%- include('partials/<name>') %>
public/
  css/                 stylesheets, served at /css/<file>
lib/
  landing-context.js   builds the render context (slug, theme tokens, stylesheet links)
server.js              Express app
migrate.js             migration runner (run via `npm run migrate`)
```

## Local Development

```bash
npm install
DATABASE_URL="postgresql://..." npm run dev
```

## Deployment

**Host:** Render web service + hourly cron  
**Database:** Neon Postgres  

See `DEPLOY.md` for the full Neon + Render walkthrough.

`render.yaml` Blueprint creates the web service and nurture-email cron.
Set `DATABASE_URL` (Neon) and `APP_URL` in the Render dashboard.
