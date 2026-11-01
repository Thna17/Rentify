const test = require('node:test');
const assert = require('node:assert/strict');
const migration = require('../../src/migrations/20261101_020_editorial_minimal_template');

test('Editorial Minimal registration creates a selectable template without changing existing records', async () => {
  let inserted;
  const queryInterface = {
    sequelize: { query: async () => [[]] },
    bulkInsert: async (table, records) => { inserted = { table, records }; },
  };
  await migration.up({ queryInterface });
  assert.equal(inserted.table, 'WebsiteTemplates');
  assert.equal(inserted.records[0].websiteTemplateId, 5);
  assert.equal(inserted.records[0].name, 'Editorial Minimal');
  assert.deepEqual(JSON.parse(inserted.records[0].pages).map((page) => page.route), ['/', '/products']);
});

test('Editorial Minimal registration rejects an existing conflicting template ID', async () => {
  const queryInterface = { sequelize: { query: async () => [[{ id: 'another-template', websiteTemplateId: 5 }]] } };
  await assert.rejects(migration.up({ queryInterface }), /already assigned/);
});
