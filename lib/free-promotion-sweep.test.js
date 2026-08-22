const assert = require('assert');
const { buildBrandCopy } = require('./free-promotion-sweep');

const copy = buildBrandCopy();
assert.strictEqual(copy.name, 'OzarkRoost');
assert.ok(copy.website !== undefined);
assert.ok(copy.shortDescription.includes('OzarkRoost'));
assert.ok(copy.tags.includes('Buffalo River'));
console.log('free-promotion-sweep: ok');
