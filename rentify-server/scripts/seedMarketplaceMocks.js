const sequelize = require('../src/config/db');
const storeService = require('../src/services/storeService');
const storeSyncService = require('../src/services/storeSyncService');

const examples = [
  { ownerUserId: '22222222-2222-4222-8222-222222222222',
    name: 'Aura Botanicals', category: 'Beauty & Skincare' },
  { ownerUserId: '55555555-5555-4555-8555-555555555555',
    name: 'NexTech Electronics', category: 'Electronics' },
];

async function run() {
  if (process.env.NODE_ENV !== 'development') {
    throw new Error('Mock marketplace seeding is development-only');
  }
  const report = [];
  for (const example of examples) {
    const store = await storeService.getOwnStore(example.ownerUserId);
    if (!store || store.name !== example.name) {
      throw new Error(`Expected mock Store ${example.name} was not found`);
    }
    if (store.primaryCategory && store.primaryCategory !== example.category) {
      throw new Error(`${example.name} already has a different primary category`);
    }
    const updated = await storeService.updateOwnStore({
      ownerUserId: example.ownerUserId,
      ...(store.primaryCategory !== example.category || store.needsCategoryReview
        ? { primaryCategory: example.category } : {}),
    });
    if (!await storeSyncService.syncStore(updated.id)) {
      throw new Error(`Commerce projection sync failed for ${example.name}`);
    }
    report.push({ store: example.name, category: updated.primaryCategory,
      approval: updated.marketplaceApprovalStatus });
  }
  console.log(JSON.stringify(report, null, 2));
}

run().catch((error) => { console.error(error.message); process.exitCode = 1; })
  .finally(() => sequelize.close());
