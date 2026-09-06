const crypto = require('node:crypto');
const { getSpecialistPolicy } = require('./agent-specialist-policy');

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== 'object') return value;
  return Object.keys(value).sort().reduce((out, key) => {
    out[key] = stable(value[key]);
    return out;
  }, {});
}

function workKey(item) {
  return crypto.createHash('sha256')
    .update(JSON.stringify(stable({
      agentId: item.agentId,
      capability: item.capability,
      target: item.target,
      payload: item.payload || {},
    })))
    .digest('hex');
}

function routeWork(work = []) {
  const routed = {};
  const seen = new Set();

  for (const item of work) {
    if (!item || !item.agentId || Number(item.dependencyReadiness ?? 1) <= 0) continue;

    let policy;
    try {
      policy = getSpecialistPolicy(item.agentId);
    } catch {
      continue;
    }

    const key = workKey(item);
    if (seen.has(key)) continue;
    seen.add(key);

    if (!routed[item.agentId]) routed[item.agentId] = [];
    if (routed[item.agentId].length < policy.maxBatchSize) routed[item.agentId].push(item);
  }

  for (const [agentId, items] of Object.entries(routed)) {
    items.sort((a, b) => {
      const av = Number(a.expectedRevenue) || 0;
      const bv = Number(b.expectedRevenue) || 0;
      return bv - av;
    });
    if (!items.length) delete routed[agentId];
  }

  return routed;
}

module.exports = { routeWork, stable, workKey };
