const test = require('node:test');
const assert = require('node:assert/strict');
const { isAutomatedInboundSender } = require('../lib/inbound-email-policy');

test('suppresses postmaster bounce senders', () => {
  assert.equal(isAutomatedInboundSender('postmaster@microsoft.com'), true);
  assert.equal(isAutomatedInboundSender('MAILER-DAEMON@gmail.com'), true);
});

test('suppresses no-reply and known automated senders', () => {
  assert.equal(isAutomatedInboundSender('no-reply@github.com'), true);
  assert.equal(isAutomatedInboundSender('notifications@github.com'), true);
  assert.equal(isAutomatedInboundSender('noreply@render.com'), true);
});

test('does not suppress legitimate business senders', () => {
  assert.equal(isAutomatedInboundSender('owner@buffaloriveroutfitters.com'), false);
  assert.equal(isAutomatedInboundSender('hello@example.com'), false);
});
