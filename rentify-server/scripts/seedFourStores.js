// rentify-server/scripts/seedFourStores.js
// Creates 4 marketplace-only merchant accounts and their stores with deterministic IDs.
// Called automatically from seed.js during docker compose startup.
// Can also be run standalone: docker exec rentify-core-api-1 node scripts/seedFourStores.js

const bcrypt = require('bcrypt');
const sequelize = require('../src/config/db');
const { User, Store } = require('../src/models');

const PASSWORD = 'Rentify@1234';

const STORES = [
  {
    ownerUserId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    storeId: '4c5925a8-2eeb-405e-8525-1be9f3cd58be',
    name: 'Cloth Store',
    email: 'clothstore@rentify.dev',
    phone: '+85512100001',
    category: 'Fashion',
  },
  {
    ownerUserId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    storeId: 'c8daaa56-4e64-4907-9857-1b6c49ccb0ec',
    name: 'Phone Store',
    email: 'phonestore@rentify.dev',
    phone: '+85512100002',
    category: 'Electronics',
  },
  {
    ownerUserId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    storeId: '56674a8e-5fec-4328-8130-ada835828cc9',
    name: 'School Supply Store',
    email: 'schoolsupply@rentify.dev',
    phone: '+85512100003',
    category: 'Other',
  },
  {
    ownerUserId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    storeId: '688a5f23-79df-4bc0-bd09-f53145084491',
    name: 'Skincare Store',
    email: 'skincarestore@rentify.dev',
    phone: '+85512100004',
    category: 'Beauty & Skincare',
  },
];

async function seedFourStores() {
  if (process.env.NODE_ENV !== 'development') {
    console.log('⏭  seedFourStores: skipped (not development)');
    return;
  }

  console.log('🏪 Seeding 4 marketplace stores in Core API...');
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  for (const s of STORES) {
    // 1. Upsert User
    let user = await User.findByPk(s.ownerUserId);
    if (!user) {
      user = await User.create({
        id: s.ownerUserId,
        name: s.name,
        email: s.email,
        phoneNumber: s.phone,
        password: passwordHash,
        role: 'user',
        isVerified: true,
      });
      console.log(`  ✅ Created user: ${s.email}`);
    } else {
      await user.update({
        name: s.name,
        email: s.email,
        phoneNumber: s.phone,
        password: passwordHash,
        isVerified: true,
      });
      console.log(`  ⚡ User updated: ${s.email}`);
    }

    // 2. Upsert Store with deterministic storeId
    let store = await Store.findByPk(s.storeId);
    const storePayload = {
      id: s.storeId,
      ownerUserId: s.ownerUserId,
      name: s.name,
      slug: `store-${s.storeId}`,
      primaryCategory: s.category,
      needsCategoryReview: false,
      marketplaceEnabled: true,
      marketplaceApprovalStatus: 'approved',
      status: 'active',
      projectionVersion: 1,
      marketplaceEntitlement: 'pilot',
    };

    if (!store) {
      // Check if user already owns a store with a different ID (clean up if needed)
      const existingOwnerStore = await Store.findOne({ where: { ownerUserId: s.ownerUserId } });
      if (existingOwnerStore) {
        await existingOwnerStore.update(storePayload);
        store = existingOwnerStore;
        console.log(`  ⚡ Updated existing owner store: ${store.name} (${store.id})`);
      } else {
        store = await Store.create(storePayload);
        console.log(`  ✅ Created store: ${store.name} (${store.id})`);
      }
    } else {
      await store.update(storePayload);
      console.log(`  ⚡ Updated store: ${store.name} (${store.id})`);
    }
  }

  console.log('✅ 4 marketplace stores seeded in Core API');
  console.log('   Login password for all: ' + PASSWORD);
}

// Allow running standalone
if (require.main === module) {
  (async () => {
    await sequelize.authenticate();
    await seedFourStores();
    await sequelize.close();
  })().catch((err) => { console.error(err.message); process.exitCode = 1; });
}

module.exports = seedFourStores;
