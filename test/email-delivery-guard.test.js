const assert = require('node:assert/strict');
const { test } = require('node:test');
const { isBounceOrDeliveryNotice } = require('../lib/email-delivery-guard');

test('blocks Microsoft undeliverable notices', () => {
  assert.equal(isBounceOrDeliveryNotice({
    from: 'postmaster@microsoft.com',
    subject: 'Undeliverable: Re: PR #40'
  }), true);
});

test('blocks mailer-daemon notices', () => {
  assert.equal(isBounceOrDeliveryNotice({
    from: 'mailer-daemon@example.com',
    subject: 'Delivery Status Notification'
  }), true);
});

test('allows legitimate prospect replies', () => {
  assert.equal(isBounceOrDeliveryNotice({
    from: 'owner@ozarkbusiness.com',
    subject: 'Re: Get featured on Ozark Roost'
  }), false);
});
