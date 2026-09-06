function scoreOpportunity({ expectedRevenue = 0, confidence = 0, urgency = 0, effort = 1, reversibility = 1, dependencyReadiness = 1 }) {
  const revenue = Math.max(0, Number(expectedRevenue) || 0);
  const c = Math.max(0, Math.min(1, Number(confidence) || 0));
  const u = Math.max(0, Math.min(1, Number(urgency) || 0));
  const e = Math.max(0.1, Number(effort) || 1);
  const r = Math.max(0, Math.min(1, Number(reversibility) || 0));
  const d = Math.max(0, Math.min(1, Number(dependencyReadiness) || 0));
  const executable = d > 0;
  const score = executable ? (revenue * c * (0.5 + 0.5 * u) * (0.5 + 0.5 * r) * d) / e : 0;
  return Object.freeze({ score, forecastRevenue: revenue, confidence: c, dependencyReady: executable, realizedRevenue: 0 });
}

function compareOpportunities(a, b) { return scoreOpportunity(b).score - scoreOpportunity(a).score; }

module.exports = { scoreOpportunity, compareOpportunities };
