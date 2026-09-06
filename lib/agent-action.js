const crypto = require('node:crypto');
const { getAgent, isActionState } = require('./agent-contracts');

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== 'object') return value;
  return Object.keys(value).sort().reduce((out, key) => { out[key] = stable(value[key]); return out; }, {});
}

function createAction({ agentId, capability, target, payload = {}, state = 'planned' }) {
  const agent = getAgent(agentId);
  if (!agent) throw new Error(`Unknown agent: ${agentId}`);
  if (!agent.capabilities.includes(capability)) throw new Error(`Agent ${agentId} cannot ${capability}`);
  if (!isActionState(state)) throw new Error(`Invalid action state: ${state}`);
  const identity = JSON.stringify(stable({ agentId, capability, target, payload }));
  const idempotencyKey = crypto.createHash('sha256').update(identity).digest('hex');
  return Object.freeze({ idempotencyKey, agentId, capability, target, payload, state, riskClass: agent.riskClass });
}

module.exports = { createAction, stable };
