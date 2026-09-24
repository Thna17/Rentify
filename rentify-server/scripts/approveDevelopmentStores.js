const sequelize = require('../src/config/db');
const { Store, User, Website } = require('../src/models');
const storeService = require('../src/services/storeService');
const storeSyncService = require('../src/services/storeSyncService');

async function run() {
  if (!storeService.developmentApprovalEnabled()) {
    throw new Error('Development seller approval requires NODE_ENV=development and DEV_MARKETPLACE_AUTO_APPROVAL=true');
  }
  const report = { inspected: 0, approved: 0, alreadyApproved: 0,
    needsCategory: 0, unverifiedContact: 0, otherStatus: 0, syncFailed: 0 };
  const stores = await Store.findAll({ attributes: ['id'] });
  for (const { id } of stores) {
    report.inspected += 1;
    const outcome = await sequelize.transaction(async (transaction) => {
      const store = await Store.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!store) return 'otherStatus';
      if (store.marketplaceApprovalStatus === 'approved') return 'alreadyApproved';
      if (store.status !== 'active' || store.marketplaceApprovalStatus !== 'pending') return 'otherStatus';
      if (store.needsCategoryReview || !store.primaryCategory) return 'needsCategory';
      const owner = await User.findByPk(store.ownerUserId, { transaction });
      if (!owner?.isVerified || !(owner.email || owner.phoneNumber)) return 'unverifiedContact';
      if (!storeService.eligibleForDevelopmentApproval(store, owner)) return 'needsCategory';
      await store.update({ marketplaceApprovalStatus: 'approved',
        projectionVersion: store.projectionVersion + 1 }, { transaction });
      const website = await Website.findOne({ where: { storeId: id }, attributes: ['id'], transaction });
      await storeSyncService.queueStore(store, { websiteId: website?.id || null, transaction });
      return 'approved';
    });
    report[outcome] += 1;
    if (outcome === 'approved' && !await storeSyncService.syncStore(id)) report.syncFailed += 1;
  }
  console.log(JSON.stringify(report, null, 2));
  if (report.syncFailed) process.exitCode = 1;
}

run().catch((error) => { console.error(error.message); process.exitCode = 1; })
  .finally(() => sequelize.close());
