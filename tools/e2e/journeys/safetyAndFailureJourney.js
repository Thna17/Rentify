// tools/e2e/journeys/safetyAndFailureJourney.js - Validates rejection of production configurations and generation of failure artifacts (@safety, @artifacts)

const assert = require('node:assert/strict');
const fs = require('node:fs');
const { assertSafeTestEnvironment, assertSafeUrl, UnsafeEnvironmentError } = require('../safety');
const { BrowserSession } = require('../browserShell');

async function runSafetyAndFailureJourney({ artifactCollector }) {
  artifactCollector.recordConsole('Starting Safety & Failure Artifacts Validation (@safety, @artifacts)...');

  // 1. Verify rejection of production NODE_ENV
  assert.throws(
    () => {
      const prevEnv = process.env.NODE_ENV;
      try {
        process.env.NODE_ENV = 'production';
        assertSafeTestEnvironment({});
      } finally {
        process.env.NODE_ENV = prevEnv;
      }
    },
    (err) => err instanceof UnsafeEnvironmentError && err.message.includes('NODE_ENV is set to "production"'),
    'Must refuse execution when NODE_ENV is production'
  );

  // 2. Verify rejection of production and cloud database hosts
  const cloudHosts = [
    'rentify-prod.rds.amazonaws.com',
    'mysql-live.cloudsql.googleapis.com',
    'db.rentifymarket.com',
    'prod-database.internal',
  ];

  for (const host of cloudHosts) {
    assert.throws(
      () => {
        assertSafeTestEnvironment({ host, database: 'rentify_test' });
      },
      (err) => err instanceof UnsafeEnvironmentError,
      `Must refuse cloud host: ${host}`
    );
  }

  // 3. Verify rejection of production database names
  const forbiddenDbs = ['rentify_core', 'rentify_ecommerce', 'production', 'live', 'khmercraft'];
  for (const db of forbiddenDbs) {
    assert.throws(
      () => {
        assertSafeTestEnvironment({ host: '127.0.0.1', database: db });
      },
      (err) => err instanceof UnsafeEnvironmentError,
      `Must refuse production DB name: ${db}`
    );
  }

  // 4. Verify rejection of remote / production URLs
  const unsafeUrls = [
    'https://rentifymarket.com/products',
    'https://api.rentify.com/api/stores',
    'https://mekhla.digital',
    'http://192.168.1.100:3000',
  ];

  for (const u of unsafeUrls) {
    assert.throws(
      () => {
        assertSafeUrl(u);
      },
      (err) => err instanceof UnsafeEnvironmentError,
      `Must refuse unsafe URL: ${u}`
    );
  }

  // 5. Verify failure artifact generation (Screenshot, Trace, Logs)
  const browser = new BrowserSession({ artifactCollector });
  const simulatedErrorName = 'simulated-journey-failure';

  try {
    // Generate simulated failure screenshot
    const screenshotPath = await browser.screenshot({ name: simulatedErrorName });
    assert.ok(fs.existsSync(screenshotPath), `Screenshot file must exist at ${screenshotPath}`);
    const screenshotStat = fs.statSync(screenshotPath);
    assert.ok(screenshotStat.size > 0, `Screenshot file must not be empty (size: ${screenshotStat.size})`);

    // Generate simulated failure trace
    const tracePath = artifactCollector.saveTrace(simulatedErrorName, {
      simulated: true,
      reason: 'Validation of artifact generation mechanism',
    });
    assert.ok(fs.existsSync(tracePath), `Trace file must exist at ${tracePath}`);
    const traceContent = JSON.parse(fs.readFileSync(tracePath, 'utf8'));
    assert.equal(traceContent.testName, simulatedErrorName);
    assert.ok(Array.isArray(traceContent.networkEntries));

    artifactCollector.recordConsole('Verified failure screenshots and traces are successfully generated and persisted.');
  } finally {
    await browser.close();
  }

  return {
    passed: true,
    journey: 'Safety and Failure Artifacts Journey',
    tags: ['@safety', '@artifacts'],
  };
}

module.exports = {
  runSafetyAndFailureJourney,
  tags: ['@safety', '@artifacts'],
};
