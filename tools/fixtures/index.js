// tools/fixtures/index.js - Unified integration fixture builder for Rentify platform

const { assertSafeTestEnvironment, UnsafeEnvironmentError } = require('./safety');
const { createPlatformScenario } = require('./scenario');
const { createInMemoryModelAdapter, InMemoryModel } = require('./inMemoryAdapter');
const { seedCoreFixtures, cleanupCoreFixtures } = require('./coreFixtures');
const { seedCommerceFixtures, cleanupCommerceFixtures } = require('./commerceFixtures');
const { PlatformFixtureHarness } = require('./harness');

module.exports = {
  assertSafeTestEnvironment,
  UnsafeEnvironmentError,
  createPlatformScenario,
  createInMemoryModelAdapter,
  InMemoryModel,
  seedCoreFixtures,
  cleanupCoreFixtures,
  seedCommerceFixtures,
  cleanupCommerceFixtures,
  PlatformFixtureHarness,
};
