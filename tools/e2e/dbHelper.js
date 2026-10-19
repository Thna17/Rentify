// tools/e2e/dbHelper.js - Database fixture setup and teardown across isolated test databases

const { execFileSync } = require('node:child_process');
const path = require('node:path');
const { ROOT_DIR } = require('./config');
const { createPlatformScenario } = require('../fixtures/scenario');

function runIsolatedScript(env, code) {
  const nodeBinary = process.execPath;
  const fullEnv = {
    ...process.env,
    ...env,
    DB_HOST: '127.0.0.1',
    DB_PORT: '3306',
    DB_USER: 'root',
    DB_PASSWORD: 'root',
    NODE_ENV: 'test',
  };

  const output = execFileSync(nodeBinary, ['-e', code], {
    cwd: ROOT_DIR,
    env: fullEnv,
    encoding: 'utf8',
  });
  return output;
}

/**
 * Seeds both Core and Commerce test databases with the platform scenario.
 *
 * @param {object} [scenario]
 * @returns {Promise<object>} Active scenario
 */
async function setupTestDatabases(scenario) {
  const activeScenario = scenario || createPlatformScenario();

  // Clean up any stale fixtures before seeding
  try {
    await teardownTestDatabases(activeScenario);
  } catch {}

  // 1. Core Fixtures
  const coreScript = `
    const { createPlatformScenario } = require('./tools/fixtures/scenario');
    const scenario = createPlatformScenario();
    const coreModels = require('./rentify-server/src/models');
    const { seedCoreFixtures } = require('./tools/fixtures/coreFixtures');
    (async () => {
      try {
        await seedCoreFixtures(coreModels, scenario);
        process.exit(0);
      } catch (err) {
        console.error('Core seeding error:', err);
        process.exit(1);
      }
    })();
  `;
  runIsolatedScript({ DB_NAME: 'rentify_core_test' }, coreScript);

  // 2. Commerce Fixtures
  const commerceScript = `
    const { createPlatformScenario } = require('./tools/fixtures/scenario');
    const scenario = createPlatformScenario();
    const commerceModels = require('./ecommerce-server/models');
    const { seedCommerceFixtures } = require('./tools/fixtures/commerceFixtures');
    (async () => {
      try {
        await seedCommerceFixtures(commerceModels, scenario);
        process.exit(0);
      } catch (err) {
        console.error('Commerce seeding error:', err);
        process.exit(1);
      }
    })();
  `;
  runIsolatedScript({ DB_NAME: 'rentify_commerce_test' }, commerceScript);

  return activeScenario;
}

/**
 * Tears down fixtures from both Core and Commerce test databases.
 *
 * @param {object} scenario
 */
async function teardownTestDatabases(scenario) {
  const activeScenario = scenario || createPlatformScenario();

  // 1. Commerce Teardown
  const commerceScript = `
    const { createPlatformScenario } = require('./tools/fixtures/scenario');
    const scenario = createPlatformScenario();
    const commerceModels = require('./ecommerce-server/models');
    const { cleanupCommerceFixtures } = require('./tools/fixtures/commerceFixtures');
    (async () => {
      try {
        await cleanupCommerceFixtures(commerceModels, scenario);
        process.exit(0);
      } catch (err) {
        console.error('Commerce cleanup error:', err);
        process.exit(1);
      }
    })();
  `;
  runIsolatedScript({ DB_NAME: 'rentify_commerce_test' }, commerceScript);

  // 2. Core Teardown
  const coreScript = `
    const { createPlatformScenario } = require('./tools/fixtures/scenario');
    const scenario = createPlatformScenario();
    const coreModels = require('./rentify-server/src/models');
    const { cleanupCoreFixtures } = require('./tools/fixtures/coreFixtures');
    (async () => {
      try {
        await cleanupCoreFixtures(coreModels, scenario);
        process.exit(0);
      } catch (err) {
        console.error('Core cleanup error:', err);
        process.exit(1);
      }
    })();
  `;
  runIsolatedScript({ DB_NAME: 'rentify_core_test' }, coreScript);
}

module.exports = {
  setupTestDatabases,
  teardownTestDatabases,
};
