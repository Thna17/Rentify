const test = require('node:test');
const assert = require('node:assert/strict');
const {
  parseCsv, validateRow, csvCell, previewReplay, nextPendingRow, checkpointChanges, exportCsv,
} = require('../../modules/store-catalog/productImportService');
const { Product } = require('../../models');

test('P4-MER-004: invalid and warning rows remain distinct for partial imports', async () => {
  const input = Buffer.from([
    'name,description,marketplace_category,price,sku,stock_quantity',
    'Valid mug,,Pottery,12.50,MUG-1,0',
    'Broken mug,Description,Not a category,nope,MUG-2,4',
  ].join('\n'));
  const parsed = await parseCsv(input);
  const seen = new Set();
  const rows = parsed.map((row, index) => validateRow(row, index + 2, seen, new Set()));

  assert.equal(rows[0].state, 'pending');
  assert.deepEqual(rows[0].issues.map((entry) => entry.level), ['warning', 'warning']);
  assert.equal(rows[1].state, 'invalid');
  assert.ok(rows[1].issues.some((entry) => entry.code === 'INVALID_CATEGORY'));
  assert.ok(rows[1].issues.some((entry) => entry.code === 'INVALID_PRICE'));
});

test('P4-MER-004: duplicate and unsafe spreadsheet content are blocking errors', () => {
  const seen = new Set();
  const first = validateRow({
    name: '=HYPERLINK("https://example.invalid")', description: 'unsafe',
    marketplace_category: 'Other', price: '10.00', sku: 'SKU-1', stock_quantity: '1',
  }, 2, seen, new Set());
  const duplicate = validateRow({
    name: 'Safe name', description: 'safe', marketplace_category: 'Other',
    price: '10.00', sku: 'sku-1', stock_quantity: '1',
  }, 3, seen, new Set());

  assert.ok(first.issues.some((entry) => entry.code === 'UNSAFE_SPREADSHEET_FORMULA'));
  assert.ok(duplicate.issues.some((entry) => entry.code === 'DUPLICATE_SKU_IN_FILE'));
  assert.equal(csvCell('=2+2'), '"\'=2+2"');
  assert.equal(csvCell('@SUM(A1:A2)'), '"\'@SUM(A1:A2)"');
});

test('P4-MER-004: idempotent preview replays the same job and rejects a different source', () => {
  const prior = {
    id: 'job-1', sourceHash: 'same', status: 'preview_ready', sourceFilename: 'products.csv',
    templateVersion: '1.0', totalRows: 1, validRows: 1, warningRows: 0, errorRows: 0,
    processedRows: 0, importedRows: 0, failedRows: 0, rows: [],
  };
  assert.equal(previewReplay(prior, 'same').id, 'job-1');
  assert.throws(() => previewReplay(prior, 'different'), (error) =>
    error.statusCode === 409 && error.code === 'IDEMPOTENCY_CONFLICT');
});

test('P4-MER-004: resume skips imported and invalid rows and continues at durable pending row', () => {
  const rows = [
    { state: 'imported', productId: 'product-1' },
    { state: 'invalid' },
    { state: 'pending' },
    { state: 'pending' },
  ];
  assert.equal(nextPendingRow(rows), 2);
  rows[2].state = 'imported';
  assert.equal(nextPendingRow(rows), 3);
  rows[3].state = 'imported';
  assert.equal(nextPendingRow(rows), -1);
  const checkpoint = checkpointChanges({ processedRows: 2, importedRows: 1, failedRows: 1 }, rows, true);
  assert.equal(checkpoint.rows, rows, 'row state is committed with the counter in the same update');
  assert.equal(checkpoint.processedRows, 3);
  assert.equal(checkpoint.importedRows, 2);
});

test('P4-MER-004: export is Store-scoped, allowlisted, and formula-safe', async (t) => {
  let query;
  t.mock.method(Product, 'findAll', async (options) => {
    query = options;
    return [{
      name: '=unsafe', description: '@unsafe', marketplaceCategory: 'Other',
      price: '9.00', stockQuantity: 2, status: 'draft', ownerEmail: 'must-not-export@example.test',
      ProductVariants: [{ sku: '+SKU', price: '9.00', stockQuantity: 2, status: 'active' }],
    }];
  });
  const output = await exportCsv('store-authorized');
  assert.deepEqual(query.where, { storeId: 'store-authorized' });
  assert.match(output, /'=?unsafe/);
  assert.match(output, /'@unsafe/);
  assert.match(output, /'\+SKU/);
  assert.doesNotMatch(output, /must-not-export@example\.test/);
  assert.deepEqual(query.attributes, ['name', 'description', 'marketplaceCategory', 'price', 'stockQuantity', 'status']);
});
