/**
 * Action Execution Engine
 *
 * Turns discovered opportunities into bounded, auditable actions.
 * Never claims success without a provider/database result.
 */
const pool = require('../db/index');

const state = {
  startedAt: new Date(),
  cycles: 0,
  attempted: 0,
  completed: 0,
  failed: 0,
  lastRunAt: null,
  lastError: null,
};

function now() { return new Date(); }

async function ensureQueueTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS action_execution_queue (
      id BIGSERIAL PRIMARY KEY,
      action_type TEXT NOT NULL,
      priority INTEGER NOT NULL DEFAULT 50,
      payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      status TEXT NOT NULL DEFAULT 'queued',
      attempts INTEGER NOT NULL DEFAULT 0,
      available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_error TEXT,
      provider_id TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS action_execution_queue_ready_idx
      ON action_execution_queue(status, priority DESC, available_at ASC);
  `);
}

async function enqueue({ action_type, payload = {}, priority = 50 }) {
  await ensureQueueTable();
  const result = await pool.query(
    `INSERT INTO action_execution_queue(action_type, priority, payload)
     VALUES($1,$2,$3) RETURNING id`,
    [action_type, priority, JSON.stringify(payload)]
  );
  return result.rows[0].id;
}

async function claim(limit = 10) {
  await ensureQueueTable();
  return pool.query(`
    WITH picked AS (
      SELECT id FROM action_execution_queue
      WHERE status='queued' AND available_at <= NOW()
      ORDER BY priority DESC, created_at ASC
      LIMIT $1
      FOR UPDATE SKIP LOCKED
    )
    UPDATE action_execution_queue q
    SET status='running', attempts=q.attempts+1, updated_at=NOW()
    FROM picked
    WHERE q.id=picked.id
    RETURNING q.*`, [limit]);
}

async function complete(id, providerId = null) {
  await pool.query(
    `UPDATE action_execution_queue SET status='completed', provider_id=$2, updated_at=NOW() WHERE id=$1`,
    [id, providerId]
  );
  state.completed++;
}

async function fail(id, error) {
  await pool.query(
    `UPDATE action_execution_queue
     SET status=CASE WHEN attempts >= 3 THEN 'failed' ELSE 'queued' END,
         last_error=$2, available_at=NOW() + INTERVAL '15 minutes', updated_at=NOW()
     WHERE id=$1`, [id, String(error?.message || error)]
  );
  state.failed++;
  state.lastError = String(error?.message || error);
}

function snapshot() {
  return { ...state, uptimeSeconds: Math.round((Date.now() - state.startedAt.getTime()) / 1000) };
}

async function run(executor, limit = 10) {
  state.cycles++;
  state.lastRunAt = now();
  const { rows } = await claim(limit);
  for (const item of rows) {
    state.attempted++;
    try {
      const result = await executor(item);
      await complete(item.id, result?.providerId || result?.messageId || null);
    } catch (error) {
      await fail(item.id, error);
    }
  }
  return { ...snapshot(), claimed: rows.length };
}

module.exports = { ensureQueueTable, enqueue, run, snapshot };
