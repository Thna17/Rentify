#!/usr/bin/env node
// Prints every route an Express app mounts ("METHOD /path"), sorted, one per line.
// Used to prove that a file-move refactor leaves the HTTP surface unchanged:
//   node tools/route-table.js ecommerce-server/app.js > before.txt
//   ...refactor...
//   node tools/route-table.js ecommerce-server/app.js | diff before.txt -
// The app is only loaded, never started, so no port is opened. Dummy secrets are
// set when missing so config modules that require them can load.
const path = require('path');

for (const key of ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'SESSION_SECRET', 'COOKIE_SECRET',
  'INTERNAL_SERVICE_TOKEN', 'PAYMENT_CONFIG_ENCRYPTION_KEY']) {
  if (!process.env[key]) process.env[key] = 'route-table-placeholder-0123456789abcdef0123456789abcdef';
}

const target = path.resolve(process.argv[2] || 'app.js');
process.chdir(path.dirname(target));
const loaded = require(target);
const app = loaded && loaded.app ? loaded.app : loaded;
const router = app._router || app.router;
if (!router) {
  console.error('Could not find the Express router on', target);
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

const out = new Set();
(function walk(stack, prefix) {
  for (const layer of stack) {
    if (layer.route) {
      const methods = Object.keys(layer.route.methods).map((m) => m.toUpperCase());
      for (const m of methods) out.add(`${m} ${(prefix + layer.route.path) || '/'}`);
    } else if (layer.handle && layer.handle.stack) {
      walk(layer.handle.stack, prefix + prefixOf(layer));
    }
  }
})(router.stack, '');

console.log([...out].sort().join('\n'));
process.exit(0);
