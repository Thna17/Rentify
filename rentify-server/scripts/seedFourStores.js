// rentify-server/scripts/seedFourStores.js
// Creates 4 marketplace-only merchant accounts and their stores.
// Run: docker exec rentify-core-api-1 node scripts/seedFourStores.js
// Requires: NODE_ENV=development, DEV_MARKETPLACE_AUTO_APPROVAL=true

const bcrypt = require('bcryptjs');
const sequelize = require('../src/config/db');
const { User } = require('../src/models');
const storeService = require('../src/services/storeService');
const storeSyncService = require('../src/services/storeSyncService');

if (process.env.NODE_ENV !== 'development') {
  console.error('This script is development-only.');
  process.exit(1);
}

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

async function run() {
  await sequelize.authenticate();
  console.log('✅ Database connected');

  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const report = [];

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
      console.log(`✅ Created user: ${s.email}`);
    } else {
      await user.update({ isVerified: true });
      console.log(`⚡ User already exists (updated isVerified): ${s.email}`);
    }

    // 2. Create marketplace store (idempotent — returns existing if already created)
    const { store, created } = await storeService.createMarketplaceStore({
      ownerUserId: s.id,
      name: s.name,
      primaryCategory: s.category,
      marketplaceEnabled: true,
    });
    console.log(`${created ? '✅ Created' : '⚡ Found existing'} store: ${store.name} (${store.id})`);
    console.log(`   Category: ${store.primaryCategory} | Approval: ${store.marketplaceApprovalStatus}`);

    // 3. Sync store to ecommerce StoreAccess (via HTTP — ecommerce-api must be running)
    const synced = await storeSyncService.syncStore(store.id);
    if (!synced) {
      console.warn(`⚠️  Commerce sync failed for ${store.name} — run ecommerce seed to create StoreAccess manually`);
    } else {
      console.log(`✅ Store synced to commerce API: ${store.name}`);
    }

    report.push({
      store: store.name,
      storeId: store.id,
      ownerUserId: s.id,
      email: s.email,
      password: PASSWORD,
      category: store.primaryCategory,
      approvalStatus: store.marketplaceApprovalStatus,
      synced,
    });
  }

  console.log('\n🎉 Seed complete! Mock login credentials:\n');
  console.log(JSON.stringify(report, null, 2));
}

run()
  .catch((err) => { console.error(err.message); process.exitCode = 1; })
  .finally(() => sequelize.close());
