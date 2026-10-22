// tools/fixtures/coreFixtures.js - Seeding and deterministic cleanup for Rentify Core API fixtures

const { assertSafeTestEnvironment } = require('./safety');
const { createPlatformScenario } = require('./scenario');

/**
 * Seeds Core models with a platform scenario and tracks all created record IDs.
 *
 * @param {object} models - Core models (User, Store, Website, WebsiteTemplate, Staff, Package, Subscription, SellerApplication)
 * @param {object} [scenario] - Platform scenario (defaults to createPlatformScenario())
 * @param {object} [options]
 * @returns {Promise<object>} Tracker object with scenario, models, and created record IDs
 */
async function seedCoreFixtures(models, scenario, options = {}) {
  assertSafeTestEnvironment(models);
  const activeScenario = scenario || createPlatformScenario(options);
  const transaction = options.transaction;

  const tracker = {
    scenario: activeScenario,
    models,
    created: {
      User: [],
      WebsiteTemplate: [],
      Store: [],
      Website: [],
      Staff: [],
      Package: [],
      Subscription: [],
      SellerApplication: [],
    },
  };

  // 1. Users
  if (models.User) {
    const userList = Object.values(activeScenario.users);
    for (const u of userList) {
      const record = await models.User.create(u, { transaction });
      tracker.created.User.push(record.id || u.id);
    }
  }

  // 2. Website Template
  if (models.WebsiteTemplate && activeScenario.template) {
    const tmpl = activeScenario.template;
    const record = await models.WebsiteTemplate.create(tmpl, { transaction });
    tracker.created.WebsiteTemplate.push(record.id || tmpl.id);
  }

  // 3. Stores (Two clearly different Stores: marketplace-only and storefront)
  if (models.Store) {
    const storeList = Object.values(activeScenario.stores);
    for (const s of storeList) {
      const record = await models.Store.create(s, { transaction });
      tracker.created.Store.push(record.id || s.id);
    }
  }

  // 4. Websites (Linked to Storefront Store B, none for Store A)
  if (models.Website) {
    const websiteList = Object.values(activeScenario.websites);
    for (const w of websiteList) {
      const record = await models.Website.create(w, { transaction });
      tracker.created.Website.push(record.id || w.id);
    }
  }

  // 5. Staff (Staff for Store B with limited POS & Product permissions)
  if (models.Staff) {
    const staffList = Object.values(activeScenario.staff);
    for (const st of staffList) {
      const record = await models.Staff.create(st, { transaction });
      tracker.created.Staff.push(record.id || st.id);
    }
  }

  // 6. Packages & Subscriptions
  if (models.Package && activeScenario.coreBilling?.package) {
    const pkg = activeScenario.coreBilling.package;
    const record = await models.Package.create(pkg, { transaction });
    tracker.created.Package.push(record.id || pkg.id);
  }

  if (models.Subscription && activeScenario.coreBilling?.subscription) {
    const sub = activeScenario.coreBilling.subscription;
    const record = await models.Subscription.create(sub, { transaction });
    tracker.created.Subscription.push(record.id || sub.id);
  }

  // 7. Seller Applications
  if (models.SellerApplication && activeScenario.sellerApplications) {
    const appList = Object.values(activeScenario.sellerApplications);
    for (const app of appList) {
      const record = await models.SellerApplication.create(app, { transaction });
      tracker.created.SellerApplication.push(record.storeId || record.id || app.storeId);
    }
  }

  return tracker;
}

/**
 * Cleans up strictly the records created by seedCoreFixtures in reverse topological order.
 * Preserves pre-existing non-fixture rows.
 *
 * @param {object} models - Core models
 * @param {object} trackerOrScenario - Tracker object returned by seedCoreFixtures or scenario object
 * @param {object} [options]
 * @returns {Promise<object>} Deletion counts per model
 */
async function cleanupCoreFixtures(models, trackerOrScenario, options = {}) {
  assertSafeTestEnvironment(models);
  const transaction = options.transaction;
  const deletedCounts = {};

  const created = trackerOrScenario?.created || {
    User: Object.values(trackerOrScenario?.users || {}).map((u) => u.id),
    WebsiteTemplate: [trackerOrScenario?.template?.id].filter(Boolean),
    Store: Object.values(trackerOrScenario?.stores || {}).map((s) => s.id),
    Website: Object.values(trackerOrScenario?.websites || {}).map((w) => w.id),
    Staff: Object.values(trackerOrScenario?.staff || {}).map((st) => st.id),
    Package: [trackerOrScenario?.coreBilling?.package?.id].filter(Boolean),
    Subscription: [trackerOrScenario?.coreBilling?.subscription?.id].filter(Boolean),
    SellerApplication: Object.values(trackerOrScenario?.sellerApplications || {}).map((a) => a.storeId || a.id),
  };

  const cleanupOrder = [
    'SellerApplication',
    'Subscription',
    'Package',
    'Staff',
    'Website',
    'Store',
    'WebsiteTemplate',
    'User',
  ];

  for (const modelName of cleanupOrder) {
    const ids = created[modelName];
    const model = models[modelName];
    const key = modelName === 'SellerApplication' ? 'storeId' : (model?.primaryKeyAttribute || 'id');
    if (model && Array.isArray(ids) && ids.length > 0) {
      deletedCounts[modelName] = await model.destroy({
        where: { [key]: ids },
        transaction,
      });
    } else {
      deletedCounts[modelName] = 0;
    }
  }

  return deletedCounts;
}

module.exports = {
  seedCoreFixtures,
  cleanupCoreFixtures,
};
