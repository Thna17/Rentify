const test = require('node:test');
const assert = require('node:assert/strict');
const { sequelize } = require('../../config/db');
const { Product, ProductVariant, ProductImportJob, StoreAccess } = require('../../models');
const storeCatalog = require('../../modules/store-catalog/storeCatalogService');
const {
  parseCsv, validateRow, csvCell, previewReplay, nextPendingRow, checkpointChanges, exportCsv,
  templateCsv, listJobs, getJob, markQueued, processOne, processJob, reportCsv, spreadsheetFormula,
} = require('../../modules/store-catalog/productImportService');

function createMockJob(initial) {
  const job = {
    id: 'job-test-1',
    storeId: 'store-1111',
    status: 'queued',
    sourceFilename: 'products.csv',
    templateVersion: '1.0',
    totalRows: initial.rows?.length || 0,
    validRows: initial.rows?.filter((r) => r.state !== 'invalid').length || 0,
    warningRows: 0,
    errorRows: initial.rows?.filter((r) => r.state === 'invalid').length || 0,
    processedRows: 0,
    importedRows: 0,
    failedRows: 0,
    failureCode: null,
    failureMessage: null,
    startedAt: null,
    completedAt: null,
    ...initial,
    async update(changes) {
      Object.assign(job, changes);
      return job;
    },
  };
  return job;
}

function mockTransaction(t) {
  t.mock.method(sequelize, 'transaction', async (first, second) => {
    const callback = typeof first === 'function' ? first : second;
    return callback({ LOCK: { UPDATE: 'UPDATE' } });
  });
}

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

test('P4-MER-004: formula injection matrix covers all prefix variants and whitespace', () => {
  const formulaPrefixes = ['=', '+', '-', '@', '\t=', ' \t+', '\r\n-', '   @', '\n='];
  for (const prefix of formulaPrefixes) {
    const rawValue = `${prefix}SUM(1,2)`;
    assert.ok(spreadsheetFormula(rawValue), `Expected spreadsheetFormula to detect ${JSON.stringify(rawValue)}`);
    const row = validateRow({
      name: rawValue, description: 'clean description',
      marketplace_category: 'Other', price: '10.00', sku: 'SKU-OK', stock_quantity: '5',
    }, 2, new Set(), new Set());
    assert.ok(
      row.issues.some((e) => e.code === 'UNSAFE_SPREADSHEET_FORMULA' && e.field === 'name'),
      `Expected UNSAFE_SPREADSHEET_FORMULA for ${JSON.stringify(rawValue)}`,
    );
    assert.equal(row.state, 'invalid');

    const cell = csvCell(rawValue);
    assert.ok(cell.startsWith('"\''), `Expected csvCell to prefix with apostrophe for ${JSON.stringify(rawValue)}`);
  }

  const safeValues = ['Item + Case', '100 - 200g', 'user@example.com', 'Size 10=Medium'];
  for (const val of safeValues) {
    assert.equal(spreadsheetFormula(val), false, `Expected ${val} NOT to be a spreadsheet formula`);
    assert.equal(csvCell(val), `"${val}"`);
  }
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

test('P4-MER-004: partial failure records runtime error, skips invalid rows, and produces corrections report', async (t) => {
  mockTransaction(t);
  const rows = [
    {
      number: 2,
      values: { name: 'Mug A', description: '', marketplace_category: 'Pottery', price: '10.00', sku: 'MUG-A', stock_quantity: '5' },
      issues: [],
      state: 'pending',
      productId: null,
      variantId: null,
    },
    {
      number: 3,
      values: { name: 'Mug Bad Cat', description: '', marketplace_category: 'InvalidCat', price: '10.00', sku: 'MUG-B', stock_quantity: '5' },
      issues: [{ level: 'error', code: 'INVALID_CATEGORY', field: 'marketplace_category', message: 'Choose a supported marketplace category.' }],
      state: 'invalid',
      productId: null,
      variantId: null,
    },
    {
      number: 4,
      values: { name: 'Mug Conflict', description: '', marketplace_category: 'Pottery', price: '10.00', sku: 'MUG-C', stock_quantity: '5' },
      issues: [],
      state: 'pending',
      productId: null,
      variantId: null,
    },
    {
      number: 5,
      values: { name: 'Mug D', description: '', marketplace_category: 'Pottery', price: '15.00', sku: 'MUG-D', stock_quantity: '2' },
      issues: [],
      state: 'pending',
      productId: null,
      variantId: null,
    },
  ];

  const job = createMockJob({ rows, errorRows: 1, validRows: 3, totalRows: 4 });
  t.mock.method(ProductImportJob, 'findByPk', async () => job);
  t.mock.method(StoreAccess, 'findByPk', async () => ({
    storeId: job.storeId, status: 'active', marketplaceEntitlement: 'pilot',
  }));

  let createdProductCount = 0;
  t.mock.method(storeCatalog, 'create', async (_store, input) => {
    if (input.sku === 'MUG-C') {
      const err = new Error('SKU became unavailable before this row was imported.');
      err.name = 'SequelizeUniqueConstraintError';
      throw err;
    }
    createdProductCount += 1;
    return { id: `prod-${createdProductCount}`, name: input.name };
  });

  let createdVariantCount = 0;
  t.mock.method(ProductVariant, 'create', async (values) => {
    createdVariantCount += 1;
    return { id: `var-${createdVariantCount}`, ...values };
  });

  // Step 1: Process Mug A (valid)
  const step1 = await processOne(job.id);
  assert.equal(step1.done, false);
  assert.equal(job.processedRows, 1);
  assert.equal(job.importedRows, 1);
  assert.equal(job.failedRows, 0);
  assert.equal(job.rows[0].state, 'imported');
  assert.equal(job.rows[0].productId, 'prod-1');

  // Step 2: Mug Bad Cat is invalid so nextPendingRow picks Mug Conflict (row 4, index 2)
  const step2 = await processOne(job.id);
  assert.equal(step2.done, false);
  assert.equal(job.processedRows, 2);
  assert.equal(job.importedRows, 1);
  assert.equal(job.failedRows, 1);
  assert.equal(job.rows[2].state, 'failed');
  assert.ok(job.rows[2].issues.some((e) => e.code === 'SKU_ALREADY_EXISTS'));

  // Step 3: Process Mug D (row 5, index 3)
  const step3 = await processOne(job.id);
  assert.equal(step3.done, false);
  assert.equal(job.processedRows, 3);
  assert.equal(job.importedRows, 2);
  assert.equal(job.failedRows, 1);
  assert.equal(job.rows[3].state, 'imported');

  // Step 4: No more pending rows
  const step4 = await processOne(job.id);
  assert.equal(step4.done, true);
  assert.equal(job.status, 'completed_with_errors');
  assert.ok(job.completedAt);

  // Download correction report
  t.mock.method(ProductImportJob, 'findOne', async (options) => {
    if (options.where?.id === job.id && options.where?.storeId === job.storeId) return job;
    return null;
  });

  const report = await reportCsv(job.storeId, job.id);
  assert.match(report, /"row_number","severity","issue_codes","issue_messages"/);
  assert.match(report, /MUG-B.*INVALID_CATEGORY/);
  assert.match(report, /MUG-C.*SKU_ALREADY_EXISTS/);
  assert.doesNotMatch(report, /MUG-A/);
  assert.doesNotMatch(report, /MUG-D/);
});

test('P4-MER-004: retry resumes from pending row and never duplicates imported SKUs', async (t) => {
  mockTransaction(t);
  const rows = [
    {
      number: 2,
      values: { name: 'Mug 1', sku: 'MUG-1', price: '10.00', stock_quantity: '5', marketplace_category: 'Pottery', description: '' },
      issues: [],
      state: 'imported',
      productId: 'p-1',
      variantId: 'v-1',
    },
    {
      number: 3,
      values: { name: 'Mug 2', sku: 'MUG-2', price: '12.00', stock_quantity: '3', marketplace_category: 'Pottery', description: '' },
      issues: [],
      state: 'pending',
      productId: null,
      variantId: null,
    },
  ];

  const job = createMockJob({
    rows, totalRows: 2, validRows: 2, errorRows: 0,
    processedRows: 1, importedRows: 1, status: 'failed',
    failureCode: 'IMPORT_INTERRUPTED',
  });

  t.mock.method(ProductImportJob, 'findOne', async () => job);
  t.mock.method(ProductImportJob, 'findByPk', async () => job);
  t.mock.method(ProductImportJob, 'update', async (changes) => job.update(changes));
  t.mock.method(StoreAccess, 'findByPk', async () => ({
    storeId: job.storeId, status: 'active', marketplaceEntitlement: 'pilot',
  }));

  const createdSkus = [];
  t.mock.method(storeCatalog, 'create', async (_store, input) => {
    createdSkus.push(input.sku);
    return { id: `prod-${createdSkus.length}`, name: input.name };
  });
  t.mock.method(ProductVariant, 'create', async (values) => ({ id: 'v-new', ...values }));

  // Call markQueued (retry)
  await markQueued(job.storeId, job.id);
  assert.equal(job.status, 'queued');
  assert.equal(job.failureCode, null);

  // Resume execution
  const res1 = await processOne(job.id);
  assert.equal(res1.done, false);
  assert.equal(job.importedRows, 2);
  assert.equal(job.processedRows, 2);
  assert.deepEqual(createdSkus, ['MUG-2'], 'MUG-1 was skipped and not recreated');

  const res2 = await processOne(job.id);
  assert.equal(res2.done, true);
  assert.equal(job.status, 'completed');

  // Drain background enqueue task while mocks are active
  await new Promise((resolve) => setImmediate(resolve));
});

test('P4-MER-004: processJob runs queued rows to completion and marks job completed', async (t) => {
  mockTransaction(t);
  const rows = [
    {
      number: 2,
      values: { name: 'Mug A', sku: 'MUG-A', price: '10.00', stock_quantity: '5', marketplace_category: 'Pottery', description: '' },
      issues: [],
      state: 'pending',
      productId: null,
      variantId: null,
    },
  ];
  const job = createMockJob({ rows, totalRows: 1, validRows: 1, errorRows: 0, status: 'queued' });
  t.mock.method(ProductImportJob, 'findByPk', async () => job);
  t.mock.method(StoreAccess, 'findByPk', async () => ({
    storeId: job.storeId, status: 'active', marketplaceEntitlement: 'pilot',
  }));
  t.mock.method(storeCatalog, 'create', async () => ({ id: 'p-1', name: 'Mug A' }));
  t.mock.method(ProductVariant, 'create', async (values) => ({ id: 'v-1', ...values }));

  await processJob(job.id);
  assert.equal(job.status, 'completed');
  assert.equal(job.importedRows, 1);
  assert.equal(job.processedRows, 1);
  assert.equal(job.rows[0].state, 'imported');
});

test('P4-MER-004: processJob marks job failed with IMPORT_INTERRUPTED on fatal unexpected error', async (t) => {
  mockTransaction(t);
  const rows = [
    {
      number: 2,
      values: { name: 'Mug A', sku: 'MUG-A', price: '10.00', stock_quantity: '5', marketplace_category: 'Pottery', description: '' },
      issues: [],
      state: 'pending',
      productId: null,
      variantId: null,
    },
  ];
  const job = createMockJob({ rows, totalRows: 1, validRows: 1, errorRows: 0, status: 'queued' });
  t.mock.method(ProductImportJob, 'findByPk', async () => job);
  t.mock.method(StoreAccess, 'findByPk', async () => ({
    storeId: job.storeId, status: 'active', marketplaceEntitlement: 'pilot',
  }));
  t.mock.method(storeCatalog, 'create', async () => {
    throw new Error('Fatal database crash');
  });
  let updatedWith;
  t.mock.method(ProductImportJob, 'update', async (changes) => {
    updatedWith = changes;
    return [1];
  });

  await assert.rejects(processJob(job.id), (err) => err.message === 'Fatal database crash');
  assert.equal(updatedWith.status, 'failed');
  assert.equal(updatedWith.failureCode, 'IMPORT_INTERRUPTED');
});

test('P4-MER-004: tenant isolation rejects access to other stores import jobs', async (t) => {
  t.mock.method(ProductImportJob, 'findOne', async ({ where }) => {
    if (where.storeId === 'owner-store' && where.id === 'job-123') {
      return createMockJob({ id: 'job-123', storeId: 'owner-store' });
    }
    return null;
  });

  await assert.rejects(
    getJob('attacker-store', 'job-123'),
    (err) => err.statusCode === 404 && err.code === 'IMPORT_JOB_NOT_FOUND',
  );

  await assert.rejects(
    markQueued('attacker-store', 'job-123'),
    (err) => err.statusCode === 404 && err.code === 'IMPORT_JOB_NOT_FOUND',
  );

  await assert.rejects(
    reportCsv('attacker-store', 'job-123'),
    (err) => err.statusCode === 404 && err.code === 'IMPORT_JOB_NOT_FOUND',
  );

  let listWhere;
  t.mock.method(ProductImportJob, 'findAll', async (options) => {
    listWhere = options.where;
    return [];
  });
  await listJobs('owner-store');
  assert.deepEqual(listWhere, { storeId: 'owner-store' });
});

test('P4-MER-004: template CSV matches versioned contract and parseCsv validates row & size limits', async () => {
  const template = templateCsv();
  assert.ok(template.startsWith('\uFEFF'));
  assert.match(template, /"name","description","marketplace_category","price","sku","stock_quantity"/);
  assert.match(template, /"SAMPLE-001"/);

  await assert.rejects(parseCsv(Buffer.from('')), (err) => err.code === 'CSV_REQUIRED');

  const badHeaders = Buffer.from('title,cost,quantity\nItem,10,1');
  await assert.rejects(parseCsv(badHeaders), (err) => err.code === 'CSV_HEADERS_INVALID');

  const headersOnly = Buffer.from('name,description,marketplace_category,price,sku,stock_quantity\n');
  await assert.rejects(parseCsv(headersOnly), (err) => err.code === 'CSV_EMPTY');
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
