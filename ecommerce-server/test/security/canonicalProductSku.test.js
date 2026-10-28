// test/security/canonicalProductSku.test.js
// Verification suite for P3-CAT-001: Canonical Product and SKU Contract.

const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { Op, Sequelize } = require('sequelize');

Sequelize.prototype.authenticate = async () => {};
Sequelize.prototype.validate = async () => {};

const { sequelize } = require('../../config/db');
sequelize.authenticate = async () => {};
sequelize.validate = async () => {};

const { Product, ProductVariant, ProductOption, StoreAccess, WebsiteData } = require('../../models');
const storeCatalog = require('../../modules/store-catalog/storeCatalogService');
const ProductService = require('../../modules/catalog/ProductService');
const { audit } = require('../../scripts/auditProductSkus');
const migration014 = require('../../migrations/20261025_014_canonical_product_sku');

// Deterministic Store and User IDs
const STORE_A = '11111111-1111-4111-8111-111111111111';
const STORE_B = '22222222-2222-4222-8222-222222222222';
const OWNER_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OWNER_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

const mockStoreAccessA = {
  storeId: STORE_A,
  ownerUserId: OWNER_A,
  status: 'active',
  marketplaceApprovalStatus: 'approved',
  marketplaceEnabled: true,
  marketplaceEntitlement: 'pilot',
  needsCategoryReview: false,
};

const mockStoreAccessB = {
  storeId: STORE_B,
  ownerUserId: OWNER_B,
  status: 'active',
  marketplaceApprovalStatus: 'approved',
  marketplaceEnabled: true,
  marketplaceEntitlement: 'pilot',
  needsCategoryReview: false,
};

test('P3-CAT-001: 1. Simple Product default SKU', async (t) => {
  t.mock.method(sequelize, 'transaction', async (fn) => fn({ LOCK: { UPDATE: 'UPDATE' } }));
  t.mock.method(StoreAccess, 'findByPk', async (id) => (id === STORE_A ? mockStoreAccessA : null));
  t.mock.method(Product, 'count', async () => 0);
  t.mock.method(Product, 'findOne', async () => null);

  const productData = {
    name: 'Handcrafted Bamboo Basket',
    price: 15.50,
    stockQuantity: 12,
    marketplaceCategory: 'Handmade Crafts',
    status: 'active',
    sku: 'BAMBOO-BSK-001',
    barcode: '8850123456001',
    currency: 'USD',
  };

  const createdVariants = [];
  t.mock.method(ProductVariant, 'create', async (variant) => {
    const record = {
      id: randomUUID(),
      ...variant,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    createdVariants.push(record);
    return record;
  });

  t.mock.method(ProductVariant, 'findOne', async () => null);

  let createdProduct = null;
  t.mock.method(Product, 'create', async (prod) => {
    createdProduct = {
      id: randomUUID(),
      ...prod,
      version: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    return createdProduct;
  });

  const product = await storeCatalog.create(mockStoreAccessA, productData);

  assert.ok(product, 'Product must be created');
  assert.equal(product.hasVariants, false, 'Simple product hasVariants must be false');
  assert.equal(product.sku, 'BAMBOO-BSK-001', 'Product must store the canonical SKU');
  assert.equal(product.barcode, '8850123456001', 'Product must store the barcode');
  assert.equal(product.currency, 'USD', 'Product currency must default to USD');

  // Verify single default SKU was created
  assert.equal(createdVariants.length, 1, 'Exactly one default SKU must be created');
  const defaultSku = createdVariants[0];
  assert.equal(defaultSku.isDefault, true, 'Default SKU isDefault must be true');
  assert.deepEqual(defaultSku.optionValues, {}, 'Default SKU optionValues must be empty');
  assert.equal(defaultSku.sku, 'BAMBOO-BSK-001', 'Default SKU identifier must match product SKU');
  assert.equal(defaultSku.barcode, '8850123456001', 'Default SKU barcode must match product barcode');
  assert.equal(defaultSku.price, '15.50', 'Default SKU price must match product price');
  assert.equal(defaultSku.stockQuantity, 12, 'Default SKU stock must match product stock');
  assert.equal(defaultSku.storeId, STORE_A, 'Default SKU storeId must match product storeId');
  assert.equal(defaultSku.currency, 'USD', 'Default SKU currency must match');
});

test('P3-CAT-001: 2. Variant Product SKUs', async (t) => {
  t.mock.method(sequelize, 'transaction', async (fn) => fn({ LOCK: { UPDATE: 'UPDATE' } }));
  t.mock.method(StoreAccess, 'findByPk', async (id) => (id === STORE_A ? mockStoreAccessA : null));
  t.mock.method(Product, 'count', async () => 0);
  t.mock.method(Product, 'findOne', async () => null);
  t.mock.method(ProductVariant, 'findOne', async () => null);

  const createdVariants = [];
  t.mock.method(ProductVariant, 'create', async (variant) => {
    const record = {
      id: randomUUID(),
      ...variant,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    createdVariants.push(record);
    return record;
  });

  let createdProduct = null;
  t.mock.method(Product, 'create', async (prod) => {
    createdProduct = {
      id: randomUUID(),
      ...prod,
      version: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    return createdProduct;
  });

  const variantPayload = {
    name: 'Silk Ikat Scarf',
    price: 45.00,
    stockQuantity: 20,
    marketplaceCategory: 'Clothing',
    status: 'active',
    variants: [
      {
        sku: 'SILK-SCARF-RED-S',
        barcode: '8850123456101',
        price: 45.00,
        stockQuantity: 8,
        optionValues: { Color: 'Red', Size: 'S' },
        isDefault: true,
      },
      {
        sku: 'SILK-SCARF-BLU-M',
        barcode: '8850123456102',
        price: 50.00,
        stockQuantity: 12,
        optionValues: { Color: 'Blue', Size: 'M' },
        isDefault: false,
      },
    ],
  };

  const product = await storeCatalog.create(mockStoreAccessA, variantPayload);

  assert.ok(product, 'Variant product must be created');
  assert.equal(product.hasVariants, true, 'hasVariants must be true for variant product');
  assert.equal(createdVariants.length, 2, 'Exactly 2 variants must be created');

  const [var1, var2] = createdVariants;
  assert.equal(var1.sku, 'SILK-SCARF-RED-S');
  assert.equal(var1.barcode, '8850123456101');
  assert.equal(var1.price, '45.00');
  assert.equal(var1.stockQuantity, 8);
  assert.equal(var1.isDefault, true, 'First variant designated default');
  assert.deepEqual(var1.optionValues, { Color: 'Red', Size: 'S' });

  assert.equal(var2.sku, 'SILK-SCARF-BLU-M');
  assert.equal(var2.barcode, '8850123456102');
  assert.equal(var2.price, '50.00');
  assert.equal(var2.stockQuantity, 12);
  assert.equal(var2.isDefault, false);
  assert.deepEqual(var2.optionValues, { Color: 'Blue', Size: 'M' });
});

test('P3-CAT-001: 3. Duplicate SKU rejection within Store & Cross-Store Allowance', async (t) => {
  t.mock.method(sequelize, 'transaction', async (fn) => fn({ LOCK: { UPDATE: 'UPDATE' } }));
  t.mock.method(StoreAccess, 'findByPk', async (id) => (id === STORE_A ? mockStoreAccessA : mockStoreAccessB));
  t.mock.method(Product, 'count', async () => 0);
  t.mock.method(Product, 'findOne', async () => null);

  // Existing variant in Store A has SKU 'EXISTING-SKU-001'
  t.mock.method(ProductVariant, 'findOne', async ({ where }) => {
    if (where.storeId === STORE_A && where.sku === 'EXISTING-SKU-001') {
      return { id: 'var-existing-1', storeId: STORE_A, sku: 'EXISTING-SKU-001' };
    }
    return null;
  });

  // Attempting to create duplicate SKU in Store A must reject deterministically
  await assert.rejects(
    storeCatalog.create(mockStoreAccessA, {
      name: 'Duplicate Item',
      price: 20.00,
      stockQuantity: 5,
      marketplaceCategory: 'Handmade Crafts',
      sku: 'EXISTING-SKU-001',
    }),
    (err) => {
      assert.equal(err.statusCode, 409);
      assert.equal(err.code, 'DUPLICATE_SKU');
      assert.match(err.message, /Duplicate SKU/);
      return true;
    }
  );

  // Attempting duplicate SKU within single variant payload in Store A must reject
  await assert.rejects(
    storeCatalog.create(mockStoreAccessA, {
      name: 'Duplicate Payload Item',
      price: 20.00,
      stockQuantity: 5,
      marketplaceCategory: 'Handmade Crafts',
      variants: [
        { sku: 'NEW-VAR-1', price: 20, optionValues: { Size: 'S' } },
        { sku: 'NEW-VAR-1', price: 20, optionValues: { Size: 'M' } },
      ],
    }),
    (err) => {
      assert.equal(err.statusCode, 409);
      assert.equal(err.code, 'DUPLICATE_SKU');
      return true;
    }
  );

  // Cross-Store duplicate: creating 'EXISTING-SKU-001' in Store B MUST succeed!
  t.mock.method(ProductVariant, 'create', async (data) => ({ id: randomUUID(), ...data }));
  t.mock.method(Product, 'create', async (data) => ({ id: randomUUID(), ...data }));

  const crossStoreProduct = await storeCatalog.create(mockStoreAccessB, {
    name: 'Store B Independent Item',
    price: 20.00,
    stockQuantity: 5,
    marketplaceCategory: 'Handmade Crafts',
    sku: 'EXISTING-SKU-001',
  });

  assert.ok(crossStoreProduct, 'Store B must be allowed to use same SKU as Store A');
  assert.equal(crossStoreProduct.storeId, STORE_B);
});

test('P3-CAT-001: 4. Barcode behavior: Store scope uniqueness & Null allowance', async (t) => {
  t.mock.method(sequelize, 'transaction', async (fn) => fn({ LOCK: { UPDATE: 'UPDATE' } }));
  t.mock.method(StoreAccess, 'findByPk', async (id) => (id === STORE_A ? mockStoreAccessA : mockStoreAccessB));
  t.mock.method(Product, 'count', async () => 0);
  t.mock.method(Product, 'findOne', async () => null);

  // Existing barcode in Store A
  t.mock.method(ProductVariant, 'findOne', async ({ where }) => {
    if (where.storeId === STORE_A && where.barcode === '8850999999999') {
      return { id: 'var-barcode-1', storeId: STORE_A, barcode: '8850999999999' };
    }
    return null;
  });

  // Duplicate barcode in Store A rejects with 409 DUPLICATE_BARCODE
  await assert.rejects(
    storeCatalog.create(mockStoreAccessA, {
      name: 'Barcode Duplicate Item',
      price: 10.00,
      stockQuantity: 2,
      marketplaceCategory: 'Handmade Crafts',
      barcode: '8850999999999',
    }),
    (err) => {
      assert.equal(err.statusCode, 409);
      assert.equal(err.code, 'DUPLICATE_BARCODE');
      assert.match(err.message, /Duplicate barcode/);
      return true;
    }
  );

  // Cross-Store duplicate barcode: Store B with same barcode succeeds
  t.mock.method(ProductVariant, 'create', async (data) => ({ id: randomUUID(), ...data }));
  t.mock.method(Product, 'create', async (data) => ({ id: randomUUID(), ...data }));

  const crossStoreBarcode = await storeCatalog.create(mockStoreAccessB, {
    name: 'Store B Barcode Item',
    price: 10.00,
    stockQuantity: 2,
    marketplaceCategory: 'Handmade Crafts',
    barcode: '8850999999999',
  });
  assert.ok(crossStoreBarcode, 'Cross-store barcode duplicates must be permitted');

  // Null/empty barcodes must not conflict
  const nullBarcodeItem1 = await storeCatalog.create(mockStoreAccessA, {
    name: 'Null Barcode 1',
    price: 10.00,
    stockQuantity: 2,
    marketplaceCategory: 'Handmade Crafts',
    barcode: null,
  });
  const nullBarcodeItem2 = await storeCatalog.create(mockStoreAccessA, {
    name: 'Null Barcode 2',
    price: 10.00,
    stockQuantity: 2,
    marketplaceCategory: 'Handmade Crafts',
    barcode: '',
  });
  assert.equal(nullBarcodeItem1.barcode, null);
  assert.equal(nullBarcodeItem2.barcode, null);
});

test('P3-CAT-001: 5. Stable IDs: Variant updates preserve stable purchasable IDs', async (t) => {
  t.mock.method(sequelize, 'transaction', async (fn) => fn({ LOCK: { UPDATE: 'UPDATE' } }));
  const productId = randomUUID();
  const stableVariantId = 'stable-variant-id-12345';

  const mockVariant = {
    id: stableVariantId,
    productId,
    storeId: STORE_A,
    sku: 'ORIGINAL-SKU-1',
    barcode: '11111111',
    price: '30.00',
    stockQuantity: 5,
    trackInventory: true,
    isDefault: true,
    optionValues: { Size: 'S' },
    status: 'active',
    update: async function (changes) {
      Object.assign(this, changes);
      return this;
    },
  };

  const mockProduct = {
    id: productId,
    storeId: STORE_A,
    name: 'Stable Variant Item',
    hasVariants: true,
    version: 1,
    ProductVariants: [mockVariant],
    update: async function (changes) {
      Object.assign(this, changes);
      return this;
    },
  };

  t.mock.method(Product, 'findOne', async () => mockProduct);
  t.mock.method(ProductVariant, 'findOne', async () => null);

  // Update variant item price and stock
  await storeCatalog.update(STORE_A, productId, {
    expectedVersion: 1,
    variants: [
      {
        id: stableVariantId, // Match existing variant ID
        sku: 'ORIGINAL-SKU-1',
        price: '35.00',
        stockQuantity: 10,
        optionValues: { Size: 'S' },
      },
    ],
  });

  // Verify variant ID was preserved, not recreated
  assert.equal(mockVariant.id, stableVariantId, 'Variant ID must remain stable across updates');
  assert.equal(mockVariant.price, '35.00', 'Variant price updated in place');
  assert.equal(mockVariant.stockQuantity, 10, 'Variant stock updated in place');
});

test('P3-CAT-001: 6. Store Isolation: Store A cannot access Store B products or SKUs', async (t) => {
  t.mock.method(sequelize, 'transaction', async (fn) => fn({ LOCK: { UPDATE: 'UPDATE' } }));

  t.mock.method(Product, 'findAndCountAll', async ({ where }) => {
    if (where.storeId === STORE_A) {
      return { count: 1, rows: [{ id: 'prod-a', storeId: STORE_A, name: 'Item A', ProductVariants: [] }] };
    }
    if (where.storeId === STORE_B) {
      return { count: 1, rows: [{ id: 'prod-b', storeId: STORE_B, name: 'Item B', ProductVariants: [] }] };
    }
    return { count: 0, rows: [] };
  });

  const listA = await storeCatalog.listOwn(STORE_A);
  assert.equal(listA.total, 1);
  assert.equal(listA.products[0].storeId, STORE_A);

  const listB = await storeCatalog.listOwn(STORE_B);
  assert.equal(listB.total, 1);
  assert.equal(listB.products[0].storeId, STORE_B);

  // Store A cannot update Store B's product
  t.mock.method(Product, 'findOne', async ({ where }) => {
    if (where.id === 'prod-b' && where.storeId === STORE_A) return null;
    return null;
  });

  await assert.rejects(
    storeCatalog.update(STORE_A, 'prod-b', { expectedVersion: 1, name: 'Hacked' }),
    (err) => {
      assert.equal(err.statusCode, 404);
      assert.match(err.message, /Product not found/);
      return true;
    }
  );
});

test('P3-CAT-001: 7. Legacy Product response compatibility', () => {
  const mockProductRow = {
    id: 'prod-legacy-1',
    storeId: STORE_A,
    name: 'Legacy Silk Scarf',
    slug: 'legacy-silk-scarf',
    description: 'Traditional scarf',
    price: '40.00',
    compareAtPrice: '50.00',
    currency: 'USD',
    barcode: '8850000000001',
    sku: 'SKU-LEGACY-01',
    hasVariants: true,
    marketplaceCategory: 'Clothing',
    images: [{ url: 'https://res.cloudinary.com/rentify/image.jpg' }],
    stockQuantity: 15,
    status: 'active',
    ProductVariants: [
      {
        id: 'var-1',
        images: [{ url: 'https://example.com/selected-color.png' }],
        productId: 'prod-legacy-1',
        storeId: STORE_A,
        sku: 'SKU-LEGACY-01',
        barcode: '8850000000001',
        price: '40.00',
        compareAtPrice: '50.00',
        currency: 'USD',
        stockQuantity: 15,
        optionValues: {},
        isDefault: true,
        status: 'active',
      },
    ],
  };

  const formatted = storeCatalog.publicProduct(mockProductRow, { rating: 4.9, reviewCount: 8 });
  assert.equal(formatted.productVariants[0].image, 'https://example.com/selected-color.png');

  // Verify all legacy fields are present and compatible
  assert.equal(formatted.id, 'prod-legacy-1');
  assert.equal(formatted.storeId, STORE_A);
  assert.equal(formatted.name, 'Legacy Silk Scarf');
  assert.equal(formatted.slug, 'legacy-silk-scarf');
  assert.equal(formatted.price, '40.00');
  assert.equal(formatted.category, 'Clothing');
  assert.equal(formatted.stockQuantity, 15);
  assert.equal(formatted.status, 'active');
  assert.equal(formatted.rating, 4.9);
  assert.equal(formatted.reviewCount, 8);

  // Verify canonical additions
  assert.equal(formatted.currency, 'USD');
  assert.equal(formatted.barcode, '8850000000001');
  assert.equal(formatted.sku, 'SKU-LEGACY-01');
  assert.equal(formatted.hasVariants, true);
  assert.equal(formatted.variants.length, 1);
  assert.equal(formatted.variants[0].sku, 'SKU-LEGACY-01');
  assert.equal(formatted.variants[0].isDefault, true);
});

test('P3-CAT-001: 8. Empty migration verification', async () => {
  const addedColumns = [];
  const addedIndexes = [];

  const mockQueryInterface = {
    describeTable: async (table) => {
      // Empty table with baseline columns only
      if (table === 'Products') {
        return { id: {}, name: {}, price: {}, stockQuantity: {} };
      }
      return { id: {}, productId: {}, price: {}, stockQuantity: {} };
    },
    addColumn: async (table, col, def) => {
      addedColumns.push({ table, col, def });
    },
    showIndex: async () => [],
    addIndex: async (table, fields, options) => {
      addedIndexes.push({ table, fields, options });
    },
  };

  const mockSequelize = {
    query: async (sql) => {
      if (sql.includes('SELECT p.`id`') || sql.includes('SELECT DISTINCT')) return [[]];
      if (sql.includes('COUNT(*)')) return [[{ count: 0 }]];
      return [[]];
    },
  };

  await migration014.up({ queryInterface: mockQueryInterface, sequelize: mockSequelize });

  // Verify columns were added
  assert.ok(addedColumns.some((c) => c.table === 'Products' && c.col === 'currency'));
  assert.ok(addedColumns.some((c) => c.table === 'Products' && c.col === 'barcode'));
  assert.ok(addedColumns.some((c) => c.table === 'Products' && c.col === 'sku'));
  assert.ok(addedColumns.some((c) => c.table === 'Products' && c.col === 'hasVariants'));

  assert.ok(addedColumns.some((c) => c.table === 'ProductVariants' && c.col === 'storeId'));
  assert.ok(addedColumns.some((c) => c.table === 'ProductVariants' && c.col === 'barcode'));
  assert.ok(addedColumns.some((c) => c.table === 'ProductVariants' && c.col === 'currency'));
  assert.ok(addedColumns.some((c) => c.table === 'ProductVariants' && c.col === 'isDefault'));

  // Verify unique indexes added
  assert.ok(addedIndexes.some((i) => i.options.name === 'uq_product_variants_store_sku'));
  assert.ok(addedIndexes.some((i) => i.options.name === 'uq_product_variants_store_barcode'));
  assert.ok(addedIndexes.some((i) => i.options.name === 'uq_products_store_sku'));
  assert.ok(addedIndexes.some((i) => i.options.name === 'uq_products_store_barcode'));
});

test('P3-CAT-001: 9. Existing-data migration: Backfills simple product default SKU and updates variants', async () => {
  const insertedVariants = [];
  const updatedProducts = [];

  const mockQueryInterface = {
    describeTable: async () => ({
      currency: {},
      barcode: {},
      sku: {},
      hasVariants: {},
      storeId: {},
      isDefault: {},
    }),
    showIndex: async () => [
      { name: 'uq_product_variants_store_sku', fields: [{ name: 'storeId' }, { name: 'sku' }] },
      { name: 'uq_product_variants_store_barcode', fields: [{ name: 'storeId' }, { name: 'barcode' }] },
      { name: 'idx_product_variants_product_default', fields: [{ name: 'productId' }, { name: 'isDefault' }] },
      { name: 'idx_product_variants_store_id', fields: [{ name: 'storeId' }] },
      { name: 'uq_products_store_sku', fields: [{ name: 'storeId' }, { name: 'sku' }] },
      { name: 'uq_products_store_barcode', fields: [{ name: 'storeId' }, { name: 'barcode' }] },
    ],
  };

  const simpleProdId = 'prod-simple-001';
  const mockSequelize = {
    query: async (sql, options) => {
      if (sql.includes('SELECT p.`id`') && sql.includes('FROM `Products` p')) {
        // Returns 1 simple product without variants
        return [[{
          id: simpleProdId,
          storeId: STORE_A,
          name: 'Existing Simple Teapot',
          price: 25.00,
          compareAtPrice: null,
          currency: 'USD',
          barcode: '8850111111111',
          sku: null,
          stockQuantity: 10,
          trackInventory: true,
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        }]];
      }
      if (sql.includes('INSERT INTO `ProductVariants`')) {
        insertedVariants.push(options.replacements);
        return [[]];
      }
      if (sql.includes('UPDATE `Products`') && sql.includes('SET `sku` = ?')) {
        updatedProducts.push(options.replacements);
        return [[]];
      }
      if (sql.includes('SELECT DISTINCT pv.`productId`')) {
        return [[]]; // No variant products needing default
      }
      if (sql.includes('COUNT(*)')) {
        return [[{ count: 1 }]];
      }
      return [[]];
    },
  };

  await migration014.up({ queryInterface: mockQueryInterface, sequelize: mockSequelize });

  assert.equal(insertedVariants.length, 1, 'Default SKU must be backfilled for simple product');
  const [replacements] = insertedVariants;
  assert.equal(replacements[1], simpleProdId, 'productId matches');
  assert.equal(replacements[2], STORE_A, 'storeId matches');
  assert.equal(replacements[4], '8850111111111', 'barcode preserved');
  assert.equal(replacements[5], 25.00, 'price matches');
  assert.equal(replacements[10], 1, 'isDefault must be 1');
});

test('P3-CAT-001: 10. Idempotent rerun: Multiple executions make zero changes and no duplicate rows', async () => {
  const insertedRows = [];

  const mockQueryInterface = {
    describeTable: async () => ({
      currency: {},
      barcode: {},
      sku: {},
      hasVariants: {},
      storeId: {},
      isDefault: {},
    }),
    showIndex: async () => [
      { name: 'uq_product_variants_store_sku', fields: [{ name: 'storeId' }, { name: 'sku' }] },
      { name: 'uq_product_variants_store_barcode', fields: [{ name: 'storeId' }, { name: 'barcode' }] },
      { name: 'idx_product_variants_product_default', fields: [{ name: 'productId' }, { name: 'isDefault' }] },
      { name: 'idx_product_variants_store_id', fields: [{ name: 'storeId' }] },
      { name: 'uq_products_store_sku', fields: [{ name: 'storeId' }, { name: 'sku' }] },
      { name: 'uq_products_store_barcode', fields: [{ name: 'storeId' }, { name: 'barcode' }] },
    ],
  };

  const mockSequelize = {
    query: async (sql, options) => {
      if (sql.includes('WHERE pv.`id` IS NULL')) {
        // 0 products without variants on second run
        return [[]];
      }
      if (sql.includes('INSERT INTO `ProductVariants`')) {
        insertedRows.push(options?.replacements);
        return [[]];
      }
      if (sql.includes('SELECT DISTINCT pv.`productId`')) {
        return [[]];
      }
      if (sql.includes('COUNT(*)')) {
        return [[{ count: 5 }]];
      }
      return [[]];
    },
  };

  // Run migration second time
  await migration014.up({ queryInterface: mockQueryInterface, sequelize: mockSequelize });

  assert.equal(insertedRows.length, 0, 'No rows should be inserted on an already-migrated database');
});

test('P3-CAT-001: 11. Backfill audit command validates 100% compliance', async (t) => {
  t.mock.method(sequelize, 'query', async (sql) => {
    if (sql.includes('SELECT COUNT(*) AS count FROM `Products` WHERE `hasVariants` = 0')) {
      return [[{ count: 10 }]];
    }
    if (sql.includes('SELECT COUNT(*) AS count FROM `Products` WHERE `hasVariants` = 1')) {
      return [[{ count: 2 }]];
    }
    if (sql.includes('SELECT COUNT(*) AS count FROM `Products`')) {
      return [[{ count: 12 }]];
    }
    if (sql.includes('SELECT COUNT(*) AS count FROM `ProductVariants` WHERE `storeId` IS NULL')) {
      return [[{ count: 0 }]];
    }
    if (sql.includes('SELECT COUNT(*) AS count FROM `ProductVariants`')) {
      return [[{ count: 15 }]]; // 10 simple default SKUs + 5 variants for 2 variant products
    }
    if (sql.includes('missingDefaultSkuRows') || sql.includes('HAVING COUNT(*) > 1') || sql.includes('WHERE pv.`id` IS NULL')) {
      return [[]]; // Zero defects
    }
    if (sql.includes('WHERE pv.`storeId` <> p.`storeId`') || sql.includes('pv.`storeId` IS NOT NULL AND p.`storeId` IS NOT NULL')) {
      return [[{ count: 0 }]];
    }
    return [[]];
  });

  const summary = await audit();

  assert.equal(summary.totalProducts, 12);
  assert.equal(summary.simpleProducts, 10);
  assert.equal(summary.variantProducts, 2);
  assert.equal(summary.totalVariants, 15);
  assert.equal(summary.defects.simpleProductsMissingDefaultSku, 0);
  assert.equal(summary.defects.productsWithoutAnyVariant, 0);
  assert.equal(summary.defects.variantsMissingStoreId, 0);
  assert.equal(summary.defects.duplicateSkusInStore, 0);
  assert.equal(summary.defects.duplicateBarcodesInStore, 0);
  assert.equal(summary.defects.storeMismatches, 0);
  assert.equal(summary.compliant, true, 'Audit must report 100% compliance');
});
