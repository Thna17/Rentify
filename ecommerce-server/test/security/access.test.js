const test = require("node:test");
const assert = require("node:assert/strict");
const { requireServiceToken } = require("../../middlewares/requireServiceToken");
const { createRequireWebsiteAccess } = require("../../middlewares/requireWebsiteAccess");

const response = () => ({
  statusCode: null,
  body: null,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});

test("website-data synchronization rejects an unauthenticated caller", () => {
  process.env.SERVICE_TO_SERVICE_TOKEN = "test-service-token";
  const res = response();
  requireServiceToken({ get: () => undefined }, res, () => assert.fail("next must not run"));
  assert.equal(res.statusCode, 401);
});

test("merchant payment or order action rejects a different merchant", async () => {
  const guard = createRequireWebsiteAccess({ findWebsite: async () => ({ userId: "merchant-a", staffData: [] }) });
  const res = response();
  await guard({ user: { id: "merchant-b", type: "user" }, params: { websiteId: "site-a" } }, res, () => assert.fail("next must not run"));
  assert.equal(res.statusCode, 403);
});

test("merchant payment or order action permits the owner", async () => {
  const guard = createRequireWebsiteAccess({ findWebsite: async () => ({ userId: "merchant-a", staffData: [] }) });
  let passed = false;
  await guard({ user: { id: "merchant-a", type: "user" }, params: { websiteId: "site-a" } }, response(), () => { passed = true; });
  assert.equal(passed, true);
});

test("staff must belong to the website and hold the requested permission", async () => {
  const guard = createRequireWebsiteAccess({
    requiredPermissions: ["pos"],
    findWebsite: async () => ({ userId: "merchant-a", staffData: [{ id: "staff-a" }] }),
  });
  const denied = response();
  await guard({ user: { id: "staff-a", type: "staff", permissions: ["invoice"] }, params: { websiteId: "site-a" } }, denied, () => assert.fail("next must not run"));
  assert.equal(denied.statusCode, 403);

  let passed = false;
  await guard({ user: { id: "staff-a", type: "staff", permissions: ["pos"] }, params: { websiteId: "site-a" } }, response(), () => { passed = true; });
  assert.equal(passed, true);
});
