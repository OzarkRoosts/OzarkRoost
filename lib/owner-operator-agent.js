/**
 * OzarkRoost Owner-Operator Agent
 *
 * A persistent executive layer over the existing SuperAgent/OpsBot/affiliate
 * systems. It is intentionally local-first: decisions can be queued while
 * offline and executed through authenticated connectors after reconnection.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { decide, withOverrides } = require('./owner-operator-policy');

const DATA_DIR = process.env.OWNER_AGENT_DATA_DIR || path.join(process.cwd(), 'data');
const QUEUE_FILE = path.join(DATA_DIR, 'owner-agent-queue.json');
const JOURNAL_FILE = path.join(DATA_DIR, 'owner-agent-journal.jsonl');
const MAX_QUEUE = Number(process.env.OWNER_AGENT_MAX_QUEUE || 500);

let started = false;
let timer = null;
let state = {
  mode: 'offline-capable',
  started_at: null,
  last_tick: null,
  queued: 0,
  completed: 0,
  failed: 0,
};

function ensureDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readQueue() {
  ensureDir();
  try {
    const parsed = JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function writeQueue(queue) {
  ensureDir();
  const tmp = QUEUE_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(queue.slice(-MAX_QUEUE), null, 2));
  fs.renameSync(tmp, QUEUE_FILE);
}

function journal(event, data = {}) {
  ensureDir();
  fs.appendFileSync(JOURNAL_FILE, JSON.stringify({
    ts: new Date().toISOString(),
    event,
    ...data,
  }) + '\n');
}

function createTask(input = {}) {
  const action = String(input.action || '').trim().toLowerCase();
  const policy = withOverrides(input.policy);
  const authorization = decide(action, policy);
  const task = {
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    action,
    goal: String(input.goal || '').slice(0, 2000),
    context: input.context || {},
    priority: Number.isFinite(input.priority) ? input.priority : 50,
    authorization,
    status: authorization.decision === 'deny' ? 'denied' : authorization.decision === 'approval_required' ? 'awaiting_approval' : 'queued',
    attempts: 0,
  };
  if (task.status === 'denied') {
    journal('task_denied', { id: task.id, action, reason: authorization.reason });
    return task;
  }
  const queue = readQueue();
  queue.push(task);
  queue.sort((a, b) => b.priority - a.priority || a.created_at.localeCompare(b.created_at));
  writeQueue(queue);
  state.queued = queue.length;
  journal('task_queued', { id: task.id, action, priority: task.priority });
  return task;
}

function listTasks() {
  const queue = readQueue();
  state.queued = queue.length;
  return queue;
}

function approveTask(id) {
  const queue = readQueue();
  const task = queue.find(t => t.id === id);
  if (!task) return null;
  if (task.status !== 'awaiting_approval') return task;
  task.status = 'queued';
  task.approved_at = new Date().toISOString();
  writeQueue(queue);
  journal('task_approved', { id, action: task.action });
  return task;
}

async function executeTask(task, executor) {
  if (task.status !== 'queued') return task;
  task.attempts += 1;
  try {
    const result = await executor(task);
    task.status = 'completed';
    task.completed_at = new Date().toISOString();
    task.result = result;
    state.completed += 1;
    journal('task_completed', { id: task.id, action: task.action });
  } catch (err) {
    task.status = task.attempts >= 3 ? 'failed' : 'queued';
    task.error = String(err?.message || err);
    if (task.status === 'failed') state.failed += 1;
    journal('task_error', { id: task.id, action: task.action, error: task.error, attempts: task.attempts });
  }
  return task;
}

async function tick(executor) {
  state.last_tick = new Date().toISOString();
  const queue = readQueue();
  const next = queue.find(t => t.status === 'queued');
  if (next && typeof executor === 'function') await executeTask(next, executor);
  writeQueue(queue.filter(t => !['completed', 'failed', 'denied'].includes(t.status)));
  state.queued = readQueue().length;
  return state;
}

function getStatus() {
  return { ...state, policy: 'delegated-owner', queue_file: QUEUE_FILE };
}

function start(options = {}) {
  if (started) return getStatus();
  ensureDir();
  started = true;
  state.started_at = new Date().toISOString();
  const interval = Number(options.intervalMs || process.env.OWNER_AGENT_INTERVAL_MS || 60_000);
  const executor = options.executor;
  timer = setInterval(() => tick(executor).catch(err => journal('tick_error', { error: String(err?.message || err) })), interval);
  if (typeof timer.unref === 'function') timer.unref();
  journal('agent_started', { interval_ms: interval });
  return getStatus();
}

function stop() {
  if (timer) clearInterval(timer);
  timer = null;
  started = false;
  journal('agent_stopped');
}

module.exports = { start, stop, getStatus, createTask, listTasks, approveTask, executeTask, tick };
