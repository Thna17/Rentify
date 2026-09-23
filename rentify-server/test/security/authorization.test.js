const test = require("node:test");
const assert = require("node:assert/strict");
const { createRequireAdmin, createRequireWebsiteOwner } = require("../../src/middlewares/authorization");

const response = () => ({
  statusCode: null,
  body: null,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});

test("website mutation rejects an unauthenticated request", async () => {
  const guard = createRequireWebsiteOwner({ findWebsite: async () => ({ userId: "merchant-a" }) });
  const res = response();
  await guard({ params: { websiteId: "site-a" } }, res, () => assert.fail("next must not run"));
  assert.equal(res.statusCode, 401);
});

test("template administration rejects a non-admin", async () => {
  const guard = createRequireAdmin({ findUser: async () => ({ id: "merchant-a", role: "user" }) });
  const res = response();
  await guard({ user: { id: "merchant-a" } }, res, () => assert.fail("next must not run"));
  assert.equal(res.statusCode, 403);
});

test("website mutation rejects a different merchant", async () => {
  const guard = createRequireWebsiteOwner({ findWebsite: async () => ({ userId: "merchant-a" }) });
  const res = response();
  await guard({ user: { id: "merchant-b" }, params: { websiteId: "site-a" } }, res, () => assert.fail("next must not run"));
  assert.equal(res.statusCode, 403);
});

test("website mutation permits its owner", async () => {
  const guard = createRequireWebsiteOwner({ findWebsite: async () => ({ userId: "merchant-a" }) });
  let passed = false;
  await guard({ user: { id: "merchant-a" }, params: { websiteId: "site-a" } }, response(), () => { passed = true; });
  assert.equal(passed, true);
});
