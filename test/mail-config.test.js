const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveEmailConfig } = require('../lib/mail-config');

test('uses SMTP aliases when legacy EMAIL vars are absent', () => {
  const previous = { ...process.env };

  try {
    for (const key of [
      'EMAIL_USER',
      'EMAIL_PASSWORD',
      'EMAIL_FROM',
      'SMTP_USER',
      'SMTP_PASS',
      'SMTP_HOST',
      'SMTP_PORT',
    ]) delete process.env[key];

    process.env.SMTP_USER = 'smtp-user@example.test';
    process.env.SMTP_PASS = 'smtp-pass';
    process.env.SMTP_HOST = 'smtp.example.test';
    process.env.SMTP_PORT = '2525';

    const config = resolveEmailConfig();

    assert.equal(config.user, 'smtp-user@example.test');
    assert.equal(config.pass, 'smtp-pass');
    assert.equal(config.host, 'smtp.example.test');
    assert.equal(config.port, 2525);
  } finally {
    for (const key of Object.keys(process.env)) {
      if (!(key in previous)) delete process.env[key];
    }
    Object.assign(process.env, previous);
  }
});
