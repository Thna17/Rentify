// modules/health/readinessService.js - Bounded readiness and dependency health checks for Commerce API
const fs = require('node:fs');
const path = require('node:path');
const { sequelize: defaultDb } = require('../../config/db');
const defaultRedis = require('../../config/redis');
const { logger } = require('../../utils/logger');

const defaultMigrationsDir = path.resolve(__dirname, '../../migrations');

let testOverrides = null;

function setTestOverrides(overrides) {
  testOverrides = overrides;
}

function clearTestOverrides() {
  testOverrides = null;
}

/**
 * Bounds a promise with a maximum timeout.
 */
function withTimeout(promise, timeoutMs, timeoutMessage = 'Check timed out') {
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const err = new Error(timeoutMessage);
      err.code = 'TIMEOUT';
      reject(err);
    }, timeoutMs);
    if (typeof timer.unref === 'function') timer.unref();
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

/**
 * Checks database connectivity with a lightweight ping query.
 */
async function checkDatabase(db = defaultDb, timeoutMs = 2000) {
  const start = process.hrtime.bigint();
  try {
    await withTimeout(
      db.query('SELECT 1 AS ready;', { type: db.QueryTypes.SELECT }),
      timeoutMs,
      'Database query timed out'
    );
    const end = process.hrtime.bigint();
    const latencyMs = Number(end - start) / 1_000_000;
    return {
      status: 'up',
      required: true,
      latencyMs: Math.round(latencyMs * 100) / 100,
    };
  } catch (err) {
    return {
      status: 'down',
      required: true,
      message: err.code === 'TIMEOUT' ? 'Database check timed out' : 'Database connection failed',
    };
  }
}

/**
 * Checks that SequelizeMeta exists and all migration files have been applied.
 */
async function checkMigrations(db = defaultDb, migrationsDir = defaultMigrationsDir, timeoutMs = 2000) {
  try {
    return await withTimeout(
      (async () => {
        const queryInterface = db.getQueryInterface();
        const tables = await queryInterface.showAllTables();
        const hasMeta = tables.some((t) => String(t).toLowerCase() === 'sequelizemeta');

        if (!hasMeta) {
          return {
            status: 'down',
            required: true,
            message: 'SequelizeMeta table missing',
          };
        }

        const [rows] = await db.query('SELECT name FROM SequelizeMeta ORDER BY name;');
        const appliedSet = new Set(rows.map((r) => r.name));

        const diskFiles = fs
          .readdirSync(migrationsDir)
          .filter((file) => /^\d+_.+\.js$/.test(file))
          .sort();

        const pending = diskFiles.filter((f) => !appliedSet.has(f));

        if (pending.length > 0) {
          return {
            status: 'down',
            required: true,
            pendingCount: pending.length,
            message: 'Pending migrations not applied',
          };
        }

        return {
          status: 'up',
          required: true,
          pendingCount: 0,
        };
      })(),
      timeoutMs,
      'Migration check timed out'
    );
  } catch (err) {
    return {
      status: 'down',
      required: true,
      message: err.code === 'TIMEOUT' ? 'Migration check timed out' : 'Migration status check failed',
    };
  }
}

/**
 * Checks Redis connectivity only when required, or reports graceful degradation.
 */
async function checkRedis(redisModule = defaultRedis, timeoutMs = 1500) {
  const isRequired = process.env.REDIS_REQUIRED === 'true';

  try {
    const client = redisModule?.redisClient;
    if (!client || (client.status !== 'ready' && client.status !== 'connect')) {
      if (isRequired) {
        return {
          status: 'down',
          required: true,
          message: 'Redis connection required but not connected',
        };
      }
      return {
        status: 'degraded',
        required: false,
        message: 'Redis unavailable (pubsub fallback active)',
      };
    }

    const pong = await withTimeout(client.ping(), timeoutMs, 'Redis ping timed out');
    if (pong === 'PONG') {
      return {
        status: 'up',
        required: isRequired,
      };
    }
    throw new Error('Invalid ping response');
  } catch (err) {
    if (isRequired) {
      return {
        status: 'down',
        required: true,
        message: err.code === 'TIMEOUT' ? 'Redis check timed out' : 'Redis connection failed',
      };
    }
    return {
      status: 'degraded',
      required: false,
      message: 'Redis unavailable (pubsub fallback active)',
    };
  }
}

/**
 * Checks background worker or task loop readiness.
 */
function checkWorkers(customStatus) {
  if (customStatus) return customStatus;
  return {
    status: 'up',
    required: false,
  };
}

/**
 * Aggregates all readiness checks and determines safe traffic handling status code.
 */
async function getReadinessReport(options = {}) {
  const mergedOptions = { ...(testOverrides || {}), ...options };
  const {
    db = defaultDb,
    migrationsDir = defaultMigrationsDir,
    redis = defaultRedis,
    timeoutMs = Number(process.env.READINESS_TIMEOUT_MS) || 2000,
    serviceName = 'ecommerce-server',
    version = '1.0.0',
    workerStatus,
  } = mergedOptions;

  const [dbResult, migResult, redisResult, workerResult] = await Promise.all([
    checkDatabase(db, timeoutMs),
    checkMigrations(db, migrationsDir, timeoutMs),
    checkRedis(redis, timeoutMs),
    Promise.resolve(checkWorkers(workerStatus)),
  ]);

  const checks = {
    database: dbResult,
    migrations: migResult,
    redis: redisResult,
    workers: workerResult,
  };

  const requiredFailed = Object.entries(checks).some(
    ([_, check]) => check.required && check.status !== 'up'
  );
  const optionalDegraded = Object.entries(checks).some(
    ([_, check]) => !check.required && check.status !== 'up'
  );

  let status;
  let statusCode;

  if (requiredFailed) {
    status = 'not_ready';
    statusCode = 503;
  } else if (optionalDegraded) {
    status = 'degraded';
    statusCode = 200;
  } else {
    status = 'ready';
    statusCode = 200;
  }

  const payload = {
    status,
    service: serviceName,
    version,
    checks,
    timestamp: new Date().toISOString(),
  };

  if (status === 'not_ready') {
    const failed = Object.entries(checks)
      .filter(([_, c]) => c.required && c.status !== 'up')
      .map(([k]) => k);
    logger.warn('Readiness probe failed', {
      status,
      failedChecks: failed,
    });
  } else if (status === 'degraded') {
    logger.info('Readiness probe degraded (serving traffic)', {
      status,
    });
  }

  return { statusCode, payload };
}

module.exports = {
  withTimeout,
  checkDatabase,
  checkMigrations,
  checkRedis,
  checkWorkers,
  getReadinessReport,
  setTestOverrides,
  clearTestOverrides,
};
