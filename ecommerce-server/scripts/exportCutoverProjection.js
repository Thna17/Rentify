const { sequelize } = require('../config/db');
const { StoreAccess, WebsiteData } = require('../models');

async function snapshot() {
  sequelize.options.logging = false;
  const [stores, websites] = await Promise.all([
    StoreAccess.findAll({ attributes: ['storeId', 'ownerUserId', 'websiteId', 'primaryCategory',
      'needsCategoryReview', 'marketplaceEnabled', 'marketplaceApprovalStatus', 'status',
      'marketplaceEntitlement', 'version'], raw: true }),
    WebsiteData.findAll({ attributes: ['websiteId', 'storeId', 'userId', 'domain', 'status'], raw: true }),
  ]);
  return { schemaVersion: 1, source: 'commerce', database: process.env.DB_NAME,
    generatedAt: new Date().toISOString(), stores, websites };
}

if (require.main === module) {
  snapshot().then((result) => console.log(`CUTOVER_SNAPSHOT_JSON=${JSON.stringify(result)}`))
    .catch((error) => { console.error(error.message); process.exitCode = 1; })
    .finally(() => sequelize.close());
}

module.exports = { snapshot };
