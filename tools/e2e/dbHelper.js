// tools/e2e/dbHelper.js - Database fixture setup, migrations, and teardown across isolated test databases

const { execFileSync } = require('node:child_process');
const path = require('node:path');
const { ROOT_DIR } = require('./config');
const { assertSafeTestEnvironment } = require('./safety');
const { createPlatformScenario } = require('../fixtures/scenario');

function getMysqlDriver() {
  try {
    return require(path.join(ROOT_DIR, 'rentify-server/node_modules/mysql2/promise'));
  } catch (_e) {
    return require(path.join(ROOT_DIR, 'ecommerce-server/node_modules/mysql2/promise'));
  }
}

/**
 * Creates isolated test databases if they do not exist and applies all pending migrations.
 */
async function ensureDatabasesAndMigrations() {
  assertSafeTestEnvironment({
    host: '127.0.0.1',
    database: 'rentify_core_test',
  });
  assertSafeTestEnvironment({
    host: '127.0.0.1',
    database: 'rentify_commerce_test',
  });

  const mysql = getMysqlDriver();
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: 'root',
  });

  try {
    await connection.query('CREATE DATABASE IF NOT EXISTS rentify_core_test;');
    await connection.query('CREATE DATABASE IF NOT EXISTS rentify_commerce_test;');
  } finally {
    await connection.end();
  }

  const nodeBinary = process.execPath;
  const commonEnv = {
    ...process.env,
    DB_HOST: '127.0.0.1',
    DB_PORT: '3306',
    DB_USER: 'root',
    DB_PASSWORD: 'root',
    NODE_ENV: 'test',
  };

  // Run & verify Core API migrations
  execFileSync(nodeBinary, ['rentify-server/src/migrations/runner.js', 'migrate'], {
    cwd: ROOT_DIR,
    env: { ...commonEnv, DB_NAME: 'rentify_core_test' },
    stdio: 'pipe',
  });
  execFileSync(nodeBinary, ['rentify-server/src/migrations/runner.js', 'verify'], {
    cwd: ROOT_DIR,
    env: { ...commonEnv, DB_NAME: 'rentify_core_test' },
    stdio: 'pipe',
  });

  // Run & verify Commerce API migrations
  execFileSync(nodeBinary, ['ecommerce-server/migrations/runner.js', 'migrate'], {
    cwd: ROOT_DIR,
    env: { ...commonEnv, DB_NAME: 'rentify_commerce_test' },
    stdio: 'pipe',
  });
  execFileSync(nodeBinary, ['ecommerce-server/migrations/runner.js', 'verify'], {
    cwd: ROOT_DIR,
    env: { ...commonEnv, DB_NAME: 'rentify_commerce_test' },
    stdio: 'pipe',
  });
}

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
  // Ensure databases exist and migrations are applied before seeding
  await ensureDatabasesAndMigrations();

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
  try {
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
  } catch (err) {
    // Log and continue to Core teardown
  }

  // 2. Core Teardown
  try {
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
  } catch (err) {
    // Log error
  }
}

module.exports = {
  ensureDatabasesAndMigrations,
  setupTestDatabases,
  teardownTestDatabases,
};
