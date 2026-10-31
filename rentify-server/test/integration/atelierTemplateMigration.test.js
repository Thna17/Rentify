const test = require('node:test');
const assert = require('node:assert/strict');
const migration = require('../../src/migrations/20261031_019_atelier_storefront_template');

test('Atelier registration creates a selectable template without changing existing records', async () => {
  let inserted;
  const queryInterface = {
    sequelize: { query: async () => [[]] },
    bulkInsert: async (table, records) => { inserted = { table, records }; },
  };
  await migration.up({ queryInterface });
  assert.equal(inserted.table, 'WebsiteTemplates');
  assert.equal(inserted.records[0].websiteTemplateId, 4);
  assert.equal(inserted.records[0].name, 'Atelier');
  assert.deepEqual(JSON.parse(inserted.records[0].pages).map((page) => page.route), ['/', '/products']);
});

test('Atelier registration rejects an existing conflicting template ID', async () => {
  const queryInterface = { sequelize: { query: async () => [[{ id: 'another-template', websiteTemplateId: 4 }]] } };
  await assert.rejects(migration.up({ queryInterface }), /already assigned/);
});
