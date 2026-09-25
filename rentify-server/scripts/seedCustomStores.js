// rentify-server/scripts/seedCustomStores.js
// Creates 5 real seller accounts + stores from the merchant's own product
// photos (Desktop/Area/Product/<Category>/*). Deterministic IDs, same pattern
// as seedFourStores.js, but NOT wired into the main seed chain — run by hand:
//   docker compose exec core-api node scripts/seedCustomStores.js
//
// Every account is a normal, fully-editable seller: sign in at /login with
// the email below and password "Rentify@1234", then edit the store/products
// from the merchant dashboard exactly like a real seller would.

const bcrypt = require('bcrypt');
const sequelize = require('../src/config/db');
const { User, Store } = require('../src/models');

const PASSWORD = 'Rentify@1234';

const STORES = [
  {
    ownerUserId: '11111111-cafe-4001-8001-000000000001',
    storeId: '22222222-cafe-4002-8002-000000000001',
    name: 'Phone Corner',
    slug: 'phone-corner',
    email: 'phonecorner@rentify.dev',
    phone: '+85512200001',
    category: 'Electronics',
  },
  {
    ownerUserId: '11111111-cafe-4001-8001-000000000002',
    storeId: '22222222-cafe-4002-8002-000000000002',
    name: 'Bright Minds School Supply',
    slug: 'bright-minds-school-supply',
    email: 'brightminds@rentify.dev',
    phone: '+85512200002',
    category: 'Other',
  },
  {
    ownerUserId: '11111111-cafe-4001-8001-000000000003',
    storeId: '22222222-cafe-4002-8002-000000000003',
    name: 'Glow Skincare Studio',
    slug: 'glow-skincare-studio',
    email: 'glowskincare@rentify.dev',
    phone: '+85512200003',
    category: 'Beauty & Skincare',
  },
  {
    ownerUserId: '11111111-cafe-4001-8001-000000000004',
    storeId: '22222222-cafe-4002-8002-000000000004',
    name: 'Munchie Snack House',
    slug: 'munchie-snack-house',
    email: 'munchiesnacks@rentify.dev',
    phone: '+85512200004',
    category: 'Food & Beverage',
  },
  {
    ownerUserId: '11111111-cafe-4001-8001-000000000005',
    storeId: '22222222-cafe-4002-8002-000000000005',
    name: 'Second Life Thrift',
    slug: 'second-life-thrift',
    email: 'secondlifethrift@rentify.dev',
    phone: '+85512200005',
    category: 'Fashion',
  },
];

async function seedCustomStores() {
  console.log('🏪 Seeding 5 custom marketplace stores in Core API...');
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  for (const s of STORES) {
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

    let store = await Store.findByPk(s.storeId);
    const storePayload = {
      id: s.storeId,
      ownerUserId: s.ownerUserId,
      name: s.name,
      slug: s.slug,
      primaryCategory: s.category,
      needsCategoryReview: false,
      marketplaceEnabled: true,
      marketplaceApprovalStatus: 'approved',
      status: 'active',
      projectionVersion: 1,
      marketplaceEntitlement: 'pilot',
    };

    if (!store) {
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

  console.log('✅ 5 custom marketplace stores seeded in Core API');
  console.log('   Login password for all: ' + PASSWORD);
}

if (require.main === module) {
  (async () => {
    await sequelize.authenticate();
    await seedCustomStores();
    await sequelize.close();
  })().catch((err) => { console.error(err.message); process.exitCode = 1; });
}

module.exports = { seedCustomStores, STORES };
