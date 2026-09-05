const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeHttpsUrl,
  scoreApplicationLink,
  chooseApplicationUrl,
} = require('../lib/affiliate-partner-resolver');

test('prefers an official affiliate or partner signup link over a homepage', () => {
  const links = [
    { href: 'https://www.stay22.com/', text: 'Home' },
    { href: 'https://www.stay22.com/affiliate-program', text: 'Affiliate Program' },
    { href: 'https://www.stay22.com/about', text: 'About' },
  ];
  assert.equal(chooseApplicationUrl('https://www.stay22.com/', links), 'https://www.stay22.com/affiliate-program');
});

test('rejects non-HTTPS and off-domain application links', () => {
  assert.equal(normalizeHttpsUrl('javascript:alert(1)', 'stay22.com'), null);
  assert.equal(normalizeHttpsUrl('https://evil.example/signup', 'stay22.com'), null);
  assert.equal(normalizeHttpsUrl('https://www.stay22.com/signup', 'stay22.com'), 'https://www.stay22.com/signup');
});

test('scores signup and affiliate language higher than generic navigation', () => {
  assert.ok(scoreApplicationLink('https://partner.example/register', 'Create publisher account') > scoreApplicationLink('https://partner.example/', 'Home'));
});
