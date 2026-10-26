#!/usr/bin/env node
'use strict';

// tools/reconciliation/cli.js
// P3-REC-001: Command-line interface for the Continuous Reconciliation Suite.

const fs = require('fs');
const { runReconciliationSuite } = require('./suite');
const { VERDICTS } = require('./constants');

async function main() {
  const args = process.argv.slice(2);

  let storeId = null;
  let jsonOnly = false;
  let humanOnly = false;
  let safeConfirmed = false;
  let outputPath = null;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--store' && args[i + 1]) {
      storeId = args[i + 1];
      i++;
    } else if (arg === '--json') {
      jsonOnly = true;
    } else if (arg === '--human') {
      humanOnly = true;
    } else if (arg === '--safe') {
      safeConfirmed = true;
    } else if (arg === '--output' && args[i + 1]) {
      outputPath = args[i + 1];
      i++;
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Usage: node tools/reconciliation/cli.js [options]

Continuous commerce reconciliation audit across Core and Commerce data domains.

Options:
  --store <storeId>  Run audit scoped to a specific Store ID
  --all              Run audit platform-wide across all stores (default)
  --safe             Explicitly confirm safe read-only execution
  --json             Output machine-readable JSON only
  --human            Output concise human-readable summary only
  --output <file>    Write machine-readable JSON report to specified file
  --help, -h         Show this help message
`);
      process.exit(0);
    }
  }

  // Set safety flag from CLI or env
  const options = {
    safeConnection: safeConfirmed || process.env.RECONCILIATION_SAFE_MODE === 'true',
    confirmReadOnly: safeConfirmed || process.env.CONFIRM_READ_ONLY_AUDIT === 'true',
  };

  try {
    const result = await runReconciliationSuite({
      storeId,
      options,
    });

    if (outputPath) {
      fs.writeFileSync(outputPath, result.json, 'utf8');
    }

    if (jsonOnly) {
      console.log(result.json);
    } else if (humanOnly) {
      console.log(result.humanSummary);
    } else {
      console.log(result.humanSummary);
      console.log('\n[Machine-Readable JSON Snapshot]');
      console.log(result.json);
    }

    if (result.verdict !== VERDICTS.PASS) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error(`\n❌ Reconciliation failed: ${err.message}`);
    if (err.diagnostic) {
      console.error(JSON.stringify(err.diagnostic, null, 2));
    }
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };
