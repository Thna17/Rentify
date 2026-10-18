#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');
const require = createRequire(import.meta.url);
const yaml = require(resolve(rootDir, 'rentify-server/node_modules/yaml'));

const args = process.argv.slice(2);
let baselineSpec = null;
let currentSpec = null;
let baselineLabel = '';
let currentLabel = '';

const currentDefaultPath = resolve(rootDir, 'docs/openapi/core.openapi.yaml');

if (args.length >= 2) {
  baselineLabel = args[0];
  currentLabel = args[1];
  const bPath = resolve(rootDir, args[0]);
  const cPath = resolve(rootDir, args[1]);

  if (!existsSync(bPath)) {
    console.error(`ERROR: Baseline spec file not found: ${bPath}`);
    process.exit(1);
  }
  if (!existsSync(cPath)) {
    console.error(`ERROR: Current spec file not found: ${cPath}`);
    process.exit(1);
  }

  baselineSpec = yaml.parse(readFileSync(bPath, 'utf8'));
  currentSpec = yaml.parse(readFileSync(cPath, 'utf8'));
} else {
  const gitRef = args[0] || 'develop';
  baselineLabel = `${gitRef}:docs/openapi/core.openapi.yaml`;
  currentLabel = 'working copy (docs/openapi/core.openapi.yaml)';

  try {
    const rawBaseline = execFileSync('git', ['show', `${gitRef}:docs/openapi/core.openapi.yaml`], {
      cwd: rootDir,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    baselineSpec = yaml.parse(rawBaseline);
  } catch (_e) {
    console.log(`ℹ️ Baseline specification not found in git ref "${gitRef}". Initial baseline detected.`);
    if (existsSync(currentDefaultPath)) {
      currentSpec = yaml.parse(readFileSync(currentDefaultPath, 'utf8'));
      console.log(`✅ Current specification is valid with ${Object.keys(currentSpec.paths || {}).length} paths.`);
      process.exit(0);
    } else {
      console.error(`ERROR: Current spec not found at ${currentDefaultPath}`);
      process.exit(1);
    }
  }

  if (existsSync(currentDefaultPath)) {
    currentSpec = yaml.parse(readFileSync(currentDefaultPath, 'utf8'));
  } else {
    console.error(`ERROR: Current spec not found at ${currentDefaultPath}`);
    process.exit(1);
  }
}

console.log(`--- Comparing OpenAPI Specifications ---`);
console.log(`Baseline : ${baselineLabel}`);
console.log(`Current  : ${currentLabel}\n`);

const breakingChanges = [];
const nonBreakingChanges = [];

const oldPaths = Object.keys(baselineSpec.paths || {});
const newPaths = Object.keys(currentSpec.paths || {});
const httpMethods = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'];

for (const path of oldPaths) {
  if (!currentSpec.paths[path]) {
    breakingChanges.push(`Removed endpoint path: ${path}`);
    continue;
  }
  const oldItem = baselineSpec.paths[path];
  const newItem = currentSpec.paths[path];

  for (const method of httpMethods) {
    if (oldItem[method] && !newItem[method]) {
      breakingChanges.push(`Removed HTTP method: ${method.toUpperCase()} ${path}`);
      continue;
    }
    if (!oldItem[method] && newItem[method]) {
      nonBreakingChanges.push(`Added HTTP method: ${method.toUpperCase()} ${path}`);
      continue;
    }
    if (oldItem[method] && newItem[method]) {
      const oldOp = oldItem[method];
      const newOp = newItem[method];

      // Check responses: removed status codes
      const oldResponses = Object.keys(oldOp.responses || {});
      const newResponses = Object.keys(newOp.responses || {});
      for (const status of oldResponses) {
        if (!newResponses.includes(status)) {
          breakingChanges.push(`Removed response ${status} from ${method.toUpperCase()} ${path}`);
        }
      }

      // Check parameters: newly required parameters
      const oldParams = oldOp.parameters || [];
      const newParams = newOp.parameters || [];
      for (const np of newParams) {
        if (np.required) {
          const matched = oldParams.find((op) => op.name === np.name && op.in === np.in);
          if (!matched || !matched.required) {
            breakingChanges.push(`Added required parameter '${np.name}' in '${np.in}' to ${method.toUpperCase()} ${path}`);
          }
        }
      }

      // Check requestBody: changed from optional to required
      if (newOp.requestBody?.required && !oldOp.requestBody?.required) {
        breakingChanges.push(`Request body became required on ${method.toUpperCase()} ${path}`);
      }
    }
  }
}

for (const path of newPaths) {
  if (!baselineSpec.paths[path]) {
    nonBreakingChanges.push(`Added endpoint path: ${path}`);
  }
}

if (nonBreakingChanges.length > 0) {
  console.log(`Non-breaking additions (${nonBreakingChanges.length}):`);
  for (const item of nonBreakingChanges) {
    console.log(`  + ${item}`);
  }
  console.log('');
}

if (breakingChanges.length > 0) {
  console.error(`🚨 BREAKING CHANGES DETECTED (${breakingChanges.length}):`);
  for (const item of breakingChanges) {
    console.error(`  - ${item}`);
  }
  console.error('\nOpenAPI contract compatibility check failed.');
  process.exit(1);
}

console.log('✅ No breaking changes detected. OpenAPI contract is backwards compatible.');
process.exit(0);
