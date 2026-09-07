const SECRET_KEY = /(key|token|secret|password|authorization|cookie|credential|api[_-]?key)/i;
const MAX_TIMELINE = 100;

function redact(value) {
  if (Array.isArray(value)) return value.map(redact);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, SECRET_KEY.test(key) ? '[REDACTED]' : redact(item)]));
}

function normalizeRevenue(value) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

function createAgentObservability({ forecasts = [], now = () => new Date() } = {}) {
  const outcomes = [];
  const forecastEntries = Array.isArray(forecasts) ? forecasts : [];

  function record(outcome) {
    if (!outcome?.actionId || !outcome?.agentId || !outcome?.status) return null;
    const entry = {
      actionId: String(outcome.actionId),
      agentId: String(outcome.agentId),
      target: outcome.target || null,
      status: String(outcome.status),
      evidence: redact(outcome.evidence || null),
      lesson: outcome.lesson || null,
      realizedRevenue: normalizeRevenue(outcome.realizedRevenue),
      at: outcome.at || now().toISOString(),
    };
    outcomes.push(Object.freeze(entry));
    return entry;
  }

  function snapshot() {
    const counts = { total: outcomes.length, verified: 0, blocked: 0, failed: 0, other: 0 };
    const agents = {};
    let realized = 0;

    for (const outcome of outcomes) {
      if (Object.prototype.hasOwnProperty.call(counts, outcome.status)) counts[outcome.status] += 1;
      else counts.other += 1;
      realized += outcome.realizedRevenue;
      agents[outcome.agentId] ||= { total: 0, verified: 0, blocked: 0, failed: 0, realizedRevenue: 0 };
      agents[outcome.agentId].total += 1;
      if (Object.prototype.hasOwnProperty.call(agents[outcome.agentId], outcome.status)) agents[outcome.agentId][outcome.status] += 1;
      agents[outcome.agentId].realizedRevenue += outcome.realizedRevenue;
    }

    const forecast = forecastEntries.reduce((sum, item) => sum + normalizeRevenue(item?.amount), 0);
    const alerts = [];
    if (counts.blocked) alerts.push({ type: 'blocker', severity: 'warning', count: counts.blocked, message: `${counts.blocked} action(s) are blocked and need attention.` });
    if (counts.failed) alerts.push({ type: 'failure', severity: 'critical', count: counts.failed, message: `${counts.failed} action(s) failed.` });

    return {
      version: 1,
      generatedAt: now().toISOString(),
      actions: counts,
      agents,
      revenue: {
        forecast: { amount: forecast, source: forecastEntries.length ? 'configured_forecasts' : 'not_configured' },
        realized: { amount: realized, source: 'verified_outcomes' },
        gap: Math.max(0, forecast - realized),
      },
      alerts,
      timeline: outcomes.slice(-MAX_TIMELINE).reverse(),
    };
  }

  return { record, snapshot, outcomes };
}

const globalObservability = createAgentObservability();

module.exports = {
  createAgentObservability,
  globalObservability,
  redact,
};
