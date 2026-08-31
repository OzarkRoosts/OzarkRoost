const test = require('node:test');
const assert = require('node:assert/strict');
const { classifyApplicationFields } = require('../lib/affiliate-application-executor');

test('classifies a free affiliate application as autonomous', () => {
  const result = classifyApplicationFields([
    { name: 'name', type: 'text', required: true },
    { name: 'email', type: 'email', required: true },
    { name: 'website', type: 'url', required: true },
    { name: 'description', type: 'textarea', required: true }
  ]);
  assert.deepEqual(result, { mode: 'auto', reasons: [] });
});

test('gates payment fields as human-required', () => {
  const result = classifyApplicationFields([
    { name: 'name', type: 'text', required: true },
    { name: 'credit_card', type: 'text', required: true }
  ]);
  assert.equal(result.mode, 'human');
  assert.match(result.reasons.join(' '), /payment/i);
});

test('gates legal acceptance and identity verification as human-required', () => {
  const result = classifyApplicationFields([
    { name: 'name', type: 'text', required: true },
    { name: 'terms', type: 'checkbox', required: true },
    { name: 'tax_id', type: 'text', required: true }
  ]);
  assert.equal(result.mode, 'human');
  assert.match(result.reasons.join(' '), /legal|tax|identity/i);
});

test('gates unknown required fields instead of guessing', () => {
  const result = classifyApplicationFields([
    { name: 'name', type: 'text', required: true },
    { name: 'mystery_required_field', type: 'text', required: true }
  ]);
  assert.equal(result.mode, 'human');
  assert.match(result.reasons.join(' '), /unknown|unsupported/i);
});
