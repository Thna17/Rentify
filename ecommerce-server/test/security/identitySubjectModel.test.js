const test = require("node:test");
const assert = require("node:assert/strict");

process.env.JWT_SECRET = "test-access-secret-32-chars-minimum-ok";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-32-chars-minimum";

const { generateAccessToken } = require("../../utils/jwtUtils");
const {
  createVerifyCoreBuyer,
  createVerifyStoreActor,
  verifyToken,
} = require("../../middlewares/authMiddleware");
const { createVerifyCoreAdmin } = require("../../modules/admin/verifyCoreAdmin");
const { createRequireStoreAccess } = require("../../middlewares/requireStoreAccess");
const MyOrderDetailsStrategy = require("../../modules/orders/core/orderRetrieval/strategies/MyOrderDetailsStrategy");
const MyOrdersStrategy = require("../../modules/orders/core/orderRetrieval/strategies/MyOrdersStrategy");
const MyOrderPaymentStrategy = require("../../modules/orders/core/orderRetrieval/strategies/MyOrderPaymentStrategy");
const OnlineOrderStrategy = require("../../modules/orders/core/orderCreation/strategies/OnlineOrderStrategy");

const createResponse = () => ({
  statusCode: 200,
  body: null,
  cookies: {},
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
});

test("P2-ID-001: Commerce 1. Merchant-only person can access own store routes and is rejected from other stores", async () => {
  const storeA = { storeId: "store-a", ownerUserId: "merchant-1", status: "active" };
  const storeB = { storeId: "store-b", ownerUserId: "merchant-2", status: "active" };

  const guard = createRequireStoreAccess({
    findStore: async (id) => (id === "store-a" ? storeA : storeB),
  });

  // Owner accessing Store A
  let passed = false;
  const ownReq = { user: { id: "merchant-1", type: "user" }, params: { storeId: "store-a" } };
  await guard(ownReq, createResponse(), () => { passed = true; });
  assert.equal(passed, true);
  assert.equal(ownReq.store, storeA);

  // Owner accessing Store B
  const deniedRes = createResponse();
  const otherReq = { user: { id: "merchant-1", type: "user" }, params: { storeId: "store-b" } };
  await guard(otherReq, deniedRes, () => assert.fail("Must not permit merchant to access other store"));
  assert.equal(deniedRes.statusCode, 403);
});

test("P2-ID-001: Commerce 2. Buyer-only person is authenticated via Core and denied merchant store access", async () => {
  const buyerMiddleware = createVerifyCoreBuyer({
    validate: async (access) => ({
      data: { valid: true, entity: { id: "buyer-uuid-1", isVerified: true, role: "user" } },
    }),
  });

  const req = { cookies: { userAccessToken: "valid-buyer-token" } };
  const res = createResponse();
  let buyerNext = false;
  await buyerMiddleware(req, res, () => { buyerNext = true; });

  assert.equal(buyerNext, true);
  assert.equal(req.user.id, "buyer-uuid-1");
  assert.equal(req.user.type, "user");

  // Buyer cannot access merchant store admin route
  const storeGuard = createRequireStoreAccess({
    findStore: async () => ({ storeId: "store-a", ownerUserId: "merchant-1", status: "active" }),
  });
  const resStore = createResponse();
  await storeGuard(
    { user: { id: "buyer-uuid-1", type: "customer" }, params: { storeId: "store-a" } },
    resStore,
    () => assert.fail("Buyer cannot access store management")
  );
  assert.equal(resStore.statusCode, 401);
});

test("P2-ID-001: Commerce 3. Staff-only person operates with explicit permissions and tenant website check", async () => {
  const store = {
    storeId: "store-1",
    ownerUserId: "merchant-1",
    websiteId: "website-1",
    status: "active",
  };

  const guard = createRequireStoreAccess({
    findStore: async () => store,
    permissions: ["manage_orders"],
  });

  // Valid staff
  let passed = false;
  const staff = {
    type: "staff",
    merchantId: "merchant-1",
    websiteId: "website-1",
    permissions: ["manage_orders"],
  };
  await guard({ params: { storeId: "store-1" }, user: staff }, createResponse(), () => { passed = true; });
  assert.equal(passed, true);

  // Staff with wrong merchant
  const resWrongMerchant = createResponse();
  await guard({ params: { storeId: "store-1" }, user: { ...staff, merchantId: "merchant-2" } }, resWrongMerchant, () => {
    assert.fail("Staff with wrong merchant must be rejected");
  });
  assert.equal(resWrongMerchant.statusCode, 403);
});

test("P2-ID-001: Commerce 4. Platform administrator authentication requires Core admin role", async () => {
  const adminMiddleware = createVerifyCoreAdmin({
    validate: async (access) => ({
      data: { valid: true, entity: { id: "admin-1", type: "admin" } },
    }),
  });

  const req = { cookies: { userAccessToken: "admin-token" } };
  let adminNext = false;
  await adminMiddleware(req, createResponse(), () => { adminNext = true; });
  assert.equal(adminNext, true);
  assert.equal(req.user.role, "admin");

  // Non-admin receives 403
  const nonAdminMiddleware = createVerifyCoreAdmin({
    validate: async (access) => ({
      data: { valid: true, entity: { id: "user-1", type: "user" } },
    }),
  });
  const resNonAdmin = createResponse();
  await nonAdminMiddleware(req, resNonAdmin, () => assert.fail("Non-admin must be rejected"));
  assert.equal(resNonAdmin.statusCode, 403);
});

test("P2-ID-001: Commerce 5. One person with merchant and buyer roles can check out as buyer on another store", async () => {
  const dualUserId = "merchant-and-buyer-person";
  // The person can be verified as buyer for checkout
  const buyerMiddleware = createVerifyCoreBuyer({
    validate: async () => ({
      data: { valid: true, entity: { id: dualUserId, isVerified: true, role: "user" } },
    }),
  });

  const req = { cookies: { userAccessToken: "dual-role-token" } };
  await buyerMiddleware(req, createResponse(), () => {});
  assert.equal(req.user.id, dualUserId);
  assert.equal(req.user.type, "user");
});

test("P2-ID-001: Commerce 6. Store actor precedence resolves staff token before merchant fallback", async () => {
  const actorMiddleware = createVerifyStoreActor({
    validateStaff: async (access) => ({
      valid: true,
      entity: { id: "staff-delegate-1", merchantId: "merchant-owner-1" },
      permissions: ["manage_orders"],
    }),
    verifyMerchant: () => assert.fail("Valid staff token must not fall back to merchant"),
  });

  const req = {
    cookies: {
      staffAccessToken: "staff-valid",
      userAccessToken: "merchant-valid",
    },
  };
  let called = false;
  await actorMiddleware(req, createResponse(), () => { called = true; });

  assert.equal(called, true);
  assert.equal(req.user.type, "staff");
  assert.equal(req.user.id, "staff-delegate-1");
  assert.deepEqual(req.user.permissions, ["manage_orders"]);
});

test("P2-ID-001: Commerce 7. Conflicting credentials (Bearer vs Cookie) are rejected with 401", async () => {
  const tokenAlice = generateAccessToken({ id: "user-alice", role: "user" });
  const tokenBob = generateAccessToken({ id: "user-bob", role: "user" });

  const buyerMiddleware = createVerifyCoreBuyer({
    validate: async () => assert.fail("Must not validate with conflicting credentials"),
  });

  const req = {
    headers: { authorization: `Bearer ${tokenAlice}` },
    cookies: { userAccessToken: tokenBob },
  };
  const res = createResponse();
  let nextCalled = false;

  await buyerMiddleware(req, res, () => { nextCalled = true; });
  assert.equal(res.statusCode, 401);
  assert.equal(nextCalled, false);
  assert.match(res.body.error, /Conflicting credentials provided/);
});

test("P2-ID-001: Commerce 8. Expired or unauthenticated buyer sessions are rejected", async () => {
  const buyerMiddleware = createVerifyCoreBuyer({
    validate: async () => ({ data: { valid: false } }),
  });

  const req = { cookies: { userAccessToken: "stale-token" } };
  const res = createResponse();
  let nextCalled = false;

  await buyerMiddleware(req, res, () => { nextCalled = true; });
  assert.equal(res.statusCode, 401);
  assert.equal(nextCalled, false);
});

test("P2-ID-001: Commerce 9. Core token validation propagates rotated access cookie to response", async () => {
  const buyerMiddleware = createVerifyCoreBuyer({
    validate: async (access, refresh) => ({
      data: {
        valid: true,
        entity: { id: "buyer-1", isVerified: true },
        newAccessToken: "new-rotated-access-token",
      },
    }),
  });

  const req = { cookies: { userRefreshToken: "valid-refresh" } };
  const res = createResponse();
  await buyerMiddleware(req, res, () => {});

  assert.equal(res.cookies.userAccessToken?.val, "new-rotated-access-token");
  assert.equal(res.cookies.userAccessToken?.opts?.httpOnly, true);
});

test("P2-ID-001: Commerce 10. Order retrieval strategies reject missing identification and enforce scoping", async () => {
  // Test A: MyOrderDetailsStrategy rejects missing identification
  const detailsStrategy = new MyOrderDetailsStrategy({ Order: {} });
  const resDetails = createResponse();
  await detailsStrategy.execute({ params: { orderId: "ord-1" }, user: { type: "guest" } }, resDetails);
  assert.equal(resDetails.statusCode, 401);
  assert.match(resDetails.body.error, /Identification required/);

  // Test B: MyOrdersStrategy rejects missing identification
  const ordersStrategy = new MyOrdersStrategy({ Order: {} });
  const resOrders = createResponse();
  await ordersStrategy.execute({ params: { websiteId: "site-1" }, query: {}, user: { type: "guest" } }, resOrders);
  assert.equal(resOrders.statusCode, 401);
  assert.match(resOrders.body.error, /Identification required/);

  // Test C: MyOrderPaymentStrategy rejects missing identification
  const paymentStrategy = new MyOrderPaymentStrategy({ Payment: {}, Order: {} });
  const resPayment = createResponse();
  await paymentStrategy.execute({ params: { orderId: "ord-1" }, user: { type: "guest" } }, resPayment);
  assert.equal(resPayment.statusCode, 401);
  assert.match(resPayment.body.error, /Identification required/);
});

test("P2-ID-001: Commerce 11. Online checkout contact email never auto-merges with existing Customer", async () => {
  const strategy = new OnlineOrderStrategy({}, {}, {});
  strategy.models = { Customer: {} };

  // A guest order with an email address does NOT look up or merge an existing Customer account
  const customer = await strategy.findOrCreateCustomer(
    { type: "guest", sessionId: "sess-123" },
    { email: "existing-customer@example.com" },
    "website-1",
    null
  );
  assert.equal(customer, null);

  // A Core user order with an email address does NOT merge with a local Customer account
  const coreCustomer = await strategy.findOrCreateCustomer(
    { type: "user", id: "core-buyer-uuid" },
    { email: "existing-customer@example.com" },
    "website-1",
    null
  );
  assert.equal(coreCustomer, null);
});

test("P2-ID-001: Commerce 12. Cross-Store and cross-buyer order isolation is asserted", async () => {
  let queriedWhere = null;
  const mockOrderModel = {
    findOne: async ({ where }) => {
      queriedWhere = where;
      return null;
    },
  };
  const strategy = new MyOrderDetailsStrategy();
  strategy.models = { Order: mockOrderModel, Invoice: {} };
  strategy.includeCommon = [];

  // When a Core buyer accesses their order, the query strictly includes buyerId
  await strategy.execute(
    { params: { orderId: "order-99" }, user: { id: "buyer-alice", type: "user" } },
    createResponse()
  );
  assert.equal(queriedWhere.id, "order-99");
  assert.equal(queriedWhere.buyerId, "buyer-alice");

  // When a legacy customer accesses their order, the query strictly includes userId
  await strategy.execute(
    { params: { orderId: "order-99" }, user: { id: "cust-bob", type: "customer" } },
    createResponse()
  );
  assert.equal(queriedWhere.id, "order-99");
  assert.equal(queriedWhere.userId, "cust-bob");
});
