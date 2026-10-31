// One-off backfill for automatic marketplace listing (DEC-028).
// Stores created before listing became automatic may still be "pending". This lists every
// pending Store that meets the automatic-listing rule and, with --apply, approves it.
//
//   npm run db:list-pending-stores            dry run: prints the report, changes nothing
//   npm run db:list-pending-stores -- --apply approves the eligible Stores
//
// The report lists every approved Store id. To roll back, set those ids back to
// marketplaceApprovalStatus = 'pending' (and re-sync each Store to Commerce).
const sequelize = require('../src/config/db');
const { Store, User, Website } = require('../src/models');
const storeService = require('../src/modules/stores/storeService');
const storeSyncService = require('../src/modules/commerce-sync/storeSyncService');

const apply = process.argv.includes('--apply');

async function run() {
  const report = { mode: apply ? 'apply' : 'dry-run', inspected: 0, approved: [], alreadyApproved: 0,
    needsCategory: [], unverifiedContact: [], otherStatus: 0, syncFailed: [] };
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
      if (!storeService.eligibleForAutomaticListing(store, owner)) return 'needsCategory';
      if (!apply) return 'approved';
      await store.update({ marketplaceApprovalStatus: 'approved',
        projectionVersion: store.projectionVersion + 1 }, { transaction });
      const website = await Website.findOne({ where: { storeId: id }, attributes: ['id'], transaction });
      await storeSyncService.queueStore(store, { websiteId: website?.id || null, transaction });
      return 'approved';
    });
    if (Array.isArray(report[outcome])) report[outcome].push(id);
    else report[outcome] += 1;
    if (apply && outcome === 'approved' && !await storeSyncService.syncStore(id)) report.syncFailed.push(id);
  }
  console.log(JSON.stringify(report, null, 2));
  if (!apply && report.approved.length) console.log(`Dry run: ${report.approved.length} Store(s) would be approved. Re-run with --apply.`);
  if (report.syncFailed.length) process.exitCode = 1;
}

run().catch((error) => { console.error(error.message); process.exitCode = 1; })
  .finally(() => sequelize.close());
