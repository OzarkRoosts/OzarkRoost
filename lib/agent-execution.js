const RETRYABLE_ERRORS = new Set(['TIMEOUT', 'RATE_LIMIT', 'TEMPORARY_PROVIDER']);
const TERMINAL_STATES = new Set(['succeeded', 'blocked', 'failed', 'verified']);

const TRANSITIONS = Object.freeze({
  planned: new Set(['ready', 'blocked']),
  ready: new Set(['executing', 'blocked']),
  executing: new Set(['ready', 'succeeded', 'failed', 'blocked']),
  succeeded: new Set(['verified']),
  failed: new Set(['ready', 'blocked']),
  blocked: new Set(['ready']),
  verified: new Set(),
});

function canTransition(from, to) { return Boolean(TRANSITIONS[from] && TRANSITIONS[from].has(to)); }
function nextBackoffMs(attempt, baseMs = 1000, maxMs = 60000) { return Math.min(maxMs, baseMs * (2 ** Math.max(0, attempt - 1))); }
function classifyFailure(error) {
  const code = error && (error.code || error.reasonCode);
  return { code: code || 'UNKNOWN', retryable: RETRYABLE_ERRORS.has(code) };
}

class AgentExecutionEngine {
  constructor({ maxAttempts = 3, store = new Map(), now = () => new Date().toISOString() } = {}) {
    this.maxAttempts = maxAttempts;
    this.store = store;
    this.now = now;
  }

  submit(action) {
    const existing = this.store.get(action.idempotencyKey);
    if (existing) return existing;
    const record = { ...action, attempts: 0, createdAt: this.now(), updatedAt: this.now(), evidence: [], error: null, outcome: null };
    this.store.set(action.idempotencyKey, record);
    return record;
  }

  transition(action, state, patch = {}) {
    if (!canTransition(action.state, state)) throw new Error(`Invalid transition: ${action.state} -> ${state}`);
    Object.assign(action, patch, { state, updatedAt: this.now() });
    return action;
  }

  markFailure(action, error) {
    const failure = classifyFailure(error);
    action.attempts += 1;
    action.error = failure;
    if (failure.retryable && action.attempts < this.maxAttempts) return this.transition(action, 'ready', { retryAt: this.now() });
    return this.transition(action, failure.retryable ? 'blocked' : 'failed', { retryAt: null });
  }

  verify(action, evidence) {
    if (!evidence) throw new Error('Verification evidence is required');
    return this.transition(action, 'verified', { evidence: [...action.evidence, evidence], outcome: 'verified' });
  }
}

module.exports = { AgentExecutionEngine, TERMINAL_STATES, TRANSITIONS, canTransition, classifyFailure, nextBackoffMs };
