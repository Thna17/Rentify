// ecommerce-server/scripts/seedFourStoresProducts.js
// Seeds StoreAccess, StoreDeliveryPolicy, and Products for 4 marketplace-only stores.
// Product names, prices and photo galleries come from ./data/fourStoresCatalogue.js.

const { sequelize } = require('../config/db');
const { StoreAccess, StoreDeliveryPolicy, Product } = require('../models');

// ─── Owner UUIDs & Store UUIDs (must match rentify-server/scripts/seedFourStores.js) ──
const CLOTH_OWNER    = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const CLOTH_STORE_ID = '4c5925a8-2eeb-405e-8525-1be9f3cd58be';

const PHONE_OWNER    = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const PHONE_STORE_ID = 'c8daaa56-4e64-4907-9857-1b6c49ccb0ec';

const SCHOOL_OWNER    = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const SCHOOL_STORE_ID = '56674a8e-5fec-4328-8130-ada835828cc9';

const SKINCARE_OWNER    = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const SKINCARE_STORE_ID = '688a5f23-79df-4bc0-bd09-f53145084491';

// ─── Product catalogue ─────────────────────────────────────────────────────────
const { CLOTH_PRODUCTS, PHONE_PRODUCTS, SCHOOL_PRODUCTS, SKINCARE_PRODUCTS } = require('./data/fourStoresCatalogue');

// Each store's catalogue is built from its own product photos; see ./data/fourStoresCatalogue.js.
const CATALOGUE = {
  [CLOTH_OWNER]: { storeId: CLOTH_STORE_ID, primaryCategory: 'Fashion', products: CLOTH_PRODUCTS },
  [PHONE_OWNER]: { storeId: PHONE_STORE_ID, primaryCategory: 'Electronics', products: PHONE_PRODUCTS },
  [SCHOOL_OWNER]: { storeId: SCHOOL_STORE_ID, primaryCategory: 'Other', products: SCHOOL_PRODUCTS },
  [SKINCARE_OWNER]: { storeId: SKINCARE_STORE_ID, primaryCategory: 'Beauty & Skincare', products: SKINCARE_PRODUCTS },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
async function ensureStoreAccess(storeId, ownerUserId, primaryCategory) {
  let sa = await StoreAccess.findByPk(storeId);
  const payload = {
    storeId,
    ownerUserId,
    websiteId: null,
    primaryCategory,
    needsCategoryReview: false,
    marketplaceEnabled: true,
    marketplaceApprovalStatus: 'approved',
    status: 'active',
    version: 1,
    marketplaceEntitlement: 'pilot',
  };

  if (!sa) {
    const existing = await StoreAccess.findOne({ where: { ownerUserId } });
    if (existing) {
      await existing.update(payload);
      sa = existing;
      console.log(`  ⚡ Updated existing StoreAccess for ${primaryCategory} (${sa.storeId})`);
    } else {
      sa = await StoreAccess.create(payload);
      console.log(`  ✅ Created StoreAccess for ${primaryCategory} (${storeId})`);
    }
  } else {
    await sa.update(payload);
    console.log(`  ⚡ Updated StoreAccess for ${primaryCategory} (${storeId})`);
  }
  return sa.storeId;
}

async function ensureDeliveryPolicy(storeId) {
  let policy = await StoreDeliveryPolicy.findByPk(storeId);
  if (!policy) {
    await StoreDeliveryPolicy.create({
      storeId,
      flatFee: '2.00',
      currency: 'USD',
      version: 1,
    });
  } else {
    await policy.update({ flatFee: '2.00', currency: 'USD' });
  }
}

async function upsertProduct(storeId, { legacyNames = [], ...p }) {
  // A renamed product keeps its row (and its id, stock and orders).
  const existing = await Product.findOne({ where: { storeId, name: [p.name, ...legacyNames] }, order: [['createdAt', 'ASC']] });
  if (existing) {
    await existing.update({
      name: p.name,
      slug: null,
      images: p.images,
      price: p.price,
      compareAtPrice: p.compareAtPrice,
      shortDescription: p.shortDescription,
      description: p.description,
      marketplaceCategory: p.marketplaceCategory,
      websiteNiche: p.websiteNiche,
      productType: p.productType,
      status: 'active',
      stockQuantity: 100,
      marketplaceVisibility: true,
    });
    return false;
  }
  await Product.create({
    ...p,
    storeId,
    websiteId: null,
    marketplaceVisibility: true,
    status: 'active',
    stockQuantity: 100,
  });
  return true;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function seedFourStoresProducts() {
  console.log('🛍  Seeding 4-store marketplace products from each store\'s own photos...');

  for (const [ownerUserId, store] of Object.entries(CATALOGUE)) {
    const storeId = await ensureStoreAccess(store.storeId, ownerUserId, store.primaryCategory);
    await ensureDeliveryPolicy(storeId);
    console.log(`  📦 ${store.primaryCategory} store (${storeId})`);
    for (const p of store.products) {
      const created = await upsertProduct(storeId, p);
      console.log(`    ${created ? '✅' : '⚡'} ${p.name} (${p.images.length} images)`);
    }
  }

  // Ensure all 4 stores' products have status=active and stock=100
  const targetStoreIds = [CLOTH_STORE_ID, PHONE_STORE_ID, SCHOOL_STORE_ID, SKINCARE_STORE_ID];

  await sequelize.query(
    'UPDATE Products SET status = ?, stockQuantity = ?, updatedAt = NOW() WHERE storeId IN (?) AND (status != ? OR stockQuantity <= 0)',
    { replacements: ['active', 100, targetStoreIds, 'active'] }
  );

  console.log('✅ 4-store marketplace products seeded');
}

if (require.main === module) {
  (async () => {
    await sequelize.authenticate();
    await seedFourStoresProducts();
    process.exit(0);
  })().catch((err) => { console.error(err); process.exit(1); });
}

module.exports = seedFourStoresProducts;
