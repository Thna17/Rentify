const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('yaml');

const rootDir = path.resolve(__dirname, '../../..');
const specPath = path.resolve(rootDir, 'docs/openapi/commerce.openapi.yaml');

test('Commerce OpenAPI specification file exists and is valid YAML', () => {
  assert.ok(fs.existsSync(specPath), `OpenAPI contract file missing at ${specPath}`);
  const raw = fs.readFileSync(specPath, 'utf8');
  const spec = yaml.parse(raw);
  assert.equal(typeof spec, 'object');
  assert.ok(spec.openapi && spec.openapi.startsWith('3.'), `Expected OpenAPI 3.x, found ${spec.openapi}`);
  assert.equal(spec.info?.title, 'Rentify Commerce API');
  assert.equal(spec.info?.version, '1.0.0');
});

test('Commerce OpenAPI specification declares all required security schemes', () => {
  const spec = yaml.parse(fs.readFileSync(specPath, 'utf8'));
  const schemes = spec.components?.securitySchemes || {};
  const required = [
    'bearerAuth',
    'customerAccessTokenCookie',
    'customerRefreshTokenCookie',
    'userAccessTokenCookie',
    'userRefreshTokenCookie',
    'staffAccessTokenCookie',
    'staffRefreshTokenCookie',
    'serviceTokenHeader',
    'opsTokenHeader',
  ];

  for (const scheme of required) {
    assert.ok(schemes[scheme], `Missing required security scheme: ${scheme}`);
  }
});

test('Commerce OpenAPI specification contains no secrets or credentials', () => {
  const content = fs.readFileSync(specPath, 'utf8');
  const secretPatterns = [
    /(?:password|secret|key|token)\s*:\s*['"][a-zA-Z0-9_\-]{24,}['"]/i,
    /eyJ[a-zA-Z0-9_\-]{10,}\.eyJ[a-zA-Z0-9_\-]{10,}\.[a-zA-Z0-9_\-]{10,}/,
    /BEGIN (?:RSA |EC )?PRIVATE KEY/,
    /https?:\/\/[^\s:]+:[^\s@]+@[^\s/]+/,
  ];

  for (const pattern of secretPatterns) {
    assert.ok(!pattern.test(content), `Found forbidden secret pattern ${pattern} in OpenAPI spec`);
  }
});

test('Commerce OpenAPI specification covers all active mounted Express routes', () => {
  for (const key of [
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'SESSION_SECRET',
    'COOKIE_SECRET',
    'SERVICE_TO_SERVICE_TOKEN',
    'PAYMENT_CONFIG_ENCRYPTION_KEY',
  ]) {
    if (!process.env[key]) process.env[key] = 'test-placeholder-key-0123456789abcdef0123456789abcdef';
  }

  const { Sequelize } = require('sequelize');
  const origAuth = Sequelize.prototype.authenticate;
  Sequelize.prototype.authenticate = async () => {};

  const app = require('../../app');
  const router = app._router || app.router;
  assert.ok(router, 'Express router could not be retrieved from app.js');

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
        for (const m of methods) {
          expressRoutes.add(`${m} ${routePath}`);
        }
      } else if (layer.handle && layer.handle.stack) {
        walk(layer.handle.stack, prefix + prefixOf(layer));
      }
    }
  })(router.stack, '');

  const spec = yaml.parse(fs.readFileSync(specPath, 'utf8'));
  function normalizePath(p) {
    return p
      .replace(/\/+/g, '/')
      .replace(/\/$/, '')
      .replace(/:([a-zA-Z0-9_]+)/g, '{$1}')
      .toLowerCase();
  }

  const openApiOps = new Set();
  for (const [rawPath, pathItem] of Object.entries(spec.paths || {})) {
    const normPath = normalizePath(rawPath);
    for (const method of ['get', 'post', 'put', 'patch', 'delete', 'options', 'head']) {
      if (pathItem[method]) {
        openApiOps.add(`${method.toUpperCase()} ${normPath}`);
      }
    }
  }

  const missing = [];
  for (const exprRoute of expressRoutes) {
    const [method, routePath] = exprRoute.split(' ');
    if (method === 'OPTIONS') continue;

    const normalizedRoute = normalizePath(routePath);

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
      `${method} ${normalizedRoute.replace('{param}', '{productid}')}`,
      `${method} ${normalizedRoute.replace('{param}', '{itemid}')}`,
      `${method} ${normalizedRoute.replace('{param}', '{invoiceid}')}`,
      `${method} ${normalizedRoute.replace('{param}', '{type}')}`,
      `${method} ${normalizedRoute.replace('{param}', '{action}')}`,
      `${method} ${normalizedRoute.replace('{param}', '{slug}')}`,
      `${method} ${normalizedRoute.replace('{websiteid}', '{id}')}`,
      `${method} ${normalizedRoute.replace('{id}', '{itemid}')}`,
    ];

    if (!candidates.some((c) => openApiOps.has(c))) {
      missing.push(exprRoute);
    }
  }

  assert.equal(missing.length, 0, `Unmapped Express routes in Commerce API: ${missing.join(', ')}`);
});
