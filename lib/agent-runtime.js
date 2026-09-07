const { createAction } = require('./agent-action');
const { recordOutcome } = require('./agent-learning');
const { AgentExecutionEngine } = require('./agent-execution');
const { loadDefaultSpecialistAdapters } = require('./specialist-adapters');

class AgentRuntime {
  constructor({ adapters = null, outcomes = [], engine = new AgentExecutionEngine() } = {}) {
    this.adapters = adapters || loadDefaultSpecialistAdapters();
    this.outcomes = outcomes;
    this.engine = engine;
    this.completed = new Map();
  }

  async execute(input) {
    const spec = input?.action || input || {};
    const action = createAction({
      agentId: spec.agentId,
      capability: spec.capability,
      target: spec.target,
      payload: spec.payload || {},
      state: spec.state || 'planned',
    });
    const record = this.engine.submit(action);

    if (this.completed.has(record.idempotencyKey)) {
      return Object.freeze({ status: 'deduplicated', action: record, result: this.completed.get(record.idempotencyKey) });
    }

    const adapterKey = `${record.agentId}:${record.capability}`;
    const adapter = this.adapters[adapterKey];
    if (typeof adapter !== 'function') {
      const error = new Error(`Execution blocked: no adapter for ${adapterKey}`);
      error.code = 'ADAPTER_UNAVAILABLE';
      this._record(record, 'blocked', error.message);
      throw error;
    }

    if (record.state === 'planned') this.engine.transition(record, 'ready');
    this.engine.transition(record, 'executing');

    try {
      const result = await adapter(record);
      if (!result?.evidence) {
        const error = new Error('Execution blocked: verification evidence is required');
        error.code = 'VERIFICATION_REQUIRED';
        throw error;
      }
      this.engine.transition(record, 'succeeded', { outcome: result });
      this.engine.verify(record, result.evidence);
      this.completed.set(record.idempotencyKey, result);
      this._record(record, 'verified', null, result);
      return Object.freeze({ status: 'verified', action: record, result });
    } catch (error) {
      this.engine.markFailure(record, error);
      this._record(record, record.state, error.message);
      throw error;
    }
  }

  _record(action, status, lesson, result = null) {
    recordOutcome(this.outcomes, {
      actionId: action.idempotencyKey,
      agentId: action.agentId,
      target: action.target,
      status,
      evidence: result?.evidence || null,
      lesson: lesson || result?.lesson || null,
      realizedRevenue: Number(result?.realizedRevenue) || 0,
    });
  }
}

module.exports = { AgentRuntime };
