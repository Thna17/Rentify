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

const specPath = resolve(rootDir, 'docs/openapi/core.openapi.yaml');
const appPath = resolve(rootDir, 'rentify-server/src/app.js');
const redoclyBin = resolve(rootDir, 'rentify-server/node_modules/.bin/redocly');

console.log('--- Verifying Core OpenAPI Baseline Contract ---');

if (!existsSync(specPath)) {
  console.error(`ERROR: Contract file not found at ${specPath}`);
  process.exit(1);
}

// 1. Redocly linting
console.log('1. Validating OpenAPI 3.0.3 specification with Redocly CLI...');
try {
  const lintOutput = execFileSync(
    process.execPath,
    [redoclyBin, 'lint', specPath],
    { cwd: rootDir, encoding: 'utf8' }
  );
  process.stdout.write(lintOutput);
} catch (error) {
  console.error('Redocly linting failed:');
  if (error.stdout) console.error(error.stdout);
  if (error.stderr) console.error(error.stderr);
  process.exit(1);
}

// 2. Parse spec and verify components
console.log('2. Inspecting OpenAPI specification structures...');
const yaml = require(resolve(rootDir, 'rentify-server/node_modules/yaml'));
const specContent = readFileSync(specPath, 'utf8');
const spec = yaml.parse(specContent);

if (!spec.openapi || !spec.openapi.startsWith('3.')) {
  console.error(`Invalid openapi version: ${spec.openapi}`);
  process.exit(1);
}

const requiredSecuritySchemes = [
  'bearerAuth',
  'userAccessTokenCookie',
  'userRefreshTokenCookie',
  'staffAccessTokenCookie',
  'staffRefreshTokenCookie',
  'internalSecretHeader',
  'serviceTokenHeader',
  'opsTokenHeader',
];

const declaredSchemes = Object.keys(spec.components?.securitySchemes || {});
for (const scheme of requiredSecuritySchemes) {
  if (!declaredSchemes.includes(scheme)) {
    console.error(`Missing security scheme in OpenAPI contract: ${scheme}`);
    process.exit(1);
  }
}

// 3. Scan for leaked secrets
console.log('3. Scanning OpenAPI specification for secrets...');
const secretPatterns = [
  /(?:password|secret|key|token)\s*:\s*['"][a-zA-Z0-9_\-]{24,}['"]/i,
  /eyJ[a-zA-Z0-9_\-]{10,}\.eyJ[a-zA-Z0-9_\-]{10,}\.[a-zA-Z0-9_\-]{10,}/,
  /BEGIN (?:RSA |EC )?PRIVATE KEY/,
  /https?:\/\/[^\s:]+:[^\s@]+@[^\s/]+/,
];

for (const pattern of secretPatterns) {
  if (pattern.test(specContent)) {
    console.error(`Potential secret detected in OpenAPI contract matching ${pattern}`);
    process.exit(1);
  }
}

// 4. Extract mounted Express routes and compare coverage
console.log('4. Verifying Express mounted route coverage against OpenAPI...');
for (const key of [
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'SESSION_SECRET',
  'COOKIE_SECRET',
  'SERVICE_TO_SERVICE_TOKEN',
  'INTERNAL_SERVICE_SECRET',
  'PAYMENT_CONFIG_ENCRYPTION_KEY',
]) {
  if (!process.env[key]) process.env[key] = 'route-table-placeholder-0123456789abcdef0123456789abcdef';
}

// Prevent Redis connection attempts during route inspection
const redisConfigPath = resolve(rootDir, 'rentify-server/src/config/redis.js');
const redisModule = require(redisConfigPath);
redisModule.getMerchantRedis = async () => null;
redisModule.getCustomerRedis = async () => null;

const loadedApp = require(appPath);
const app = loadedApp && loadedApp.app ? loadedApp.app : loadedApp;
const router = app._router || app.router;
if (!router) {
  console.error('Could not find Express router in rentify-server/src/app.js');
  process.exit(1);
}

function prefixOf(layer) {
  if (layer.path) return layer.path;
  const re = layer.regexp;
  if (!re || re.fast_slash) return '';
  const src = re.source
    .replace(/^\^/, '')
    .replace(/\\\/\?\(\?=\\\/\|\$\)$/i, '')
    .replace(/\(\?:\\\/\(\?=\$\)\)\?\$$/, '')
    .replace(/\\\//g, '/');
  return src.replace(/\(\?:\(\[\^\/\]\+\?\)\)/g, ':param');
}

const expressRoutes = new Set();
(function walk(stack, prefix) {
  for (const layer of stack) {
    if (layer.route) {
      const methods = Object.keys(layer.route.methods).map((m) => m.toUpperCase());
      const routePath = (prefix + layer.route.path) || '/';
      // Normalize multi-paths like ['/session', '/me']
      if (layer.route.path && String(layer.route.path).includes(',')) {
        for (const part of String(layer.route.path).split(',')) {
          const normPart = part.startsWith('/') ? part : `/${part}`;
          for (const m of methods) expressRoutes.add(`${m} ${prefix}${normPart}`);
        }
      } else {
        for (const m of methods) expressRoutes.add(`${m} ${routePath}`);
      }
    } else if (layer.handle && layer.handle.stack) {
      walk(layer.handle.stack, prefix + prefixOf(layer));
    }
  }
})(router.stack, '');

// Build map of OpenAPI operations: METHOD /path
// Express uses :param, OpenAPI uses {param}
function normalizePathForComparison(p) {
  return p
    .replace(/\/+/g, '/')
    .replace(/\/$/, '')
    .replace(/:([a-zA-Z0-9_]+)/g, '{$1}')
    .toLowerCase();
}

const openApiOps = new Map();
for (const [rawPath, pathItem] of Object.entries(spec.paths || {})) {
  const normPath = normalizePathForComparison(rawPath);
  for (const method of ['get', 'post', 'put', 'patch', 'delete', 'options', 'head']) {
    if (pathItem[method]) {
      openApiOps.set(`${method.toUpperCase()} ${normPath}`, {
        rawPath,
        operationId: pathItem[method].operationId,
        tags: pathItem[method].tags,
      });
    }
  }
}

// Check every mounted Express route against OpenAPI operations
const unmappedExpressRoutes = [];
let matchedCount = 0;

for (const exprRoute of expressRoutes) {
  const [method, routePath] = exprRoute.split(' ');
  if (method === 'OPTIONS') continue; // CORS preflight handler

  // Normalize Express route
  let normalizedRoute = normalizePathForComparison(routePath);

  // Specific Express mount alias handling
  if (normalizedRoute === '/api/auth/session,:param' || normalizedRoute === '/api/auth/session,/me') {
    // Already handled via separated paths
    continue;
  }

  // Parameter name synonyms
  const candidates = [
    `${method} ${normalizedRoute}`,
    `${method} ${normalizedRoute.replace('{param}', '{websiteid}')}`,
    `${method} ${normalizedRoute.replace('{param}', '{storeid}')}`,
    `${method} ${normalizedRoute.replace('{param}', '{id}')}`,
    `${method} ${normalizedRoute.replace('{param}', '{contentid}')}`,
    `${method} ${normalizedRoute.replace('{param}', '{category}')}`,
    `${method} ${normalizedRoute.replace('{param}', '{paymentid}')}`,
    `${method} ${normalizedRoute.replace('{param}', '{resource}')}`,
    `${method} ${normalizedRoute.replace('{param}', '{orderid}')}`,
  ];

  const matched = candidates.some((c) => openApiOps.has(c));
  if (matched) {
    matchedCount++;
  } else {
    unmappedExpressRoutes.push(exprRoute);
  }
}

if (unmappedExpressRoutes.length > 0) {
  console.error(`FAIL: ${unmappedExpressRoutes.length} active Express routes are missing from OpenAPI specification:`);
  for (const r of unmappedExpressRoutes) {
    console.error(`  - ${r}`);
  }
  process.exit(1);
}

console.log(`✅ All ${matchedCount} active Express routes successfully mapped in Core OpenAPI contract.`);
console.log(`✅ ${openApiOps.size} OpenAPI operations documented across ${Object.keys(spec.paths).length} paths.`);
console.log('✅ Core OpenAPI contract verification passed successfully.');
process.exit(0);
