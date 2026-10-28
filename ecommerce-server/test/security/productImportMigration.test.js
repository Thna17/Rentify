const test = require('node:test');
const assert = require('node:assert/strict');

const migration = require('../../migrations/20261026_014_product_import_jobs');

const createQueryInterface = ({ tables = [], indexes = [] } = {}) => {
  const calls = [];
  return {
    calls,
    showAllTables: async () => tables,
    createTable: async (tableName) => calls.push(['createTable', tableName]),
    showIndex: async () => indexes,
    addIndex: async (tableName, fields, options) => {
      calls.push(['addIndex', tableName, fields, options]);
    },
  };
};

test('product import migration creates a fresh table and both required indexes', async () => {
  const queryInterface = createQueryInterface();

  await migration.up({ queryInterface });

  assert.equal(queryInterface.calls[0][0], 'createTable');
  assert.deepEqual(
    queryInterface.calls.filter(([operation]) => operation === 'addIndex').map((call) => call[3].name),
    ['uniq_product_import_store_key', 'idx_product_import_store_created'],
  );
});

test('product import migration safely resumes after MySQL partially applies its DDL', async () => {
  const queryInterface = createQueryInterface({
    tables: [{ tableName: 'ProductImportJobs' }],
    indexes: [{ name: 'uniq_product_import_store_key' }],
  });

  await migration.up({ queryInterface });

  assert.deepEqual(queryInterface.calls, [[
    'addIndex',
    'ProductImportJobs',
    ['storeId', 'createdAt'],
    { name: 'idx_product_import_store_created' },
  ]]);
});

test('product import migration is a no-op after its schema is complete', async () => {
  const queryInterface = createQueryInterface({
    tables: ['ProductImportJobs'],
    indexes: [
      { name: 'uniq_product_import_store_key' },
      { name: 'idx_product_import_store_created' },
    ],
  });

  await migration.up({ queryInterface });

  assert.deepEqual(queryInterface.calls, []);
});
