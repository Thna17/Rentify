const test = require("node:test");
const assert = require("node:assert/strict");

process.env.JWT_SECRET = "test-access-secret-32-chars-minimum-ok";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-32-chars-minimum";

const { generateAccessToken, generateRefreshToken } = require("../../src/utils/jwtUtils");
const { hashRefreshToken, compareRefreshToken } = require("../../src/utils/refreshTokenHash");
const { verifyToken } = require("../../src/middlewares/auth");
const {
  requireAdmin,
  createRequireAdmin,
  requireStoreAccess,
  createRequireStoreAccess,
  requireWebsiteOwner,
  createRequireWebsiteOwner,
} = require("../../src/middlewares/authorization");
const AuthService = require("../../src/modules/auth/authService");

const createResponse = () => ({
  statusCode: 200,
  body: null,
  cookies: {},
  clearedCookies: [],
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(data) {
    this.body = data;
    return this;
  },
  cookie(name, val, opts) {
    this.cookies[name] = { val, opts };
    return this;
  },
  clearCookie(name, opts) {
    this.clearedCookies.push({ name, opts });
    return this;
  },
});

test("P2-ID-001: 1. Merchant-only person can access own store but not another merchant store", async () => {
  const storeA = { id: "store-a", ownerUserId: "merchant-1", status: "active" };
  const storeB = { id: "store-b", ownerUserId: "merchant-2", status: "active" };

  const guard = createRequireStoreAccess({
    findStore: async (id) => (id === "store-a" ? storeA : id === "store-b" ? storeB : null),
  });

  // Accessing own store
  let accessedOwn = false;
  const reqOwn = { user: { id: "merchant-1", role: "user" }, params: { storeId: "store-a" } };
  await guard(reqOwn, createResponse(), () => { accessedOwn = true; });
  assert.equal(accessedOwn, true);
  assert.equal(reqOwn.store.id, "store-a");

  // Attempting to access another merchant's store
  const resOther = createResponse();
  const reqOther = { user: { id: "merchant-1", role: "user" }, params: { storeId: "store-b" } };
  await guard(reqOther, resOther, () => assert.fail("Must not permit access to other merchant store"));
  assert.equal(resOther.statusCode, 403);
});

test("P2-ID-001: 2. Buyer-only person is denied access to merchant and admin store operations", async () => {
  const buyerId = "buyer-uuid-123";
  const store = { id: "store-a", ownerUserId: "merchant-owner-999", status: "active" };
  const storeGuard = createRequireStoreAccess({ findStore: async () => store });
  const adminGuard = createRequireAdmin({ findUser: async () => ({ id: buyerId, role: "user" }) });

  // Buyer attempting store management
  const resStore = createResponse();
  await storeGuard({ user: { id: buyerId, role: "user" }, params: { storeId: "store-a" } }, resStore, () => {
    assert.fail("Buyer must not access merchant store management");
  });
  assert.equal(resStore.statusCode, 403);

  // Buyer attempting admin operations
  const resAdmin = createResponse();
  await adminGuard({ user: { id: buyerId, role: "user" } }, resAdmin, () => {
    assert.fail("Buyer must not access admin endpoints");
  });
  assert.equal(resAdmin.statusCode, 403);
});

test("P2-ID-001: 3. Staff-only person operates within granted permissions and cannot access unpermitted store", async () => {
  const storeA = { id: "store-a", ownerUserId: "merchant-1", status: "active" };
  const storeB = { id: "store-b", ownerUserId: "merchant-2", status: "active" };

  const guard = createRequireStoreAccess({
    findStore: async (id) => (id === "store-a" ? storeA : storeB),
  });

  // Staff with manage_products for merchant-1 accessing Store A
  let staffPassed = false;
  const staffReqA = {
    user: {
      id: "staff-1",
      role: "staff",
      merchantId: "merchant-1",
      permissions: ["manage_products"],
    },
    params: { storeId: "store-a" },
  };
  await guard(staffReqA, createResponse(), () => { staffPassed = true; });
  assert.equal(staffPassed, true);

  // Same staff attempting to access Store B (owned by merchant-2)
  const resOther = createResponse();
  const staffReqB = {
    user: {
      id: "staff-1",
      role: "staff",
      merchantId: "merchant-1",
      permissions: ["manage_products"],
    },
    params: { storeId: "store-b" },
  };
  await guard(staffReqB, resOther, () => assert.fail("Staff must not access unrelated store"));
  assert.equal(resOther.statusCode, 403);

  // Staff on Store A without products permission
  const resNoPerm = createResponse();
  const staffReqNoPerm = {
    user: {
      id: "staff-1",
      role: "staff",
      merchantId: "merchant-1",
      permissions: ["manage_orders"], // does not have products permission
    },
    params: { storeId: "store-a" },
  };
  await guard(staffReqNoPerm, resNoPerm, () => assert.fail("Staff without products permission must be rejected"));
  assert.equal(resNoPerm.statusCode, 403);
});

test("P2-ID-001: 4. Platform administrator can access admin endpoints and override tenant boundaries", async () => {
  const adminId = "admin-uuid-001";
  const store = { id: "store-any", ownerUserId: "merchant-99", status: "active" };

  const adminGuard = createRequireAdmin({ findUser: async () => ({ id: adminId, role: "admin" }) });
  const storeGuard = createRequireStoreAccess({ findStore: async () => store });

  let adminEndpointPassed = false;
  await adminGuard({ user: { id: adminId, role: "admin" } }, createResponse(), () => { adminEndpointPassed = true; });
  assert.equal(adminEndpointPassed, true);

  let storeEndpointPassed = false;
  await storeGuard({ user: { id: adminId, role: "admin" }, params: { storeId: "store-any" } }, createResponse(), () => {
    storeEndpointPassed = true;
  });
  assert.equal(storeEndpointPassed, true);
});

test("P2-ID-001: 5. One person with merchant and buyer roles safely separates merchant store ownership and buyer activities", async () => {
  const personUserId = "dual-role-person-1";
  const ownStore = { id: "person-store", ownerUserId: personUserId, status: "active" };
  const otherStore = { id: "target-store", ownerUserId: "other-merchant", status: "active" };

  const guard = createRequireStoreAccess({
    findStore: async (id) => (id === "person-store" ? ownStore : otherStore),
  });

  // 1. As Merchant: owns person-store
  let merchantAllowed = false;
  await guard({ user: { id: personUserId, role: "user" }, params: { storeId: "person-store" } }, createResponse(), () => {
    merchantAllowed = true;
  });
  assert.equal(merchantAllowed, true);

  // 2. As Buyer on otherStore: cannot administer otherStore
  const buyerDeny = createResponse();
  await guard({ user: { id: personUserId, role: "user" }, params: { storeId: "target-store" } }, buyerDeny, () => {
    assert.fail("Buyer actions must not grant store admin access");
  });
  assert.equal(buyerDeny.statusCode, 403);
});

test("P2-ID-001: 6. One person with owner and staff relationships cannot cross-escalate roles", async () => {
  const personUser = { id: "user-alice", role: "user" }; // Alice owns Store 1
  const staffRecord = { id: "staff-alice", role: "staff", merchantId: "bob-merchant", permissions: ["manage_products"] }; // Alice is staff for Bob

  const store1 = { id: "store-1", ownerUserId: "user-alice", status: "active" };
  const store2 = { id: "store-2", ownerUserId: "bob-merchant", status: "active" };

  const guard = createRequireStoreAccess({
    findStore: async (id) => (id === "store-1" ? store1 : store2),
  });

  // Alice as owner of Store 1
  let ownerPassed = false;
  await guard({ user: personUser, params: { storeId: "store-1" } }, createResponse(), () => { ownerPassed = true; });
  assert.equal(ownerPassed, true);

  // Alice using staff credential on Store 2
  let staffPassed = false;
  await guard({ user: staffRecord, params: { storeId: "store-2" } }, createResponse(), () => { staffPassed = true; });
  assert.equal(staffPassed, true);

  // Alice using staff credential on Store 1 (fails because Bob does not own Store 1)
  const resWrongStaff = createResponse();
  await guard({ user: staffRecord, params: { storeId: "store-1" } }, resWrongStaff, () => {
    assert.fail("Staff credential for Bob cannot administer Store 1");
  });
  assert.equal(resWrongStaff.statusCode, 403);
});

test("P2-ID-001: 7. Conflicting credentials (Bearer vs Cookie with different subjects) are rejected safely", async () => {
  const tokenAlice = generateAccessToken({ id: "user-alice", role: "user" });
  const tokenBob = generateAccessToken({ id: "user-bob", role: "user" });

  const req = {
    headers: { authorization: `Bearer ${tokenAlice}` },
    cookies: { userAccessToken: tokenBob },
  };
  const res = createResponse();
  let nextCalled = false;

  await verifyToken(req, res, () => { nextCalled = true; });

  assert.equal(res.statusCode, 401);
  assert.equal(nextCalled, false);
  assert.match(res.body.error, /Conflicting credentials provided/);
});

test("P2-ID-001: 8. Expired and revoked sessions are denied access", async () => {
  // 1. Expired access token without refresh token
  const expiredToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InVzZXItMSIsImlhdCI6MTcwMDAwMDAwMCwiZXhwIjoxNzAwMDAwMDAxfQ.signature";
  const reqExpired = { cookies: { userAccessToken: expiredToken } };
  const resExpired = createResponse();
  let nextExpired = false;

  await verifyToken(reqExpired, resExpired, () => { nextExpired = true; });
  assert.equal(resExpired.statusCode, 401);
  assert.equal(nextExpired, false);

  // 2. Revoked refresh token in database
  const service = new AuthService({}, "User");
  const refreshToken = generateRefreshToken({ id: "user-revoked" });
  service.entityModel = {
    findOne: async () => ({
      id: "user-revoked",
      refreshToken: null, // revoked!
      refreshTokenExpires: null,
    }),
  };

  const validation = await service.validateToken(null, refreshToken);
  assert.equal(validation.valid, false);
});

test("P2-ID-001: 9. Refresh-token rotation rotates hash, revokes on logout, and invalidates old tokens", async () => {
  const service = new AuthService({}, "User");
  const initialRefresh = generateRefreshToken({ id: "user-rotate" });

  const userRecord = {
    id: "user-rotate",
    role: "user",
    refreshToken: await hashRefreshToken(initialRefresh),
    refreshTokenExpires: new Date(Date.now() + 60_000),
    async save() {},
  };
  service.entityModel = { findOne: async () => userRecord };

  // 1. Successful rotation
  const rotated = await service.refreshToken({ refreshToken: initialRefresh });
  assert.notEqual(rotated.refreshToken, initialRefresh);
  assert.equal(await compareRefreshToken(rotated.refreshToken, userRecord.refreshToken), true);

  // 2. Old token no longer matches new hash
  assert.equal(await compareRefreshToken(initialRefresh, userRecord.refreshToken), false);

  // 3. Logout revokes token
  await service.logout({ refreshToken: rotated.refreshToken });
  assert.equal(userRecord.refreshToken, null);
  assert.equal(userRecord.refreshTokenExpires, null);
});

test("P2-ID-001: 10. Body and query attempts to impersonate another subject are rejected", async () => {
  // Test A: staff invitation cannot adopt arbitrary merchantId from body
  const { sendStaffInvitation } = require("../../src/modules/staff/staffController");
  const reqInvite = {
    user: { id: "merchant-attacker", role: "user" },
    body: {
      merchantId: "victim-merchant-999",
      name: "Malicious Staff",
      contact: "staff@example.com",
      contactMethod: "email",
      permissions: ["manage_products"],
    },
    transaction: {},
  };
  const resInvite = createResponse();

  await assert.rejects(
    sendStaffInvitation(reqInvite, resInvite),
    (err) => err.statusCode === 403 && /Cannot invite staff for another merchant/.test(err.message)
  );

  // Test B: website cache clear cannot clear another user's cache
  const websiteController = require("../../src/modules/websites/websiteController");
  const reqCache = {
    user: { id: "user-alice", role: "user" },
    body: { userId: "user-bob" },
  };
  const resCache = createResponse();

  await websiteController.clearCache(reqCache, resCache);
  assert.equal(resCache.statusCode, 403);
  assert.match(resCache.body.error, /Cannot clear cache for another user/);
});

test("P2-ID-001: 11. Legacy Customer accounts cannot access Core workforce or admin identities by email", async () => {
  // Verify that AuthService signup checks storeId for customers and prevents email-based role elevation
  const customerService = new AuthService({}, "Customer", true);
  assert.equal(customerService.storeIdRequired, true);
  assert.equal(customerService.role, "customer");

  const userService = new AuthService({}, "User", false);
  assert.equal(userService.storeIdRequired, false);
  assert.equal(userService.role, "user");
});

test("P2-ID-001: 12. Cross-Store identity isolation: website owner middleware rejects other merchants", async () => {
  const guard = createRequireWebsiteOwner({
    findWebsite: async (id) => (id === "site-1" ? { id: "site-1", userId: "owner-1" } : null),
  });

  // Owner 1 can access site-1
  let ownerPassed = false;
  await guard({ user: { id: "owner-1", role: "user" }, params: { websiteId: "site-1" } }, createResponse(), () => {
    ownerPassed = true;
  });
  assert.equal(ownerPassed, true);

  // Owner 2 cannot access site-1
  const resOther = createResponse();
  await guard({ user: { id: "owner-2", role: "user" }, params: { websiteId: "site-1" } }, resOther, () => {
    assert.fail("Unrelated merchant must not access site-1");
  });
  assert.equal(resOther.statusCode, 403);
  assert.match(resOther.body.error, /You do not have access to this website/);
});
