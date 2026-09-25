const test = require('node:test');
const assert = require('node:assert/strict');
const { CacheService } = require('../../src/utils/cache');

test('setWithIndex uses the ioredis set command and expires the index', async () => {
  const calls = [];
  const client = {
    async set(...args) { calls.push(['set', ...args]); },
    async sadd(...args) { calls.push(['sadd', ...args]); },
    async expire(...args) { calls.push(['expire', ...args]); },
  };
  const cache = new CacheService({ getClient: () => client }, 'merchant');

  const result = await cache.setWithIndex('website-1', 'domain:shop.example.com', { id: 'website-1' }, 120);

  assert.equal(result, true);
  assert.deepEqual(calls, [
    ['set', 'merchant:domain:shop.example.com', JSON.stringify({ id: 'website-1' }), 'EX', 120],
    ['sadd', 'website:keys:website-1', 'merchant:domain:shop.example.com'],
    ['expire', 'website:keys:website-1', 180],
  ]);
});
