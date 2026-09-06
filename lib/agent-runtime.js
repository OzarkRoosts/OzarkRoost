const { createAction } = require('./agent-action');
const { recordOutcome } = require('./agent-learning');
const { AgentExecutionEngine } = require('./agent-execution');

class AgentRuntime {
  constructor({ adapters = {}, outcomes = [], engine = new AgentExecutionEngine() } = {}) {
    this.adapters = adapters;
    this.outcomes = outcomes;
    this.engine = engine;
    this.completed = new Map();
  }

  async execute(input) {
    const action = input?.idempotencyKey
      ? input
      : createAction({
          agentId: input?.agentId,
          capability: input?.capability,
          target: input?.target,
          payload: input?.payload || {},
        });

    if (this.completed.has(action.idempotencyKey)) {
      return Object.freeze({ status: 'deduplicated', action, result: this.completed.get(action.idempotencyKey) });
    }

    const adapterKey = `${action.agentId}:${action.capability}`;
    const adapter = this.adapters[adapterKey];
    if (typeof adapter !== 'function') {
      const error = new Error(`Execution blocked: no adapter for ${adapterKey}`);
      error.code = 'ADAPTER_UNAVAILABLE';
      this._record(action, 'blocked', error.message);
      throw error;
    }

    if (action.state === 'planned') this.engine.transition(action, 'ready');
    this.engine.transition(action, 'executing');

    try {
      const result = await adapter(action);
      if (!result?.evidence) {
        const error = new Error('Execution blocked: verification evidence is required');
        error.code = 'VERIFICATION_REQUIRED';
        throw error;
      }
      this.engine.transition(action, 'succeeded', { outcome: result });
      this.engine.verify(action, result.evidence);
      this.completed.set(action.idempotencyKey, result);
      this._record(action, 'verified', null, result);
      return Object.freeze({ status: 'verified', action, result });
    } catch (error) {
      this.engine.markFailure(action, error);
      this._record(action, action.state, error.message);
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
