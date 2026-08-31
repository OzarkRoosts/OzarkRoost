const assert = require('node:assert/strict');
const test = require('node:test');
const { rankPlacements, buildPlacementPrompt } = require('../lib/affiliate-strategist');

test('ranks adventure offers by traveler intent and fit', () => {
  const ranked = rankPlacements('Buffalo River kayaking weekend', [
    { key: 'alltrails', category: 'trail', intent: ['hiking'], revenueScore: 4, url: 'https://www.alltrails.com/example' },
    { key: 'getyourguide', category: 'activity', intent: ['kayaking', 'tour'], revenueScore: 7, url: 'https://www.getyourguide.com/example' },
    { key: 'rei', category: 'gear', intent: ['camping'], revenueScore: 5, url: 'https://www.rei.com/example' }
  ]);
  assert.equal(ranked[0].key, 'getyourguide');
  assert.ok(ranked[0].score > ranked[1].score);
});

test('does not recommend an offer without a usable approved URL', () => {
  const ranked = rankPlacements('Ozarks cabin getaway', [
    { key: 'vrbo', category: 'stay', intent: ['cabin'], revenueScore: 8, url: 'https://www.vrbo.com/example' },
    { key: 'mystery', category: 'stay', intent: ['cabin'], revenueScore: 99, url: '' }
  ]);
  assert.deepEqual(ranked.map(x => x.key), ['vrbo']);
});

test('builds an actionable placement prompt with conversion and compliance rules', () => {
  const prompt = buildPlacementPrompt({ page: '/adventures', intent: 'kayaking', offers: [{ key: 'getyourguide', label: 'Book tours' }] });
  assert.match(prompt, /getyourguide/i);
  assert.match(prompt, /approved links/i);
  assert.match(prompt, /do not invent/i);
});

// CI verification trigger: approved-link fixtures are intentionally explicit.
