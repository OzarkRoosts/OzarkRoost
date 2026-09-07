const { globalObservability } = require('./agent-observability');

function recordOutcome(outcomes, { actionId, agentId, target, status, evidence = null, lesson = null, realizedRevenue = 0, at = new Date().toISOString() }) {
  if (!actionId || !agentId || !status) throw new Error('actionId, agentId, and status are required');
  const outcome = { actionId, agentId, target: target || null, status, evidence, lesson, realizedRevenue: Math.max(0, Number(realizedRevenue) || 0), at };
  outcomes.push(Object.freeze(outcome));
  globalObservability.record(outcome);
  return outcome;
}

function recentLessons(outcomes, agentId, limit = 10) {
  return outcomes.filter(item => item.agentId === agentId && item.lesson).slice(-limit).map(item => item.lesson);
}

module.exports = { recordOutcome, recentLessons };
