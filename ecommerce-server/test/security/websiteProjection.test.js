const test = require("node:test");
const assert = require("node:assert/strict");

const { WebsiteData, WebsiteContent, Product } = require("../../models");
const { websiteData } = require("../../modules/websites/websiteController");
const ProductService = require("../../modules/catalog/ProductService");

const response = () => ({
  statusCode: null,
  body: null,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});

test("website projection links the Store's unassigned products to the website", async (t) => {
  const updates = [];
  t.mock.method(WebsiteData, "upsert", async (data) => [{ id: data.websiteId }]);
  t.mock.method(WebsiteContent, "findOrCreate", async () => [{}, true]);
  t.mock.method(Product, "update", async (values, options) => {
    updates.push({ values, where: options.where });
    return [2];
  });

  const res = response();
  await websiteData({ body: { websiteId: "site-1", storeId: "store-1", userId: "user-1" } }, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(updates, [{ values: { websiteId: "site-1" }, where: { storeId: "store-1", websiteId: null } }]);
});

test("website projection without a Store leaves products untouched", async (t) => {
  let updated = false;
  t.mock.method(WebsiteData, "upsert", async (data) => [{ id: data.websiteId }]);
  t.mock.method(WebsiteContent, "findOrCreate", async () => [{}, true]);
  t.mock.method(Product, "update", async () => { updated = true; return [0]; });

  const res = response();
  await websiteData({ body: { websiteId: "site-1", userId: "user-1" } }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(updated, false);
});

test("linking products to a skincare website does not validate a partial product", async (t) => {
  t.mock.method(WebsiteData, "findOne", async () => ({ niche: "skincare" }));
  let updated;
  t.mock.method(Product.queryInterface, "bulkUpdate", async (_table, values, where) => {
    updated = { values, where };
    return 0;
  });

  await ProductService.attachStoreProductsToWebsite("store-1", "site-1");
  assert.equal(updated.values.websiteId, "site-1");
  assert.deepEqual(updated.where, { storeId: "store-1", websiteId: null });
});
