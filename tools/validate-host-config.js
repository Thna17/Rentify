#!/usr/bin/env node
// tools/validate-host-config.js
// CLI command to validate Rentify host and deployment configuration deterministically.

const fs = require('fs');
const path = require('path');
const { validateHostConfig } = require('./host-validator');

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    target: null,
    envFile: null,
    fixture: null,
    quiet: false,
    json: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--target' || arg === '-t') {
      options.target = args[++i];
    } else if (arg === '--env-file' || arg === '-f') {
      options.envFile = args[++i];
    } else if (arg === '--fixture') {
      options.fixture = args[++i];
    } else if (arg === '--quiet' || arg === '-q') {
      options.quiet = true;
    } else if (arg === '--json') {
      options.json = true;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  return options;
}

function printHelp() {
  console.log(`
Rentify Host & Deployment Configuration Validator

Usage:
  node tools/validate-host-config.js [options]

Options:
  --target, -t <env>    Target environment: production | staging | development | test
  --env-file, -f <path> Path to .env file to load and validate
  --fixture <name>      Validate built-in fixture: staging | production
  --quiet, -q           Suppress verbose passing report
  --json                Output results as JSON
  --help, -h            Show this help message

Examples:
  node tools/validate-host-config.js --fixture staging
  node tools/validate-host-config.js --fixture production
  node tools/validate-host-config.js --env-file /etc/rentify/.env.production --target production
`);
}

function loadEnvFile(filePath) {
  const resolved = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Environment file not found: ${resolved}`);
  }
  const content = fs.readFileSync(resolved, 'utf8');
  const env = {};
  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eqIdx = line.indexOf('=');
    if (eqIdx !== -1) {
      const key = line.slice(0, eqIdx).trim();
      let val = line.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
  }
  return env;
}

function main() {
  const options = parseArgs();

  // If a fixture is specified
  if (options.fixture) {
    const fixtureName = options.fixture.toLowerCase();
    let fixturePath;
    let target = options.target || fixtureName;
    if (fixtureName === 'staging') {
      fixturePath = path.resolve(__dirname, 'fixtures/config/staging.fixture.js');
    } else if (fixtureName === 'production' || fixtureName === 'prod') {
      fixturePath = path.resolve(__dirname, 'fixtures/config/production-safe.fixture.js');
      target = 'production';
    } else {
      console.error(`Unknown fixture: ${options.fixture}. Available fixtures: staging, production`);
      process.exit(1);
    }

    const config = require(fixturePath);
    try {
      const result = validateHostConfig(config, {
        targetEnv: target,
        throwOnError: false,
      });

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        if (!options.quiet || !result.valid) {
          console.log(result.report);
        }
      }

      process.exit(result.valid ? 0 : 1);
    } catch (err) {
      console.error('Validation execution error:', err.message);
      process.exit(1);
    }
  }

  // If an env file is provided
  if (options.envFile) {
    try {
      const config = loadEnvFile(options.envFile);
      const target = options.target || config.NODE_ENV || 'production';
      const result = validateHostConfig(config, {
        targetEnv: target,
        throwOnError: false,
      });

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        if (!options.quiet || !result.valid) {
          console.log(result.report);
        }
      }

      process.exit(result.valid ? 0 : 1);
    } catch (err) {
      console.error('Validation error:', err.message);
      process.exit(1);
    }
  }

  // If NODE_ENV is production, validate current environment
  if (process.env.NODE_ENV === 'production' || options.target === 'production') {
    const result = validateHostConfig(process.env, {
      targetEnv: 'production',
      throwOnError: false,
    });

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      if (!options.quiet || !result.valid) {
        console.log(result.report);
      }
    }

    process.exit(result.valid ? 0 : 1);
  }

  // Default mode (e.g. running "npm run verify:hosts" in repository CI or developer machine):
  // Deterministically validates both built-in configuration fixtures (staging & production)
  // to ensure release configurations in this repository stay compliant.
  console.log('Validating repository deployment configuration fixtures...');

  const stagingFixturePath = path.resolve(__dirname, 'fixtures/config/staging.fixture.js');
  const prodFixturePath = path.resolve(__dirname, 'fixtures/config/production-safe.fixture.js');

  const stagingConfig = require(stagingFixturePath);
  const prodConfig = require(prodFixturePath);

  const stagingResult = validateHostConfig(stagingConfig, {
    targetEnv: 'staging',
    throwOnError: false,
  });

  const prodResult = validateHostConfig(prodConfig, {
    targetEnv: 'production',
    throwOnError: false,
  });

  let allPassed = true;

  if (!stagingResult.valid) {
    allPassed = false;
    console.error('Staging configuration fixture validation FAILED:');
    console.error(stagingResult.report);
  } else if (!options.quiet) {
    console.log('[PASS] Staging configuration fixture conforms to all policies.');
  }

  if (!prodResult.valid) {
    allPassed = false;
    console.error('Production configuration fixture validation FAILED:');
    console.error(prodResult.report);
  } else if (!options.quiet) {
    console.log('[PASS] Production-safe configuration fixture conforms to all Release 1 policies.');
  }

  if (allPassed) {
    console.log('Deterministic host configuration verification PASSED (2/2 fixtures verified).');
    process.exit(0);
  } else {
    console.error('Host configuration verification FAILED.');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main, loadEnvFile };
