// tools/fixtures/harness.js - Unified fixture harness orchestrating Core and Commerce scenarios

const { assertSafeTestEnvironment } = require('./safety');
const { createPlatformScenario } = require('./scenario');
const { seedCoreFixtures, cleanupCoreFixtures } = require('./coreFixtures');
const { seedCommerceFixtures, cleanupCommerceFixtures } = require('./commerceFixtures');

class PlatformFixtureHarness {
  /**
   * @param {object} [options]
   * @param {object} [options.coreModels] - Models map for Core API
   * @param {object} [options.commerceModels] - Models map for Commerce API
   * @param {string} [options.idPrefix] - Optional prefix for IDs
   * @param {object} [options.scenarioOverrides] - Scenario data overrides
   * @param {object} [options.scenario] - Pre-built scenario object
   */
  constructor(options = {}) {
    this.coreModels = options.coreModels || null;
    this.commerceModels = options.commerceModels || null;
    this.scenario = options.scenario || createPlatformScenario({
      idPrefix: options.idPrefix,
      overrides: options.scenarioOverrides,
    });
    this.coreTracker = null;
    this.commerceTracker = null;
    this.isSetup = false;
  }

  /**
   * Sets up test fixtures across configured services.
   *
   * @param {object} [options]
   * @returns {Promise<object>} The active scenario
   */
  async setup(options = {}) {
    if (this.coreModels) {
      assertSafeTestEnvironment(this.coreModels);
      this.coreTracker = await seedCoreFixtures(this.coreModels, this.scenario, options);
    }

    if (this.commerceModels) {
      assertSafeTestEnvironment(this.commerceModels);
      this.commerceTracker = await seedCommerceFixtures(this.commerceModels, this.scenario, options);
    }

    this.isSetup = true;
    return this.scenario;
  }

  /**
   * Tears down only fixture-created records from configured services.
   *
   * @param {object} [options]
   * @returns {Promise<object>} Cleanup statistics
   */
  async teardown(options = {}) {
    const stats = { core: {}, commerce: {} };

    if (this.commerceModels && this.commerceTracker) {
      assertSafeTestEnvironment(this.commerceModels);
      stats.commerce = await cleanupCommerceFixtures(this.commerceModels, this.commerceTracker, options);
      this.commerceTracker = null;
    }

    if (this.coreModels && this.coreTracker) {
      assertSafeTestEnvironment(this.coreModels);
      stats.core = await cleanupCoreFixtures(this.coreModels, this.coreTracker, options);
      this.coreTracker = null;
    }

    this.isSetup = false;
    return stats;
  }

  get ids() {
    return this.scenario.ids;
  }

  getStore(type = 'marketplaceOnly') {
    return this.scenario.stores[type] || null;
  }

  getOwner(type = 'marketplaceOnly') {
    const store = this.getStore(type);
    if (!store) return null;
    return Object.values(this.scenario.users).find((u) => u.id === store.ownerUserId) || null;
  }

  getStaff() {
    return this.scenario.staff.posStaff || null;
  }

  getBuyer() {
    return {
      coreUser: this.scenario.users.buyer,
      customer: this.scenario.customers.buyer,
    };
  }

  getSimpleProduct() {
    return this.scenario.products.simpleVase || null;
  }

  getVariantProduct() {
    return {
      product: this.scenario.products.variantScarf,
      variants: Object.values(this.scenario.productVariants),
    };
  }

  getOrders() {
    return this.scenario.orders;
  }

  getProjections() {
    return this.scenario.projections;
  }
}

module.exports = {
  PlatformFixtureHarness,
};
