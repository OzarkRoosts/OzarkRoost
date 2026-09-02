const test = require('node:test');
const assert = require('node:assert/strict');
const { detectWidgetsInSource } = require('../lib/affiliate-ops-agent');

test('detects the actual affiliate partners rendered by a bundle partial', () => {
  const detected = detectWidgetsInSource("<%- include('../partials/affiliate-widget', { bundle: 'stays' }) %>");
  assert.equal(detected.hasWidgetPartial, true);
  assert.deepEqual(detected.widgets.sort(), ['airbnb', 'booking', 'hipcamp', 'stay22', 'vrbo'].sort());
});

test('does not invent partner coverage when the affiliate partial has no widget configuration', () => {
  const detected = detectWidgetsInSource("<%- include('../partials/affiliate-widget') %>");
  assert.equal(detected.hasWidgetPartial, true);
  assert.deepEqual(detected.widgets, []);
});
