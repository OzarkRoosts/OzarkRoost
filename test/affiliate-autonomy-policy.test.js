const test = require('node:test');
const assert = require('node:assert/strict');
const {
  isNoSpendApplication,
  isSafeAgreementField,
  credentialFieldValue,
} = require('../lib/affiliate-autonomy-policy');

test('allows free affiliate application forms to be automated', () => {
  assert.equal(isNoSpendApplication({
    programName: 'Example Affiliate Program',
    html: '<form><input name="email"><input name="website"><input name="agree_terms" type="checkbox"></form>',
  }), true);
});

test('blocks forms that introduce payment or paid subscription obligations', () => {
  assert.equal(isNoSpendApplication({
    programName: 'Example Affiliate Program',
    html: '<form><input name="card_number"><input name="billing_address"></form>',
  }), false);
  assert.equal(isNoSpendApplication({
    programName: 'Example Affiliate Program',
    html: '<form><select name="plan"><option>Premium $49/month</option></select></form>',
  }), false);
});

test('permits only affiliate agreement acceptance fields to be auto-selected', () => {
  assert.equal(isSafeAgreementField({ name: 'agree_terms', type: 'checkbox', value: 'yes' }), true);
  assert.equal(isSafeAgreementField({ name: 'affiliate_agreement', type: 'checkbox', value: 'accept' }), true);
  assert.equal(isSafeAgreementField({ name: 'certify_identity', type: 'checkbox', value: 'yes' }), false);
});

test('reads account credentials only from dedicated environment variables', () => {
  const previous = process.env.AFFILIATE_APPLICANT_PASSWORD;
  process.env.AFFILIATE_APPLICANT_PASSWORD = 'test-password';
  assert.equal(credentialFieldValue({ name: 'password', type: 'password' }), 'test-password');
  if (previous === undefined) delete process.env.AFFILIATE_APPLICANT_PASSWORD;
  else process.env.AFFILIATE_APPLICANT_PASSWORD = previous;
});
