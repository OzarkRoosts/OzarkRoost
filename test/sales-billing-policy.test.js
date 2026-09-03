const test = require('node:test');
const assert = require('node:assert/strict');
const { shouldProcessContract } = require('../lib/sales-billing-policy');

test('never processes a contract that is only sent', () => {
  assert.equal(shouldProcessContract('sent'), false);
});

test('only explicitly accepted contracts can enter billing flow', () => {
  assert.equal(shouldProcessContract('accepted'), true);
  assert.equal(shouldProcessContract('signed'), true);
  assert.equal(shouldProcessContract('draft'), false);
  assert.equal(shouldProcessContract('pending'), false);
});
