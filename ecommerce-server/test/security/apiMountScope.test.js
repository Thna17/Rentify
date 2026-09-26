const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const appRoot = path.join(__dirname, '../..');
const app = fs.readFileSync(path.join(appRoot, 'app.js'), 'utf8');

// Routers mounted at the bare /api prefix see every /api request that earlier
// routers did not answer, including public storefront catalog and cart reads.
// The router path is read from app.js, so the check follows the module layout.
const bareApiRouters = [...app.matchAll(/app\.use\(\s*['"]\/api['"]\s*,\s*require\(['"](\.\/[\w/-]+)['"]\)\s*\)/g)].map(
  (match) => ({ name: path.basename(match[1]), file: path.join(appRoot, `${match[1]}.js`) })
);
const routerFile = (name) => {
  const router = bareApiRouters.find((entry) => entry.name === name);
  assert.ok(router, `${name} is not mounted at the bare /api prefix`);
  return router.file;
};

test('app mounts shared routers at the bare /api prefix', () => {
  assert.ok(bareApiRouters.some((entry) => entry.name === 'marketplaceCheckoutRoutes'));
});

for (const { name, file } of bareApiRouters) {
  test(`${name} does not apply authentication to every /api request`, () => {
    const source = fs.readFileSync(file, 'utf8');
    const unscoped = source.match(/router\.use\(\s*(verify\w+|require\w+)\s*[,)]/g) || [];
    assert.deepEqual(unscoped, [], `${name}.js must scope auth middleware to a path, e.g. router.use('/stores/:storeId', ...)`);
  });
}

test('merchant marketplace routes still require a store actor', () => {
  const source = fs.readFileSync(routerFile('marketplaceCheckoutRoutes'), 'utf8');
  // Either '/stores' or '/stores/:storeId' keeps merchant auth on the merchant routes only.
  assert.match(source, /router\.use\('\/stores(?:\/:storeId)?', verifyStoreActor\)/);
});
