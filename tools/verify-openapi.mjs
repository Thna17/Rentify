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
const redoclyBin = findModule('@redocly/cli/bin/cli.js');

const TARGETS = {
  core: {
    name: 'Core API',
    specPath: resolve(rootDir, 'docs/openapi/core.openapi.yaml'),
    appPath: resolve(rootDir, 'rentify-server/src/app.js'),
    requiredSecuritySchemes: [
      'bearerAuth',
      'userAccessTokenCookie',
      'userRefreshTokenCookie',
      'staffAccessTokenCookie',
      'staffRefreshTokenCookie',
      'internalSecretHeader',
      'serviceTokenHeader',
      'opsTokenHeader',
    ],
    prepareEnvironment: () => {
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
      const redisConfig = require(resolve(rootDir, 'rentify-server/src/config/redis.js'));
      redisConfig.getMerchantRedis = async () => null;
      redisConfig.getCustomerRedis = async () => null;
    },
    filterExpressRoute: (route) => {
      if (route === '/api/auth/session,:param' || route === '/api/auth/session,/me') return true;
      return false;
    },
  },
  commerce: {
    name: 'Commerce API',
    specPath: resolve(rootDir, 'docs/openapi/commerce.openapi.yaml'),
    appPath: resolve(rootDir, 'ecommerce-server/app.js'),
    requiredSecuritySchemes: [
      'bearerAuth',
      'customerAccessTokenCookie',
      'customerRefreshTokenCookie',
      'userAccessTokenCookie',
      'userRefreshTokenCookie',
      'staffAccessTokenCookie',
      'staffRefreshTokenCookie',
      'sessionIdCookie',
      'serviceTokenHeader',
      'opsTokenHeader',
    ],
    prepareEnvironment: () => {
      for (const key of [
        'JWT_SECRET',
        'COOKIE_SECRET',
        'SESSION_SECRET',
        'SERVICE_TO_SERVICE_TOKEN',
      ]) {
        if (!process.env[key]) process.env[key] = 'route-table-placeholder-0123456789abcdef0123456789abcdef';
      }
    },
    filterExpressRoute: (_route) => false,
  },
};

const secretPatterns = [
  /(?:password|secret|key|token)\s*:\s*['"][a-zA-Z0-9_\-]{24,}['"]/i,
  /eyJ[a-zA-Z0-9_\-]{10,}\.eyJ[a-zA-Z0-9_\-]{10,}\.[a-zA-Z0-9_\-]{10,}/,
  /BEGIN (?:RSA |EC )?PRIVATE KEY/,
  /https?:\/\/[^\s:]+:[^\s@]+@[^\s/]+/,
];

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

function normalizePathForComparison(p) {
  return p
    .replace(/\/+/g, '/')
    .replace(/\/$/, '')
    .replace(/:([a-zA-Z0-9_]+)/g, '{$1}')
    .toLowerCase();
}

function verifyTarget(targetKey) {
  const config = TARGETS[targetKey];
  if (!config) {
    console.error(`ERROR: Unknown target '${targetKey}'. Available: core, commerce, all`);
    process.exit(1);
  }

  console.log(`\n--- Verifying ${config.name} OpenAPI Baseline Contract ---`);

  if (!existsSync(config.specPath)) {
    console.error(`ERROR: Contract file not found at ${config.specPath}`);
    process.exit(1);
  }

  // 1. Redocly linting
  console.log(`1. Validating ${config.name} specification with Redocly CLI...`);
  try {
    const lintOutput = execFileSync(
      process.execPath,
      [redoclyBin, 'lint', config.specPath],
      { cwd: rootDir, encoding: 'utf8' }
    );
    process.stdout.write(lintOutput);
  } catch (error) {
    console.error(`Redocly linting failed for ${config.name}:`);
    if (error.stdout) console.error(error.stdout);
    if (error.stderr) console.error(error.stderr);
    process.exit(1);
  }

  // 2. Parse spec and verify components
  console.log(`2. Inspecting ${config.name} specification structures...`);
  const specContent = readFileSync(config.specPath, 'utf8');
  const spec = yaml.parse(specContent);

  if (!spec.openapi || !spec.openapi.startsWith('3.')) {
    console.error(`Invalid openapi version in ${config.name}: ${spec.openapi}`);
    process.exit(1);
  }

  const declaredSchemes = Object.keys(spec.components?.securitySchemes || {});
  for (const scheme of config.requiredSecuritySchemes) {
    if (!declaredSchemes.includes(scheme)) {
      console.error(`Missing security scheme in ${config.name} contract: ${scheme}`);
      process.exit(1);
    }
  }

  // 3. Scan for leaked secrets
  console.log(`3. Scanning ${config.name} specification for secrets...`);
  for (const pattern of secretPatterns) {
    if (pattern.test(specContent)) {
      console.error(`Potential secret detected in ${config.name} contract matching ${pattern}`);
      process.exit(1);
    }
  }

  // 4. Extract mounted Express routes and compare coverage
  console.log(`4. Verifying Express mounted route coverage against ${config.name}...`);
  config.prepareEnvironment();

  const loadedApp = require(config.appPath);
  const app = loadedApp && loadedApp.app ? loadedApp.app : loadedApp;
  const router = app._router || app.router;
  if (!router) {
    console.error(`Could not find Express router in ${config.appPath}`);
    process.exit(1);
  }

  const expressRoutes = new Set();
  (function walk(stack, prefix) {
    for (const layer of stack) {
      if (layer.route) {
        const methods = Object.keys(layer.route.methods).map((m) => m.toUpperCase());
        const routePath = (prefix + layer.route.path) || '/';
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

  const openApiOps = new Map();
  for (const [rawPath, pathItem] of Object.entries(spec.paths || {})) {
    const normPath = normalizePathForComparison(rawPath);
    for (const method of ['get', 'post', 'put', 'patch', 'delete', 'options', 'head']) {
      if (pathItem[method]) {
        openApiOps.set(`${method.toUpperCase()} ${normPath}`, {
          rawPath,
          operationId: pathItem[method].operationId,
        });
      }
    }
  }

  const unmapped = [];
  let matchedCount = 0;

  for (const exprRoute of expressRoutes) {
    const [method, routePath] = exprRoute.split(' ');
    if (method === 'OPTIONS') continue;

    const normalized = normalizePathForComparison(routePath);
    if (config.filterExpressRoute(normalized)) continue;

    const candidates = [
      `${method} ${normalized}`,
      `${method} ${normalized.replace('{param}', '{websiteid}')}`,
      `${method} ${normalized.replace('{param}', '{storeid}')}`,
      `${method} ${normalized.replace('{param}', '{id}')}`,
      `${method} ${normalized.replace('{param}', '{contentid}')}`,
      `${method} ${normalized.replace('{param}', '{category}')}`,
      `${method} ${normalized.replace('{param}', '{paymentid}')}`,
      `${method} ${normalized.replace('{param}', '{resource}')}`,
      `${method} ${normalized.replace('{param}', '{orderid}')}`,
      `${method} ${normalized.replace('{param}', '{productid}')}`,
      `${method} ${normalized.replace('{param}', '{itemid}')}`,
      `${method} ${normalized.replace('{param}', '{invoiceid}')}`,
      `${method} ${normalized.replace('{param}', '{type}')}`,
      `${method} ${normalized.replace('{param}', '{action}')}`,
      `${method} ${normalized.replace('{param}', '{slug}')}`,
      `${method} ${normalized.replace('{websiteid}', '{id}')}`,
      `${method} ${normalized.replace('{id}', '{itemid}')}`,
    ];

    if (candidates.some((c) => openApiOps.has(c))) {
      matchedCount++;
    } else {
      unmapped.push(exprRoute);
    }
  }

  if (unmapped.length > 0) {
    console.error(`FAIL: ${unmapped.length} active Express routes are missing from ${config.name} specification:`);
    for (const r of unmapped) {
      console.error(`  - ${r}`);
    }
    process.exit(1);
  }

  console.log(`✅ All ${matchedCount} active Express routes successfully mapped in ${config.name} contract.`);
  console.log(`✅ ${openApiOps.size} OpenAPI operations documented across ${Object.keys(spec.paths).length} paths.`);
  console.log(`✅ ${config.name} contract verification passed successfully.`);
}

const targetArg = process.argv[2] || 'all';
if (targetArg === 'all') {
  verifyTarget('core');
  verifyTarget('commerce');
} else {
  verifyTarget(targetArg);
}

process.exit(0);
