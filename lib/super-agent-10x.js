const { getAgent } = require('./agent-contracts');
const { planActions } = require('./agent-orchestrator');
const { AgentExecutionEngine } = require('./agent-execution');
const { recordOutcome } = require('./agent-learning');

class SuperAgent10x {
  constructor({ engine = new AgentExecutionEngine(), outcomes = [] } = {}) {
    this.engine = engine;
    this.outcomes = outcomes;
    this.agent = getAgent('superagent');
    if (!this.agent) throw new Error('SuperAgent contract is required');
  }

  plan(opportunities = []) {
    return planActions(opportunities).map(action => this.engine.submit(action));
  }

  async execute(action, executor) {
    if (!action || action.agentId === 'superagent') throw new Error('A specialist action is required');
    if (typeof executor !== 'function') throw new Error('An executor is required');

    if (action.state === 'planned') this.engine.transition(action, 'ready');
    this.engine.transition(action, 'executing');
    try {
      const result = await executor(action);
      if (!result || !result.evidence) throw Object.assign(new Error('Verification evidence is required'), { code: 'VERIFICATION_REQUIRED' });
      this.engine.transition(action, 'succeeded', { outcome: result });
      this.engine.verify(action, result.evidence);
      recordOutcome(this.outcomes, {
        actionId: action.idempotencyKey,
        agentId: action.agentId,
        target: action.target,
        status: 'verified',
        evidence: result.evidence,
        lesson: result.lesson || null,
        realizedRevenue: result.realizedRevenue || 0,
      });
      return action;
    } catch (error) {
      this.engine.markFailure(action, error);
      recordOutcome(this.outcomes, {
        actionId: action.idempotencyKey,
        agentId: action.agentId,
        target: action.target,
        status: action.state,
        evidence: null,
        lesson: error.message,
        realizedRevenue: 0,
      });
      throw error;
    }
  }
}

module.exports = { SuperAgent10x };
