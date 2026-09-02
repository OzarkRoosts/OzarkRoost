const test = require('node:test');
const assert = require('node:assert/strict');

test('sendOutboundEmail uses Mailtrap when Mailtrap credentials are configured', async () => {
  const originalToken = process.env.MAILTRAP_TOKEN;
  const originalFrom = process.env.MAILTRAP_FROM_EMAIL;
  process.env.MAILTRAP_TOKEN = 'test-token';
  process.env.MAILTRAP_FROM_EMAIL = 'sender@example.com';

  delete require.cache[require.resolve('../lib/email-sender')];
  const sender = require('../lib/email-sender');
  const result = await sender.sendOutboundEmail({
    to: 'customer@example.com',
    subject: 'Test',
    text: 'Hello',
    html: '<p>Hello</p>',
    transport: async (payload) => ({ messageId: 'mailtrap-test-id', payload }),
  });

  assert.equal(result.messageId, 'mailtrap-test-id');
  assert.equal(result.payload.to[0].email, 'customer@example.com');
  assert.equal(result.payload.from.email, 'sender@example.com');

  if (originalToken === undefined) delete process.env.MAILTRAP_TOKEN;
  else process.env.MAILTRAP_TOKEN = originalToken;
  if (originalFrom === undefined) delete process.env.MAILTRAP_FROM_EMAIL;
  else process.env.MAILTRAP_FROM_EMAIL = originalFrom;
});

test('sendOutboundEmail does not require SMTP credentials when Mailtrap is configured', async () => {
  process.env.MAILTRAP_TOKEN = 'test-token';
  process.env.MAILTRAP_FROM_EMAIL = 'sender@example.com';
  delete process.env.SMTP_USER;
  delete process.env.SMTP_PASS;
  delete require.cache[require.resolve('../lib/email-sender')];
  const sender = require('../lib/email-sender');

  await assert.doesNotReject(() => sender.sendOutboundEmail({
    to: 'customer@example.com',
    subject: 'SMTP-free',
    text: 'Hello',
    transport: async () => ({ messageId: 'ok' }),
  }));
});
