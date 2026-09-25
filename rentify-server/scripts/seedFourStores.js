// rentify-server/scripts/seedFourStores.js
// Creates 4 marketplace-only merchant accounts and their stores.
// Called automatically from seed.js during docker compose startup.
// Can also be run standalone: docker exec rentify-core-api-1 node scripts/seedFourStores.js

const bcrypt = require('bcrypt');
const sequelize = require('../src/config/db');
const { User } = require('../src/models');
const storeService = require('../src/services/storeService');
const storeSyncService = require('../src/services/storeSyncService');

const PASSWORD = 'Rentify@1234';

const STORES = [
  {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    name: 'Cloth Store',
    email: 'clothstore@rentify.dev',
    phone: '+85512100001',
    category: 'Fashion',
  },
  {
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    name: 'Phone Store',
    email: 'phonestore@rentify.dev',
    phone: '+85512100002',
    category: 'Electronics',
  },
  {
    id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    name: 'School Supply Store',
    email: 'schoolsupply@rentify.dev',
    phone: '+85512100003',
    category: 'Other',
  },
  {
    id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
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

  console.log('🏪 Seeding 4 marketplace stores...');
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  for (const s of STORES) {
    // 1. Upsert User
    let user = await User.findByPk(s.id);
    if (!user) {
      user = await User.create({
        id: s.id,
        name: s.name,
        email: s.email,
        phoneNumber: s.phone,
        password: passwordHash,
        role: 'user',
        isVerified: true,
      });
      console.log(`  ✅ Created user: ${s.email}`);
    } else {
      await user.update({ isVerified: true });
      console.log(`  ⚡ User exists: ${s.email}`);
    }

    // 2. Create marketplace store (idempotent)
    const { store, created } = await storeService.createMarketplaceStore({
      ownerUserId: s.id,
      name: s.name,
      primaryCategory: s.category,
      marketplaceEnabled: true,
    });
    console.log(`  ${created ? '✅' : '⚡'} Store: ${store.name} | ${store.primaryCategory} | ${store.marketplaceApprovalStatus}`);

    // 3. Sync to ecommerce StoreAccess (best-effort — may fail if ecommerce-api isn't ready yet)
    const synced = await storeSyncService.syncStore(store.id).catch(() => false);
    if (!synced) {
      console.log(`  ⚠️  Commerce sync queued for ${store.name} (will retry automatically)`);
    }
  }

  console.log('✅ 4 marketplace stores seeded');
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
