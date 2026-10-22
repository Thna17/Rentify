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
function findModule(subPath) {
  const candidates = [
    resolve(rootDir, 'ecommerce-server/node_modules', subPath),
    resolve(rootDir, 'rentify-server/node_modules', subPath),
    resolve(rootDir, 'node_modules', subPath),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return candidates[0];
}

const yaml = require(findModule('yaml'));

const args = process.argv.slice(2);

function diffSpecs(baselineSpec, currentSpec, baselineLabel, currentLabel) {
  console.log(`\n--- Comparing OpenAPI Specifications ---`);
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
    return false;
  }

  console.log('✅ No breaking changes detected. OpenAPI contract is backwards compatible.');
  return true;
}

if (args.length === 2 && !args[1].endsWith('.yaml') && !args[1].endsWith('.yml')) {
  // e.g. openapi-diff.mjs develop docs/openapi/core.openapi.yaml
} else if (args.length >= 2 && existsSync(resolve(rootDir, args[0])) && existsSync(resolve(rootDir, args[1]))) {
  const bPath = resolve(rootDir, args[0]);
  const cPath = resolve(rootDir, args[1]);
  const bSpec = yaml.parse(readFileSync(bPath, 'utf8'));
  const cSpec = yaml.parse(readFileSync(cPath, 'utf8'));
  const ok = diffSpecs(bSpec, cSpec, args[0], args[1]);
  process.exit(ok ? 0 : 1);
}

// Compare git ref against one or more spec files
const gitRef = args[0] || 'develop';
const specRelativePaths = args[1]
  ? [args[1].replace(/^[./]+/, '')]
  : ['docs/openapi/core.openapi.yaml', 'docs/openapi/commerce.openapi.yaml'];

let allPassed = true;

for (const relPath of specRelativePaths) {
  const currentPath = resolve(rootDir, relPath);
  const baselineLabel = `${gitRef}:${relPath}`;
  const currentLabel = `working copy (${relPath})`;

  if (!existsSync(currentPath)) {
    console.error(`ERROR: Current spec not found at ${currentPath}`);
    process.exit(1);
  }

  const currentSpec = yaml.parse(readFileSync(currentPath, 'utf8'));
  let baselineSpec = null;

  try {
    const rawBaseline = execFileSync('git', ['show', `${gitRef}:${relPath}`], {
      cwd: rootDir,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    baselineSpec = yaml.parse(rawBaseline);
  } catch (_e) {
    console.log(`ℹ️ Baseline specification not found in git ref "${gitRef}" for ${relPath}. Initial baseline detected.`);
    console.log(`✅ Current specification is valid with ${Object.keys(currentSpec.paths || {}).length} paths.`);
    continue;
  }

  const ok = diffSpecs(baselineSpec, currentSpec, baselineLabel, currentLabel);
  if (!ok) allPassed = false;
}

process.exit(allPassed ? 0 : 1);
