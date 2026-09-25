const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const routesDir = path.join(__dirname, '../../routes');
const app = fs.readFileSync(path.join(__dirname, '../../app.js'), 'utf8');

// Routers mounted at the bare /api prefix see every /api request that earlier
// routers did not answer, including public storefront catalog and cart reads.
const bareApiRouters = [...app.matchAll(/app\.use\(\s*['"]\/api['"]\s*,\s*require\(['"]\.\/routes\/([\w-]+)['"]\)\s*\)/g)].map(
  (match) => match[1]
);

test('app mounts shared routers at the bare /api prefix', () => {
  assert.ok(bareApiRouters.includes('marketplaceCheckoutRoutes'));
});

for (const name of bareApiRouters) {
  test(`${name} does not apply authentication to every /api request`, () => {
    const source = fs.readFileSync(path.join(routesDir, `${name}.js`), 'utf8');
    const unscoped = source.match(/router\.use\(\s*(verify\w+|require\w+)\s*[,)]/g) || [];
    assert.deepEqual(unscoped, [], `${name}.js must scope auth middleware to a path, e.g. router.use('/stores/:storeId', ...)`);
  });
}

test('merchant marketplace routes still require a store actor', () => {
  const source = fs.readFileSync(path.join(routesDir, 'marketplaceCheckoutRoutes.js'), 'utf8');
  // Either '/stores' or '/stores/:storeId' keeps merchant auth on the merchant routes only.
  assert.match(source, /router\.use\('\/stores(?:\/:storeId)?', verifyStoreActor\)/);
});
