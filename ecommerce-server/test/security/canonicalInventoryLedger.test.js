'use strict';

// test/security/canonicalInventoryLedger.test.js
// Verification suite for P3-INV-001: Inventory ledger, balance invariants, reservations, and audit.

const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { Sequelize } = require('sequelize');

Sequelize.prototype.authenticate = async () => {};
Sequelize.prototype.validate = async () => {};

const { sequelize } = require('../../config/db');
sequelize.authenticate = async () => {};
sequelize.validate = async () => {};

const {
  inventoryLedgerService,
  ALLOWED_REASON_CODES,
  InventoryError,
  InsufficientStockError,
  InvalidInventoryStateError,
  InventoryStoreMismatchError,
} = require('../../modules/inventory');

const {
  InventoryBalance,
  InventoryLedgerEntry,
  InventoryReservation,
  Product,
  ProductVariant,
} = require('../../models');

const { audit } = require('../../scripts/auditInventoryBalances');
const migration017 = require('../../migrations/20261025_017_canonical_inventory_ledger');

const STORE_A = '11111111-1111-4111-8111-111111111111';
const STORE_B = '22222222-2222-4222-8222-222222222222';
const SKU_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const SKU_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const PROD_A = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const PROD_B = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

test('P3-INV-001: 1. Balance Non-Negative Invariant: onHand cannot become negative', async (t) => {
  let balanceRecord = {
    id: randomUUID(),
    storeId: STORE_A,
    skuId: SKU_A,
    sku: 'BAMBOO-BSK-01',
    productId: PROD_A,
    onHand: 10,
    reserved: 0,
    available: 10,
    version: 1,
    async update(fields) {
      Object.assign(this, fields);
      return this;
    },
  };

  t.mock.method(sequelize, 'transaction', async (fn) => fn({ LOCK: { UPDATE: 'UPDATE' } }));
  t.mock.method(InventoryLedgerEntry, 'findOne', async () => null);
  t.mock.method(InventoryBalance, 'findOne', async () => balanceRecord);

  // Attempting to deduct 15 when only 10 on hand must throw InsufficientStockError
  await assert.rejects(async () => {
    await inventoryLedgerService.mutateBalance({
      storeId: STORE_A,
      skuId: SKU_A,
      changeOnHand: -15,
      changeReserved: 0,
      reasonCode: 'sale',
      sourceType: 'order',
      sourceId: 'ord-123',
      actor: { id: 'buyer-1', type: 'customer' },
      idempotencyKey: 'idem-fail-neg-stock',
    });
  }, (err) => {
    assert.ok(err instanceof InsufficientStockError);
    assert.match(err.message, /Insufficient stock on hand/);
    return true;
  });

  // State must remain unmutated at 10
  assert.equal(balanceRecord.onHand, 10);
  assert.equal(balanceRecord.available, 10);
});

test('P3-INV-001: 2. Reservation Invariant: Reserved cannot exceed available on-hand stock', async (t) => {
  let balanceRecord = {
    id: randomUUID(),
    storeId: STORE_A,
    skuId: SKU_A,
    sku: 'BAMBOO-BSK-01',
    productId: PROD_A,
    onHand: 10,
    reserved: 8,
    available: 2,
    version: 1,
    async update(fields) {
      Object.assign(this, fields);
      return this;
    },
  };

  t.mock.method(sequelize, 'transaction', async (fn) => fn({ LOCK: { UPDATE: 'UPDATE' } }));
  t.mock.method(InventoryLedgerEntry, 'findOne', async () => null);
  t.mock.method(InventoryBalance, 'findOne', async () => balanceRecord);

  // Only 2 available (10 on hand - 8 reserved). Reserving 5 must fail!
  await assert.rejects(async () => {
    await inventoryLedgerService.createReservation({
      storeId: STORE_A,
      skuId: SKU_A,
      quantity: 5,
      sourceType: 'checkout',
      sourceId: 'cart-123',
      actor: { id: 'buyer-1', type: 'customer' },
      idempotencyKey: 'idem-res-exceed',
    });
  }, (err) => {
    assert.ok(err instanceof InsufficientStockError);
    assert.match(err.message, /Reserved quantity .* cannot exceed on-hand stock/);
    return true;
  });

  // Reserving 2 (exact available) succeeds
  t.mock.method(InventoryLedgerEntry, 'create', async (data) => data);
  t.mock.method(InventoryReservation, 'create', async (data) => data);

  const res = await inventoryLedgerService.createReservation({
    storeId: STORE_A,
    skuId: SKU_A,
    quantity: 2,
    sourceType: 'checkout',
    sourceId: 'cart-123',
    actor: { id: 'buyer-1', type: 'customer' },
    idempotencyKey: 'idem-res-exact',
  });

  assert.equal(balanceRecord.onHand, 10);
  assert.equal(balanceRecord.reserved, 10);
  assert.equal(balanceRecord.available, 0);
  assert.equal(res.reservation.status, 'active');
});

test('P3-INV-001: 3. Idempotency & Replay Defense: Replay cannot apply twice', async (t) => {
  const existingLedger = {
    id: randomUUID(),
    storeId: STORE_A,
    skuId: SKU_A,
    idempotencyKey: 'replayed-key-001',
    changeOnHand: -2,
    changeReserved: 0,
    balanceOnHandAfter: 8,
    balanceReservedAfter: 0,
    balanceAvailableAfter: 8,
    reasonCode: 'sale',
  };

  const balanceRecord = {
    storeId: STORE_A,
    skuId: SKU_A,
    onHand: 8,
    reserved: 0,
    available: 8,
    version: 2,
    update: async () => {
      assert.fail('Balance update must NOT be called on replay!');
    },
  };

  t.mock.method(sequelize, 'transaction', async (fn) => fn({ LOCK: { UPDATE: 'UPDATE' } }));
  t.mock.method(InventoryLedgerEntry, 'findOne', async () => existingLedger);
  t.mock.method(InventoryBalance, 'findOne', async () => balanceRecord);
  t.mock.method(InventoryLedgerEntry, 'create', async () => {
    assert.fail('Ledger entry must NOT be created on replay!');
  });

  const result = await inventoryLedgerService.mutateBalance({
    storeId: STORE_A,
    skuId: SKU_A,
    changeOnHand: -2,
    changeReserved: 0,
    reasonCode: 'sale',
    sourceType: 'order',
    sourceId: 'ord-123',
    actor: { id: 'buyer-1', type: 'customer' },
    idempotencyKey: 'replayed-key-001',
  });

  assert.equal(result.duplicate, true);
  assert.equal(result.idempotent, true);
  assert.equal(result.ledgerEntry.idempotencyKey, 'replayed-key-001');
  assert.equal(result.balance.onHand, 8);
});

test('P3-INV-001: 4. Attribution & Source Linkage: Every mutation is attributed and links to source', async () => {
  // Missing actor
  await assert.rejects(async () => {
    await inventoryLedgerService.mutateBalance({
      storeId: STORE_A,
      skuId: SKU_A,
      changeOnHand: 5,
      reasonCode: 'restock',
      sourceType: 'manual',
      sourceId: 'po-123',
      actor: null,
      idempotencyKey: 'idem-no-actor',
    });
  }, (err) => {
    assert.match(err.message, /Every inventory mutation must be attributed/);
    return true;
  });

  // Missing source
  await assert.rejects(async () => {
    await inventoryLedgerService.mutateBalance({
      storeId: STORE_A,
      skuId: SKU_A,
      changeOnHand: 5,
      reasonCode: 'restock',
      sourceType: '',
      sourceId: '',
      actor: { id: 'staff-1', type: 'staff' },
      idempotencyKey: 'idem-no-source',
    });
  }, (err) => {
    assert.match(err.message, /Every inventory mutation must link to its source/);
    return true;
  });
});

test('P3-INV-001: 5. Reason Code Conformance: Supported 12 reason codes', async (t) => {
  const expectedCodes = [
    'opening_balance',
    'sale',
    'cancellation',
    'return',
    'restock',
    'manual_adjustment',
    'pos_sale',
    'invoice_fulfillment',
    'reservation',
    'reservation_release',
    'reservation_expiry',
    'migration_backfill',
  ];

  // All 12 expected codes must be exported
  assert.equal(ALLOWED_REASON_CODES.length, 12);
  for (const code of expectedCodes) {
    assert.ok(ALLOWED_REASON_CODES.includes(code), `Missing expected reasonCode: ${code}`);
  }

  // Reject invalid reason code
  await assert.rejects(async () => {
    await inventoryLedgerService.mutateBalance({
      storeId: STORE_A,
      skuId: SKU_A,
      changeOnHand: 1,
      reasonCode: 'unauthorized_fictional_reason',
      sourceType: 'manual',
      sourceId: 'src-1',
      actor: { id: 'staff-1', type: 'staff' },
      idempotencyKey: 'idem-bad-reason',
    });
  }, (err) => {
    assert.match(err.message, /Invalid reasonCode/);
    return true;
  });
});

test('P3-INV-001: 6. Compensating Entries & Manual Adjustments: Ledger is append-only', async (t) => {
  let balanceRecord = {
    id: randomUUID(),
    storeId: STORE_A,
    skuId: SKU_A,
    sku: 'BAMBOO-BSK-01',
    productId: PROD_A,
    onHand: 20,
    reserved: 0,
    available: 20,
    version: 1,
    async update(fields) {
      Object.assign(this, fields);
      return this;
    },
  };

  const ledgerRecords = [];

  t.mock.method(sequelize, 'transaction', async (fn) => fn({ LOCK: { UPDATE: 'UPDATE' } }));
  t.mock.method(InventoryLedgerEntry, 'findOne', async () => null);
  t.mock.method(InventoryBalance, 'findOne', async () => balanceRecord);
  t.mock.method(InventoryLedgerEntry, 'create', async (data) => {
    ledgerRecords.push(data);
    return data;
  });

  // 1. Compensating restock (+10)
  const restockRes = await inventoryLedgerService.adjustBalance({
    storeId: STORE_A,
    skuId: SKU_A,
    delta: 10,
    reasonCode: 'restock',
    actor: { id: 'merchant-1', type: 'user' },
    idempotencyKey: 'adjust-restock-10',
    notes: 'Received new shipment from artisan',
  });

  assert.equal(balanceRecord.onHand, 30);
  assert.equal(balanceRecord.available, 30);
  assert.equal(ledgerRecords.length, 1);
  assert.equal(ledgerRecords[0].changeOnHand, 10);
  assert.equal(ledgerRecords[0].reasonCode, 'restock');

  // 2. Compensating adjustment for damage (-3)
  const damageRes = await inventoryLedgerService.adjustBalance({
    storeId: STORE_A,
    skuId: SKU_A,
    delta: -3,
    reasonCode: 'manual_adjustment',
    actor: { id: 'staff-1', type: 'staff' },
    idempotencyKey: 'adjust-damage-3',
    notes: 'Damaged in transit during shelf display',
  });

  assert.equal(balanceRecord.onHand, 27);
  assert.equal(balanceRecord.available, 27);
  assert.equal(ledgerRecords.length, 2);
  assert.equal(ledgerRecords[1].changeOnHand, -3);
  assert.equal(ledgerRecords[1].balanceOnHandAfter, 27);
});

test('P3-INV-001: 7. Reservation Lifecycle: create, fulfill, release, and expiry', async (t) => {
  let balanceRecord = {
    id: randomUUID(),
    storeId: STORE_A,
    skuId: SKU_A,
    sku: 'SILK-SCARF-01',
    productId: PROD_A,
    onHand: 15,
    reserved: 0,
    available: 15,
    version: 1,
    async update(fields) {
      Object.assign(this, fields);
      return this;
    },
  };

  const reservations = new Map();
  const ledger = [];

  t.mock.method(sequelize, 'transaction', async (fn) => fn({ LOCK: { UPDATE: 'UPDATE' } }));
  t.mock.method(InventoryLedgerEntry, 'findOne', async () => null);
  t.mock.method(InventoryBalance, 'findOne', async () => balanceRecord);
  t.mock.method(InventoryLedgerEntry, 'create', async (data) => {
    ledger.push(data);
    return data;
  });
  t.mock.method(InventoryReservation, 'create', async (data) => {
    const res = {
      ...data,
      async update(fields) { Object.assign(this, fields); return this; },
    };
    reservations.set(data.id, res);
    return res;
  });
  t.mock.method(InventoryReservation, 'findByPk', async (id) => reservations.get(id));

  // 7a. Create Reservation of 5 items
  const res1 = await inventoryLedgerService.createReservation({
    storeId: STORE_A,
    skuId: SKU_A,
    quantity: 5,
    sourceType: 'checkout',
    sourceId: 'cart-1',
    actor: { id: 'buyer-1', type: 'customer' },
    idempotencyKey: 'res-lifecycle-1',
  });

  assert.equal(balanceRecord.onHand, 15);
  assert.equal(balanceRecord.reserved, 5);
  assert.equal(balanceRecord.available, 10);
  assert.equal(res1.reservation.status, 'active');

  // 7b. Fulfill 5 items (Sale finalized upon checkout payment)
  const fulfillRes = await inventoryLedgerService.fulfillReservation({
    reservationId: res1.reservation.id,
    storeId: STORE_A,
    actor: { id: 'buyer-1', type: 'customer' },
    sourceId: 'ord-1001',
    idempotencyKey: 'res-fulfill-1',
    monetaryContext: { currency: 'USD', unitPriceMinor: 2000, totalMinor: 10000 },
  });

  assert.equal(balanceRecord.onHand, 10); // onHand decreased from 15 to 10
  assert.equal(balanceRecord.reserved, 0); // reserved decreased from 5 to 0
  assert.equal(balanceRecord.available, 10); // available unchanged
  assert.equal(reservations.get(res1.reservation.id).status, 'fulfilled');

  // 7c. Create Reservation 2 of 4 items, then release it (Cart abandoned / cancelled)
  const res2 = await inventoryLedgerService.createReservation({
    storeId: STORE_A,
    skuId: SKU_A,
    quantity: 4,
    sourceType: 'checkout',
    sourceId: 'cart-2',
    actor: { id: 'buyer-2', type: 'customer' },
    idempotencyKey: 'res-lifecycle-2',
  });

  assert.equal(balanceRecord.onHand, 10);
  assert.equal(balanceRecord.reserved, 4);
  assert.equal(balanceRecord.available, 6);

  await inventoryLedgerService.releaseReservation({
    reservationId: res2.reservation.id,
    storeId: STORE_A,
    actor: { id: 'buyer-2', type: 'customer' },
    idempotencyKey: 'res-release-2',
  });

  assert.equal(balanceRecord.onHand, 10);
  assert.equal(balanceRecord.reserved, 0);
  assert.equal(balanceRecord.available, 10);
  assert.equal(reservations.get(res2.reservation.id).status, 'released');

  // 7d. Expire stale reservations
  const staleRes = {
    id: randomUUID(),
    storeId: STORE_A,
    skuId: SKU_A,
    quantity: 3,
    status: 'active',
    sourceType: 'checkout',
    sourceId: 'cart-stale',
    expiresAt: new Date(Date.now() - 10000), // In the past
    async update(fields) { Object.assign(this, fields); return this; },
  };
  reservations.set(staleRes.id, staleRes);
  balanceRecord.reserved = 3;
  balanceRecord.available = 7;

  t.mock.method(InventoryReservation, 'findAll', async () => [staleRes]);

  const expiredList = await inventoryLedgerService.expireStaleReservations();
  assert.equal(expiredList.length, 1);
  assert.equal(expiredList[0].expired, true);
  assert.equal(staleRes.status, 'expired');
  assert.equal(balanceRecord.reserved, 0);
  assert.equal(balanceRecord.available, 10);
});

test('P3-INV-001: 8. Store Isolation & Cross-Store Mutation Rejection', async (t) => {
  const balanceA = {
    id: randomUUID(),
    storeId: STORE_A,
    skuId: SKU_A,
    sku: 'STORE-A-SKU',
    productId: PROD_A,
    onHand: 10,
    reserved: 0,
    available: 10,
  };

  t.mock.method(sequelize, 'transaction', async (fn) => fn({ LOCK: { UPDATE: 'UPDATE' } }));
  t.mock.method(InventoryLedgerEntry, 'findOne', async () => null);
  t.mock.method(InventoryBalance, 'findOne', async () => balanceA);

  // Store B attempting to mutate Store A's SKU must fail with InventoryStoreMismatchError
  await assert.rejects(async () => {
    await inventoryLedgerService.mutateBalance({
      storeId: STORE_B, // Wrong store!
      skuId: SKU_A,
      changeOnHand: 5,
      reasonCode: 'restock',
      sourceType: 'manual',
      sourceId: 'po-cross-store',
      actor: { id: 'merchant-b', type: 'user' },
      idempotencyKey: 'idem-cross-store',
    });
  }, (err) => {
    assert.ok(err instanceof InventoryStoreMismatchError);
    assert.match(err.message, /belongs to Store/);
    return true;
  });
});

test('P3-INV-001: 9. Monetary Context Integration: Sales record unit and total minor units', async (t) => {
  let balanceRecord = {
    id: randomUUID(),
    storeId: STORE_A,
    skuId: SKU_A,
    sku: 'SILK-DRESS-01',
    productId: PROD_A,
    onHand: 5,
    reserved: 0,
    available: 5,
    version: 1,
    async update(fields) { Object.assign(this, fields); return this; },
  };

  let savedLedger = null;
  t.mock.method(sequelize, 'transaction', async (fn) => fn({ LOCK: { UPDATE: 'UPDATE' } }));
  t.mock.method(InventoryLedgerEntry, 'findOne', async () => null);
  t.mock.method(InventoryBalance, 'findOne', async () => balanceRecord);
  t.mock.method(InventoryLedgerEntry, 'create', async (data) => {
    savedLedger = data;
    return data;
  });

  const monetaryContext = {
    currency: 'USD',
    unitPriceMinor: 4500, // $45.00
    quantity: 2,
    totalMinor: 9000,     // $90.00
  };

  await inventoryLedgerService.mutateBalance({
    storeId: STORE_A,
    skuId: SKU_A,
    changeOnHand: -2,
    changeReserved: 0,
    reasonCode: 'pos_sale',
    sourceType: 'pos',
    sourceId: 'pos-receipt-001',
    actor: { id: 'cashier-1', type: 'staff' },
    idempotencyKey: 'idem-pos-money-1',
    monetaryContext,
  });

  assert.ok(savedLedger);
  assert.equal(savedLedger.reasonCode, 'pos_sale');
  assert.deepEqual(savedLedger.monetaryContext, monetaryContext);
});

test('P3-INV-001: 10. Compatibility Stock Projections: Updates ProductVariant and Product stockQuantity', async (t) => {
  let balanceRecord = {
    id: randomUUID(),
    storeId: STORE_A,
    skuId: SKU_A,
    sku: 'BAMBOO-HAT-01',
    productId: PROD_A,
    onHand: 2,
    reserved: 0,
    available: 2,
    version: 1,
    async update(fields) { Object.assign(this, fields); return this; },
  };

  let variantUpdated = null;
  let productUpdated = null;

  t.mock.method(sequelize, 'transaction', async (fn) => fn({ LOCK: { UPDATE: 'UPDATE' } }));
  t.mock.method(InventoryLedgerEntry, 'findOne', async () => null);
  t.mock.method(InventoryBalance, 'findOne', async () => balanceRecord);
  t.mock.method(InventoryLedgerEntry, 'create', async (data) => data);

  t.mock.method(ProductVariant, 'findByPk', async () => ({
    id: SKU_A,
    productId: PROD_A,
    storeId: STORE_A,
    isDefault: true,
    status: 'active',
  }));

  t.mock.method(ProductVariant, 'update', async (data) => {
    variantUpdated = data;
    return [1];
  });

  t.mock.method(Product, 'update', async (data) => {
    productUpdated = data;
    return [1];
  });

  // Deduct 2 -> onHand becomes 0 -> status becomes out_of_stock
  await inventoryLedgerService.mutateBalance({
    storeId: STORE_A,
    skuId: SKU_A,
    changeOnHand: -2,
    changeReserved: 0,
    reasonCode: 'sale',
    sourceType: 'order',
    sourceId: 'ord-out-of-stock',
    actor: { id: 'buyer-1', type: 'customer' },
    idempotencyKey: 'idem-projection-test',
  });

  assert.equal(balanceRecord.onHand, 0);
  assert.ok(variantUpdated);
  assert.equal(variantUpdated.stockQuantity, 0);
  assert.equal(variantUpdated.status, 'out_of_stock');
  assert.ok(productUpdated);
  assert.equal(productUpdated.stockQuantity, 0);
  assert.equal(productUpdated.status, 'out_of_stock');
});

test('P3-INV-001: 11. Balance Reconstruction & Invariant Audit Command', async (t) => {
  const mockBalances = [
    {
      id: randomUUID(),
      storeId: STORE_A,
      skuId: SKU_A,
      sku: 'SKU-01',
      productId: PROD_A,
      onHand: 15,
      reserved: 5,
      available: 10,
    },
  ];

  const mockLedgerEntries = [
    {
      storeId: STORE_A,
      skuId: SKU_A,
      changeOnHand: 20,
      changeReserved: 0,
    },
    {
      storeId: STORE_A,
      skuId: SKU_A,
      changeOnHand: 0,
      changeReserved: 5,
    },
    {
      storeId: STORE_A,
      skuId: SKU_A,
      changeOnHand: -5,
      changeReserved: 0,
    },
  ]; // Sum onHand = 20 + 0 - 5 = 15; sum reserved = 5; available = 15 - 5 = 10

  const mockReservations = [
    {
      storeId: STORE_A,
      skuId: SKU_A,
      quantity: 5,
      status: 'active',
    },
  ];

  // 11a. Audit passes with exact match
  const mockBalanceModel = { findAll: async () => mockBalances };
  const mockLedgerModel = { findAll: async () => mockLedgerEntries };
  const mockResModel = { findAll: async () => mockReservations };
  const mockVariantModel = { findByPk: async () => ({ id: SKU_A, storeId: STORE_A }) };

  const report = await audit({
    InventoryBalanceModel: mockBalanceModel,
    InventoryLedgerEntryModel: mockLedgerModel,
    InventoryReservationModel: mockResModel,
    ProductVariantModel: mockVariantModel,
  });

  assert.equal(report.compliant, true);
  assert.equal(report.defects.negativeBalances, 0);
  assert.equal(report.defects.reservedExceedsOnHand, 0);
  assert.equal(report.defects.availableMismatch, 0);
  assert.equal(report.defects.ledgerSumMismatchOnHand, 0);
  assert.equal(report.defects.ledgerSumMismatchReserved, 0);
  assert.equal(report.defects.reservationSumMismatch, 0);
  assert.equal(report.defects.storeMismatches, 0);

  // 11b. reconstructBalance domain method
  t.mock.method(InventoryBalance, 'findOne', async () => mockBalances[0]);
  t.mock.method(InventoryLedgerEntry, 'findAll', async () => mockLedgerEntries);

  const recon = await inventoryLedgerService.reconstructBalance({ storeId: STORE_A, skuId: SKU_A });
  assert.equal(recon.match, true);
  assert.equal(recon.calculated.onHand, 15);
  assert.equal(recon.calculated.reserved, 5);
  assert.equal(recon.calculated.available, 10);
});

test('P3-INV-001: 12. Migration 017 verification: empty DB, existing DB backfill, and rollback', async () => {
  const createdTables = [];
  const addedIndexes = [];
  const droppedTables = [];
  const queriesExecuted = [];

  const mockQueryInterface = {
    showAllTables: async () => [],
    createTable: async (tableName, attributes) => {
      createdTables.push({ tableName, attributes });
    },
    addIndex: async (tableName, fields, options) => {
      addedIndexes.push({ tableName, fields, options });
    },
    dropTable: async (tableName) => {
      droppedTables.push(tableName);
    },
  };

  const mockSequelize = {
    query: async (sql, options) => {
      queriesExecuted.push({ sql, options });
      // When querying variants to backfill
      if (sql.includes('FROM ProductVariants pv')) {
        return [[
          {
            id: SKU_A,
            productId: PROD_A,
            storeId: STORE_A,
            sku: 'MIG-SKU-1',
            stockQuantity: 12,
            productStoreId: STORE_A,
          },
        ]];
      }
      // When checking existing balances: return empty array initially
      if (sql.includes('SELECT id FROM InventoryBalances')) {
        return [[]];
      }
      return [[]];
    },
  };

  // 12a. Run up on empty database
  await migration017.up({ queryInterface: mockQueryInterface, sequelize: mockSequelize });

  assert.ok(createdTables.some((t) => t.tableName === 'InventoryBalances'));
  assert.ok(createdTables.some((t) => t.tableName === 'InventoryLedgerEntries'));
  assert.ok(createdTables.some((t) => t.tableName === 'InventoryReservations'));
  assert.ok(addedIndexes.some((i) => i.tableName === 'InventoryBalances'));
  assert.ok(addedIndexes.some((i) => i.tableName === 'InventoryLedgerEntries'));
  assert.ok(addedIndexes.some((i) => i.tableName === 'InventoryReservations'));

  // Verify opening balance inserted
  assert.ok(queriesExecuted.some((q) => q.sql.includes('INSERT INTO InventoryBalances')));
  assert.ok(queriesExecuted.some((q) => q.sql.includes('INSERT INTO InventoryLedgerEntries')));

  // 12b. Run up on existing database (idempotent rerun)
  mockQueryInterface.showAllTables = async () => [
    'inventorybalances',
    'inventoryledgerentries',
    'inventoryreservations',
  ];
  const tablesOnSecondRun = [];
  mockQueryInterface.createTable = async (t) => { tablesOnSecondRun.push(t); };
  mockSequelize.query = async (sql) => {
    // Balances already exist on second run
    if (sql.includes('SELECT id FROM InventoryBalances')) {
      return [[{ id: 'existing-id' }]];
    }
    if (sql.includes('FROM ProductVariants pv')) {
      return [[{ id: SKU_A, productId: PROD_A, storeId: STORE_A, sku: 'MIG-SKU-1', stockQuantity: 12 }]];
    }
    return [[]];
  };

  await migration017.up({ queryInterface: mockQueryInterface, sequelize: mockSequelize });
  assert.equal(tablesOnSecondRun.length, 0, 'Must not recreate tables on rerun');

  // 12c. Run down (clean rollback)
  await migration017.down({ queryInterface: mockQueryInterface });
  assert.ok(droppedTables.includes('InventoryReservations'));
  assert.ok(droppedTables.includes('InventoryLedgerEntries'));
  assert.ok(droppedTables.includes('InventoryBalances'));
});
