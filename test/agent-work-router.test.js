const test = require('node:test');
const assert = require('node:assert/strict');
const { routeWork } = require('../lib/agent-work-router');

test('routes revenue work to the best specialist and enforces its batch limit', () => {
  const work = Array.from({ length: 30 }, (_, index) => ({
    agentId: index % 2 === 0 ? 'autonomous-sales' : 'affiliate-ai',
    capability: index % 2 === 0 ? 'score_lead' : 'score_opportunity',
    target: `target-${index}`,
    expectedRevenue: index === 28 ? 500 : 10,
    confidence: 1,
    urgency: 1,
    effort: 1,
    dependencyReadiness: 1,
  }));

  const routed = routeWork(work);
  assert.equal(routed['autonomous-sales'].length, 15);
  assert.equal(routed['affiliate-ai'].length, 15);
  assert.equal(routed['autonomous-sales'][0].target, 'target-28');
});

test('fails closed for unsupported agents and blocked work', () => {
  const routed = routeWork([
    { agentId: 'unknown', capability: 'x', target: 'bad', expectedRevenue: 999 },
    { agentId: 'affiliate-ai', capability: 'score_opportunity', target: 'blocked', expectedRevenue: 999, dependencyReadiness: 0 },
  ]);
  assert.deepEqual(routed, {});
});

test('deduplicates identical work before routing', () => {
  const item = { agentId: 'affiliate-ai', capability: 'score_opportunity', target: 'same', expectedRevenue: 10, confidence: 1, urgency: 1, effort: 1, dependencyReadiness: 1 };
  const routed = routeWork([item, { ...item }, { ...item, target: 'other' }]);
  assert.equal(routed['affiliate-ai'].length, 2);
});
