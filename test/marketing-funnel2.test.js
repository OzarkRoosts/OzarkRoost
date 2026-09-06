const test = require('node:test');
const assert = require('node:assert/strict');
const { OUTREACH_SEQUENCE } = require('../lib/marketing-funnel');
test('outreach sequence contains three compliant stages', () => assert.deepEqual(OUTREACH_SEQUENCE.map(s => s.stage), ['first_touch','follow_up','final_offer']));
