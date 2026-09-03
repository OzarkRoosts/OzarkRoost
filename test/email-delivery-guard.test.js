const assert = require('assert');
const { isBounceOrDeliveryNotice } = require('../lib/email-delivery-guard');

describe('email delivery guard', () => {
  it('blocks Microsoft undeliverable notices', () => {
    assert.equal(isBounceOrDeliveryNotice({
      from: 'postmaster@microsoft.com',
      subject: 'Undeliverable: Re: PR #40'
    }), true);
  });

  it('blocks mailer-daemon notices', () => {
    assert.equal(isBounceOrDeliveryNotice({
      from: 'mailer-daemon@example.com',
      subject: 'Delivery Status Notification'
    }), true);
  });

  it('allows legitimate prospect replies', () => {
    assert.equal(isBounceOrDeliveryNotice({
      from: 'owner@ozarkbusiness.com',
      subject: 'Re: Get featured on Ozark Roost'
    }), false);
  });
});
