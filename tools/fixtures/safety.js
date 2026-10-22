// tools/fixtures/safety.js - Guardrails preventing fixture execution on production environments

class UnsafeEnvironmentError extends Error {
  constructor(message, diagnostic = {}) {
    super(message);
    this.name = 'UnsafeEnvironmentError';
    this.diagnostic = diagnostic;
  }
}

const FORBIDDEN_HOST_PATTERNS = [
  /\bprod\b/i,
  /\blive\b/i,
  /\bamazonaws\.com\b/i,
  /\brds\b/i,
  /\bcloudsql\b/i,
  /\bazure\b/i,
  /\brentifymarket\.com\b/i,
  /\brentify\.com\b/i,
];

const FORBIDDEN_DB_NAMES = new Set([
  'rentify_core',
  'rentify_ecommerce',
  'rentify_production',
  'production',
  'prod',
  'live',
  'khmercraft',
  'khmercraft_production',
]);

/**
 * Validates that database configuration and runtime environment are safe for test fixtures.
 * Throws UnsafeEnvironmentError if production markers or non-test databases are detected.
 *
 * @param {object} [target] - Sequelize instance, model object, or config object
 * @returns {{ safe: true, database: string, host: string }}
 */
function assertSafeTestEnvironment(target = {}) {
  // 1. Check NODE_ENV
  const nodeEnv = process.env.NODE_ENV || 'development';
  if (nodeEnv === 'production') {
    throw new UnsafeEnvironmentError(
      'NODE_ENV is set to "production". Fixture execution is strictly prohibited in production environments.',
      { nodeEnv }
    );
  }

  // 2. Extract database details
  let dbName = null;
  let dbHost = null;
  let dbUser = null;

  if (target && typeof target === 'object') {
    if (target.config) {
      // Sequelize instance
      dbName = target.config.database;
      dbHost = target.config.host;
      dbUser = target.config.username;
    } else if (target.sequelize?.config) {
      // Model object with sequelize attachment
      dbName = target.sequelize.config.database;
      dbHost = target.sequelize.config.host;
      dbUser = target.sequelize.config.username;
    } else {
      // Plain config object
      dbName = target.database || target.DB_NAME;
      dbHost = target.host || target.DB_HOST;
      dbUser = target.user || target.username || target.DB_USER;
    }
  }

  // Fallback to process.env if not specified in target
  dbName = dbName || process.env.DB_NAME;
  dbHost = dbHost || process.env.DB_HOST || 'localhost';
  dbUser = dbUser || process.env.DB_USER || 'root';

  // In-memory SQLite or mock databases are always safe
  if (dbName === ':memory:' || dbName === 'sqlite::memory:' || dbName?.startsWith('mock_')) {
    return { safe: true, database: dbName, host: 'in-memory' };
  }

  // If no DB name is configured, but running in test environment with mocks, allow
  if (!dbName) {
    if (nodeEnv === 'test') {
      return { safe: true, database: 'unspecified_test_db', host: dbHost };
    }
    throw new UnsafeEnvironmentError(
      'Database name could not be resolved from configuration or environment.',
      { dbName, dbHost, nodeEnv }
    );
  }

  // 3. Database name must explicitly contain "test" or "mock"
  const normalizedDb = String(dbName).toLowerCase().trim();
  if (FORBIDDEN_DB_NAMES.has(normalizedDb) && !normalizedDb.includes('test')) {
    throw new UnsafeEnvironmentError(
      `Refusing to run fixtures against production or shared development database: "${dbName}". Database name must contain "test".`,
      { database: dbName, host: dbHost, nodeEnv }
    );
  }

  if (!normalizedDb.includes('test') && !normalizedDb.includes('mock')) {
    throw new UnsafeEnvironmentError(
      `Database "${dbName}" is not recognized as a dedicated test database. Database name must contain "test" (e.g. rentify_core_test).`,
      { database: dbName, host: dbHost, nodeEnv }
    );
  }

  // 4. Validate host safety
  const normalizedHost = String(dbHost).toLowerCase().trim();
  for (const pattern of FORBIDDEN_HOST_PATTERNS) {
    if (pattern.test(normalizedHost)) {
      throw new UnsafeEnvironmentError(
        `Refusing to run fixtures against cloud or production database host: "${dbHost}".`,
        { database: dbName, host: dbHost, nodeEnv }
      );
    }
  }

  // 5. Check credentials markers
  const normalizedUser = String(dbUser).toLowerCase().trim();
  if (normalizedUser.includes('prod') || normalizedUser.includes('live')) {
    throw new UnsafeEnvironmentError(
      `Refusing to run fixtures using production-like database username: "${dbUser}".`,
      { user: dbUser, host: dbHost }
    );
  }

  return { safe: true, database: dbName, host: dbHost };
}

module.exports = {
  assertSafeTestEnvironment,
  UnsafeEnvironmentError,
};
