const test = require('node:test');
const assert = require('node:assert/strict');
const { classifyUserAgent, hashSession, shouldTrack } = require('../lib/site-traffic');

test('classifies common crawlers as bots and normal browsers as humans', () => {
  assert.equal(classifyUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36'), 'human');
  assert.equal(classifyUserAgent('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'), 'bot');
  assert.equal(classifyUserAgent(''), 'unknown');
});

test('hashes session identifiers without storing the raw cookie value', () => {
  const hash = hashSession('example-session');
  assert.match(hash, /^[a-f0-9]{64}$/);
  assert.notEqual(hash, 'example-session');
});

test('tracks successful HTML GET pages but excludes operational and API traffic', () => {
  const htmlRes = { statusCode: 200, getHeader: () => 'text/html; charset=utf-8' };
  const apiRes = { statusCode: 200, getHeader: () => 'application/json' };
  const req = { method: 'GET', path: '/adventures/buffalo-river', url: '/adventures/buffalo-river' };
  assert.equal(shouldTrack(req, htmlRes), true);
  assert.equal(shouldTrack({ ...req, path: '/api/health/status' }, apiRes), false);
  assert.equal(shouldTrack({ ...req, method: 'POST' }, htmlRes), false);
  assert.equal(shouldTrack({ ...req, path: '/robots.txt' }, htmlRes), false);
});
