#!/usr/bin/env node
// tools/e2e/runner.js - CLI runner orchestrating contract & browser test journeys

const process = require('node:process');
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
require('./resolve');
const { E2EServerManager } = require('./serverManager');
const { ArtifactCollector } = require('./artifactCollector');
const { OpenAPIContractValidator } = require('./contractValidator');

const { runBuyerJourney, tags: buyerTags } = require('./journeys/buyerJourney');
const { runMerchantJourney, tags: merchantTags } = require('./journeys/merchantJourney');
const { runSafetyAndFailureJourney, tags: safetyTags } = require('./journeys/safetyAndFailureJourney');
const { runHostedSubdomainRehearsalJourney, tags: hostTags } = require('./journeys/hostedSubdomainRehearsalJourney');

const ALL_JOURNEYS = [
  { name: 'Public Buyer Journey', fn: runBuyerJourney, tags: buyerTags },
  { name: 'Authenticated Merchant Read Journey', fn: runMerchantJourney, tags: merchantTags },
  { name: 'Safety & Failure Artifacts Validation', fn: runSafetyAndFailureJourney, tags: safetyTags },
  { name: 'Hosted-Subdomain Session Isolation Rehearsal', fn: (ctx) => runHostedSubdomainRehearsalJourney({ ...ctx, config: {} }), tags: hostTags },
];

function printHelp() {
  console.log(`
Rentify Platform E2E & Contract Test Harness
============================================

Usage:
  node tools/e2e/runner.js [options]

Options:
  --tag <tag>      Filter journeys by tag (e.g. @buyer, @merchant, @golden, @contract, @safety)
  --ci             Run in CI mode with strict reporting
  --staging        Run the real-host staging rehearsal (excluded from local runs by default)
  --help           Show this help message

Examples:
  node tools/e2e/runner.js
  node tools/e2e/runner.js --tag @buyer
  node tools/e2e/runner.js --tag @golden
  node tools/e2e/runner.js --ci
  node tools/e2e/runner.js --staging
`);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  // Parse tag filter
  let filterTag = null;
  const tagIdx = args.indexOf('--tag');
  if (tagIdx !== -1 && args[tagIdx + 1]) {
    filterTag = args[tagIdx + 1].trim();
  }

  const isCI = args.includes('--ci');

  console.log('=================================================================');
  console.log('🚀 Rentify E2E & Contract Test Shell');
  console.log('=================================================================');
  if (filterTag) console.log(`🏷️  Filter tag: ${filterTag}`);

  const artifactCollector = new ArtifactCollector();
  console.log(`📁 Artifacts location: ${artifactCollector.baseDir}`);

  let contractValidator;
  try {
    contractValidator = new OpenAPIContractValidator();
    console.log('📜 OpenAPI contracts loaded successfully (Core & Commerce).');
  } catch (err) {
    console.error(`❌ Failed to load OpenAPI contracts: ${err.message}`);
    process.exit(1);
  }

  const serverManager = new E2EServerManager({ artifactCollector });
  const results = [];
  let overallPassed = true;

  try {
    // 1. Filter journeys
    const selectedJourneys = filterTag
      ? ALL_JOURNEYS.filter((j) => j.tags.includes(filterTag))
      : args.includes('--staging')
        ? ALL_JOURNEYS.filter((j) => j.tags.includes('@staging'))
        : ALL_JOURNEYS.filter((j) => !j.tags.includes('@staging') && !j.tags.includes('@rehearsal'));

    if (selectedJourneys.length === 0) {
      console.warn(`⚠️  No journeys matched tag: "${filterTag}". Available tags: @buyer, @merchant, @golden, @contract, @safety, @artifacts, @rehearsal`);
      process.exit(0);
    }

    // 2. Start local test servers and fixtures only if running local journeys
    const requiresLocalServers = selectedJourneys.some((j) => !j.tags.includes('@rehearsal') && !j.tags.includes('@staging'));
    if (requiresLocalServers) {
      await serverManager.start();
    }

    console.log(`\nExecuting ${selectedJourneys.length} test journeys...\n`);

    // 3. Execute test journeys
    for (const journey of selectedJourneys) {
      const startTime = Date.now();
      process.stdout.write(`⏳ Running: ${journey.name} [${journey.tags.join(' ')}] ... `);

      try {
        await journey.fn({
          serverManager,
          contractValidator,
          artifactCollector,
        });
        const duration = Date.now() - startTime;
        console.log(`✅ PASS (${duration}ms)`);
        results.push({
          name: journey.name,
          tags: journey.tags,
          status: 'PASS',
          durationMs: duration,
        });
      } catch (err) {
        const duration = Date.now() - startTime;
        console.log(`❌ FAIL (${duration}ms)`);
        if (err.code === 'REAL_STAGING_HOST_UNAVAILABLE') {
          console.error(`\n=================================================================`);
          console.error(`P2-HOST-002 BLOCKED — REAL STAGING HOST UNAVAILABLE`);
          console.error(`=================================================================`);
          console.error(`Exact missing infrastructure:`);
          for (const item of err.missingInfrastructure || []) {
            console.error(`  - ${item}`);
          }
          console.error(`=================================================================\n`);
        } else {
          console.error(`   Error: ${err.message}`);
        }
        overallPassed = false;
        results.push({
          name: journey.name,
          tags: journey.tags,
          status: 'BLOCKED',
          durationMs: duration,
          error: err.message,
          missingInfrastructure: err.missingInfrastructure,
        });
      }
    }
  } catch (err) {
    console.error(`\n❌ Fatal harness error during startup: ${err.message}`);
    overallPassed = false;
  } finally {
    // 4. Deterministic cleanup
    await serverManager.stop();
  }

  // 5. Write summary
  const summaryPath = artifactCollector.writeSummary({
    success: overallPassed,
    filterTag,
    isCI,
    results,
  });

  console.log('\n=================================================================');
  console.log('📊 Execution Summary:');
  console.log('=================================================================');
  for (const r of results) {
    const icon = r.status === 'PASS' ? '✅' : '❌';
    console.log(`${icon} [${r.status}] ${r.name} (${r.durationMs}ms)`);
  }
  console.log('-----------------------------------------------------------------');
  console.log(`Summary report: ${summaryPath}`);
  console.log(`Latest artifacts: ${artifactCollector.latestDir}`);
  console.log('=================================================================\n');

  if (!overallPassed) {
    console.error('❌ E2E test harness execution failed.');
    process.exit(1);
  }

  console.log('🎉 All E2E test journeys completed successfully!');
  process.exit(0);
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Unhandled runner error:', err);
    process.exit(1);
  });
}

module.exports = { main, ALL_JOURNEYS };
