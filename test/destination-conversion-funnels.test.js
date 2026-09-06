const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

test('homepage destination cards point to flagship destination hubs', () => {
  const html = read('views/partials/destinations.ejs');
  for (const slug of ['buffalo-river', 'eureka-springs', 'beaver-lake', 'ozark-highlands']) {
    assert.match(html, new RegExp(`href="/destinations/${slug}"`));
  }
});

test('flagship destination hubs expose a planning CTA and affiliate conversion path', () => {
  for (const slug of ['buffalo-river', 'eureka-springs', 'beaver-lake', 'ozark-highlands', 'mountain-view', 'bentonville']) {
    const html = read(`public/destinations/${slug}`);
    assert.match(html, /Plan|Book/i, `${slug} should contain planning language`);
    assert.match(html, /affiliate|stay|camp|adventure/i, `${slug} should contain a monetizable traveler-intent path`);
  }
});

test('sitemap includes all flagship destination hubs', () => {
  const server = read('server.js');
  for (const slug of ['buffalo-river', 'eureka-springs', 'beaver-lake', 'ozark-highlands', 'mountain-view', 'bentonville']) {
    assert.match(server, new RegExp(`/destinations/${slug}`));
  }
});
