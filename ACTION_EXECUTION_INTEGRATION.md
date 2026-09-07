# Action execution integration

The execution modules are intentionally isolated until the application startup and monitor routes are wired to them. This prevents a deploy from claiming that execution is active when only the queue library exists.

Required integration points:
- `server.js`: mount `routes/action-execution-api.js` at `/api/actions` and call `scripts/start-aggressive-outreach.js` after database startup/migrations.
- opportunity-producing agents: call `action-execution-engine.enqueue()` for actionable opportunities.
- monitor: read `/api/actions/status` and show execution counters separately from discovery counters.
