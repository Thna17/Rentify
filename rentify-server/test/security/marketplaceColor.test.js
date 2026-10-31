const test = require('node:test');
const assert = require('node:assert/strict');
const { marketplaceColor, MARKETPLACE_COLORS } = require('../../src/modules/stores/marketplaceColors');
const migration = require('../../src/migrations/20261029_019_marketplace_store_color');

test('marketplace accents accept only curated colors, not injected styles or arbitrary light text backgrounds', () => {
  for (const color of MARKETPLACE_COLORS) assert.equal(marketplaceColor(color.toUpperCase()), color);
  for (const invalid of ['#ffffff', 'red;display:none', 'url(https://example.com)', {}, null, '#123']) assert.equal(marketplaceColor(invalid), null);
});
test('the color migration is additive and safe to rerun', async () => {
  const columns = { id: {} }; const calls = [];
  const queryInterface = { describeTable: async () => columns, addColumn: async (table, key, config) => { calls.push([table, key, config.defaultValue]); columns[key] = config; } };
  await migration.up({queryInterface}); await migration.up({queryInterface});
  assert.deepEqual(calls, [['Stores', 'marketplaceColor', '#4f46e5']]);
});
