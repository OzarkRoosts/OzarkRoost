const test = require('node:test');
const assert = require('node:assert/strict');
const { activateOperatorFunnel } = require('../lib/funnel-ops');

test('activates a new operator funnel with immediate acknowledgement and delayed nurture', async () => {
  const calls = [];
  const inquiry = {
    id: 42,
    operator_name: 'Jane Doe',
    email: 'JANE@example.com',
    property_name: 'Buffalo Cabin',
    property_type: 'cabin',
    location: 'Ponca, AR',
  };

  const result = await activateOperatorFunnel({
    inquiry,
    paymentLink: 'https://buy.stripe.com/test',
    sendEmail: async (email) => calls.push({ type: 'email', email }),
    enqueueNurtureSequence: async (email) => calls.push({ type: 'nurture', email }),
  });

  assert.equal(result.status, 'activated');
  assert.equal(result.needsHuman, false);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].type, 'email');
  assert.equal(calls[0].email.to, 'jane@example.com');
  assert.match(calls[0].email.subject, /OzarkRoost/);
  assert.match(calls[0].email.text, /https:\/\/buy\.stripe\.com\/test/);
  assert.deepEqual(calls[1], { type: 'nurture', email: 'jane@example.com' });
});

test('does not claim autonomous activation when required contact data is missing', async () => {
  await assert.rejects(
    () => activateOperatorFunnel({
      inquiry: { id: 7, operator_name: 'No Email', email: '' },
      paymentLink: 'https://buy.stripe.com/test',
      sendEmail: async () => {},
      enqueueNurtureSequence: async () => {},
    }),
    /valid operator email/i
  );
});
