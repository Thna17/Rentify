const test = require('node:test');
const assert = require('node:assert/strict');
const migration = require('../../src/migrations/20261101_021_editorial_industry_styles');
const idFor = (id) => `ed170000-836b-44a5-9a49-${String(id).padStart(12, '0')}`;
const fixture = (rows = () => []) => {
  const inserted = [];
  const transaction = {};
  return { inserted, queryInterface: {
    sequelize: { transaction: (run) => run(transaction), query: async (_, options) => {
      assert.equal(options.transaction, transaction);
      return [rows(options.replacements)];
    } },
    bulkInsert: async (table, records, options) => { assert.equal(table, 'WebsiteTemplates'); assert.equal(options.transaction, transaction); inserted.push(...records); },
  } };
};
test('registers five industry templates with three-color palettes and unique stable IDs', async () => {
  const f = fixture(); await migration.up(f);
  assert.deepEqual(f.inserted.map((row) => row.websiteTemplateId), [6, 7, 8, 9, 10]);
  assert.equal(new Set(f.inserted.map((row) => row.id)).size, 5);
  for (const row of f.inserted) assert.deepEqual(Object.keys(JSON.parse(row.colorPalette)), ['primary', 'secondary', 'background']);
  assert.deepEqual(JSON.parse(f.inserted[0].colorPalette), { primary: '#2563eb', secondary: '#0b1728', background: '#ffffff' });
});
test('reruns without duplicating existing matching templates', async () => {
  const f = fixture(({ number }) => [{ id: idFor(number), websiteTemplateId: number }]);
  await migration.up(f); assert.equal(f.inserted.length, 0);
});
test('conflicting registration aborts before writing any template', async () => {
  const f = fixture(({ number }) => number === 8 ? [{ id: 'unrelated', websiteTemplateId: 8 }] : []);
  await assert.rejects(migration.up(f), /already assigned/); assert.equal(f.inserted.length, 0);
});
