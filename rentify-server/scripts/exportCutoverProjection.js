const sequelize = require('../src/config/db');
const { Store, Website, StoreSyncOutbox, WebsiteSyncOutbox } = require('../src/models');

async function snapshot() {
  sequelize.options.logging = false;
  const [stores, websites, pendingStores, pendingWebsites] = await Promise.all([
    Store.findAll({ attributes: ['id', 'ownerUserId', 'primaryCategory', 'needsCategoryReview',
      'marketplaceEnabled', 'marketplaceApprovalStatus', 'status', 'marketplaceEntitlement',
      'projectionVersion'], raw: true }),
    Website.findAll({ attributes: ['id', 'storeId', 'userId', 'domain', 'status'], raw: true }),
    StoreSyncOutbox.findAll({ where: { status: 'pending' }, attributes: ['storeId'], raw: true }),
    WebsiteSyncOutbox.findAll({ where: { status: 'pending' }, attributes: ['websiteId'], raw: true }),
  ]);
  return { schemaVersion: 1, source: 'core', database: process.env.DB_NAME,
    generatedAt: new Date().toISOString(), stores, websites,
    pendingStoreIds: pendingStores.map((row) => row.storeId),
    pendingWebsiteIds: pendingWebsites.map((row) => row.websiteId) };
}

if (require.main === module) {
  snapshot().then((result) => console.log(`CUTOVER_SNAPSHOT_JSON=${JSON.stringify(result)}`))
    .catch((error) => { console.error(error.message); process.exitCode = 1; })
    .finally(() => sequelize.close());
}

module.exports = { snapshot };
