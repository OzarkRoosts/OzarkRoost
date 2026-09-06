const test = require('node:test');
const assert = require('node:assert/strict');
const { scoreOpportunity, compareOpportunities } = require('../lib/agent-priority');

test('higher executable revenue potential ranks higher', () => {
  const low = { expectedRevenue: 10, confidence: 1, urgency: 1, effort: 1, reversibility: 1, dependencyReadiness: 1 };
  const high = { ...low, expectedRevenue: 100 };
  assert.ok(compareOpportunities(high, low) < 0);
  assert.ok(scoreOpportunity(high).score > scoreOpportunity(low).score);
});

test('blocked work receives zero executable priority', () => {
  const result = scoreOpportunity({ expectedRevenue: 10000, confidence: 1, urgency: 1, dependencyReadiness: 0 });
  assert.equal(result.score, 0);
  assert.equal(result.dependencyReady, false);
});

test('forecast never becomes realized revenue', () => {
  const result = scoreOpportunity({ expectedRevenue: 500, confidence: 1, dependencyReadiness: 1 });
  assert.equal(result.forecastRevenue, 500);
  assert.equal(result.realizedRevenue, 0);
});
