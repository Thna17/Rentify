const test = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcrypt");
const { Op } = require("sequelize");

process.env.JWT_SECRET = "test-access-secret-32-chars-minimum-ok";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-32-chars-minimum";

const staffController = require("../../src/modules/staff/staffController");
const StaffAuthService = require("../../src/modules/staff/staffAuthService");
const { Staff, Store, User, Website } = require("../../src/models");
const NotificationService = require("../../src/modules/notifications").notificationService;

// Prevent SMTP connection timeouts in tests
NotificationService.prototype.send = async () => {};

const STORE_A = "11111111-1111-4111-8111-111111111111";
const STORE_B = "22222222-2222-4222-8222-222222222222";
const STORE_SUSPENDED = "33333333-3333-4333-8333-333333333333";

const MERCHANT_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const MERCHANT_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const MERCHANT_SUSPENDED = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

const MANAGER_A_ID = "44444444-4444-4444-8444-444444444444";
const ORDINARY_STAFF_A_ID = "55555555-5555-4555-8555-555555555555";
const STAFF_B_ID = "66666666-6666-4666-8666-666666666666";

const WEBSITE_A = "77777777-7777-4777-8777-777777777777";
const WEBSITE_B = "88888888-8888-4888-8888-888888888888";

const createMockRes = () => ({
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
  clearCookie(name, opts) {
    delete this.cookies[name];
    return this;
  },
});

test("Staff Store Ownership: 1. Store owner can invite and manage staff for their store", async (t) => {
  let createdStaffData = null;
  t.mock.method(Store, "findOne", async () => ({ id: STORE_A, ownerUserId: MERCHANT_A, status: "active" }));
  t.mock.method(Store, "findByPk", async (id) => id === STORE_A ? ({ id: STORE_A, ownerUserId: MERCHANT_A, status: "active" }) : null);
  t.mock.method(Staff, "findOne", async () => null);
  t.mock.method(Staff, "create", async (data) => {
    createdStaffData = data;
    return { id: "new-staff-1", ...data };
  });

  const req = {
    user: { id: MERCHANT_A, role: "user" },
    body: {
      name: "Alice Assistant",
      contact: "alice@example.com",
      contactMethod: "email",
      permissions: ["manage_products", "manage_orders"],
      storeId: STORE_A,
    },
  };
  const res = createMockRes();

  await staffController.sendStaffInvitation(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(createdStaffData.storeId, STORE_A, "Staff must be bound to storeId");
  assert.equal(createdStaffData.merchantId, MERCHANT_A);
  assert.equal(createdStaffData.isActive, false, "Pending invite must be inactive");
  assert.ok(createdStaffData.invitationToken, "Unguessable invitation token must be generated");
});

test("Staff Store Ownership: 2. Permitted staff manager can invite staff with subset permissions", async (t) => {
  let createdStaffData = null;
  t.mock.method(Store, "findByPk", async (id) => id === STORE_A ? ({ id: STORE_A, ownerUserId: MERCHANT_A, status: "active" }) : null);
  t.mock.method(Staff, "findOne", async () => null);
  t.mock.method(Staff, "create", async (data) => {
    createdStaffData = data;
    return { id: "new-staff-2", ...data };
  });

  const req = {
    user: {
      id: MANAGER_A_ID,
      role: "staff",
      storeId: STORE_A,
      merchantId: MERCHANT_A,
      permissions: ["manage_staff", "manage_products"],
    },
    body: {
      name: "Bob Assistant",
      contact: "bob@example.com",
      contactMethod: "email",
      permissions: ["manage_products"], // Valid subset
    },
  };
  const res = createMockRes();

  await staffController.sendStaffInvitation(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(createdStaffData.storeId, STORE_A);
  assert.deepEqual(createdStaffData.permissions, ["manage_products"]);
});

test("Staff Store Ownership: 3. Staff manager cannot grant permissions they do not hold", async (t) => {
  t.mock.method(Store, "findByPk", async (id) => id === STORE_A ? ({ id: STORE_A, ownerUserId: MERCHANT_A, status: "active" }) : null);

  const req = {
    user: {
      id: MANAGER_A_ID,
      role: "staff",
      storeId: STORE_A,
      merchantId: MERCHANT_A,
      permissions: ["manage_staff", "manage_products"],
    },
    body: {
      name: "Carol Assistant",
      contact: "carol@example.com",
      contactMethod: "email",
      permissions: ["manage_products", "manage_pos", "manage_invoices"], // Unheld: pos, invoices
    },
  };
  const res = createMockRes();

  await assert.rejects(
    staffController.sendStaffInvitation(req, res),
    (err) => err.statusCode === 403 && /Cannot grant permissions you do not hold/.test(err.message)
  );
});

test("Staff Store Ownership: 4. Staff cannot promote anyone to owner or administrator", async () => {
  const req = {
    user: {
      id: MANAGER_A_ID,
      role: "staff",
      storeId: STORE_A,
      merchantId: MERCHANT_A,
      permissions: ["manage_staff"],
    },
    body: {
      name: "Eve Malicious",
      contact: "eve@example.com",
      contactMethod: "email",
      permissions: ["manage_staff"],
      role: "admin", // Malicious escalation attempt
    },
  };
  const res = createMockRes();

  await assert.rejects(
    staffController.sendStaffInvitation(req, res),
    (err) => err.statusCode === 403 && /Staff cannot be promoted to owner or administrator/.test(err.message)
  );
});

test("Staff Store Ownership: 5. Staff manager cannot modify their own permissions (no self-escalation)", async (t) => {
  const staffRecord = {
    id: MANAGER_A_ID,
    storeId: STORE_A,
    merchantId: MERCHANT_A,
    permissions: ["manage_staff"],
    save: async () => {},
    toJSON: () => ({ id: MANAGER_A_ID, permissions: ["manage_staff"] }),
  };
  t.mock.method(Staff, "findByPk", async (id) => id === MANAGER_A_ID ? staffRecord : null);
  t.mock.method(Store, "findByPk", async (id) => id === STORE_A ? ({ id: STORE_A, ownerUserId: MERCHANT_A, status: "active" }) : null);

  const req = {
    user: {
      id: MANAGER_A_ID,
      role: "staff",
      storeId: STORE_A,
      merchantId: MERCHANT_A,
      permissions: ["manage_staff"],
    },
    params: { id: MANAGER_A_ID },
    body: {
      permissions: ["manage_staff", "manage_products", "manage_pos"],
    },
  };
  const res = createMockRes();

  await assert.rejects(
    staffController.updateStaff(req, res),
    (err) => err.statusCode === 403 && /Staff cannot modify their own permissions/.test(err.message)
  );
});

test("Staff Store Ownership: 6. Staff manager cannot delete their own account", async (t) => {
  const staffRecord = {
    id: MANAGER_A_ID,
    storeId: STORE_A,
    merchantId: MERCHANT_A,
    destroy: async () => {},
  };
  t.mock.method(Staff, "findByPk", async (id) => id === MANAGER_A_ID ? staffRecord : null);
  t.mock.method(Store, "findByPk", async (id) => id === STORE_A ? ({ id: STORE_A, ownerUserId: MERCHANT_A, status: "active" }) : null);

  const req = {
    user: {
      id: MANAGER_A_ID,
      role: "staff",
      storeId: STORE_A,
      merchantId: MERCHANT_A,
      permissions: ["manage_staff"],
    },
    params: { id: MANAGER_A_ID },
  };
  const res = createMockRes();

  await assert.rejects(
    staffController.deleteStaff(req, res),
    (err) => err.statusCode === 403 && /Staff cannot delete their own account/.test(err.message)
  );
});

test("Staff Store Ownership: 7. Ordinary staff without manage_staff is denied staff management", async () => {
  const req = {
    user: {
      id: ORDINARY_STAFF_A_ID,
      role: "staff",
      storeId: STORE_A,
      merchantId: MERCHANT_A,
      permissions: ["manage_products"], // Lacks manage_staff
    },
    body: {
      name: "Frank Staff",
      contact: "frank@example.com",
      contactMethod: "email",
      permissions: ["manage_products"],
    },
  };
  const res = createMockRes();

  await assert.rejects(
    staffController.sendStaffInvitation(req, res),
    (err) => err.statusCode === 403 && /Staff management permission required/.test(err.message)
  );
});

test("Staff Store Ownership: 8. Cross-Store Anti-Enumeration: Unrelated merchant receives 404 Not Found", async (t) => {
  const staffOfStoreA = {
    id: ORDINARY_STAFF_A_ID,
    storeId: STORE_A,
    merchantId: MERCHANT_A,
    name: "Staff of Store A",
    permissions: ["manage_products"],
  };

  t.mock.method(Staff, "findByPk", async (id) => id === ORDINARY_STAFF_A_ID ? staffOfStoreA : null);
  t.mock.method(Store, "findByPk", async (id) => id === STORE_A ? ({ id: STORE_A, ownerUserId: MERCHANT_A, status: "active" }) : null);

  // Unrelated Merchant B tries to read Staff of Store A
  const req = {
    user: { id: MERCHANT_B, role: "user" },
    params: { id: ORDINARY_STAFF_A_ID },
  };
  const res = createMockRes();

  await assert.rejects(
    staffController.getStaffById(req, res),
    (err) => err.statusCode === 404 && /Staff not found/.test(err.message),
    "Must return 404 across tenants to prevent identifier enumeration"
  );
});

test("Staff Store Ownership: 9. Cross-Store Anti-Enumeration: Staff of another store receives 404 Not Found", async (t) => {
  const staffOfStoreA = {
    id: ORDINARY_STAFF_A_ID,
    storeId: STORE_A,
    merchantId: MERCHANT_A,
  };

  t.mock.method(Staff, "findByPk", async (id) => id === ORDINARY_STAFF_A_ID ? staffOfStoreA : null);
  t.mock.method(Store, "findByPk", async (id) => id === STORE_A ? ({ id: STORE_A, ownerUserId: MERCHANT_A, status: "active" }) : null);

  // Staff of Store B tries to access Staff of Store A
  const req = {
    user: {
      id: STAFF_B_ID,
      role: "staff",
      storeId: STORE_B,
      merchantId: MERCHANT_B,
      permissions: ["manage_staff"],
    },
    params: { id: ORDINARY_STAFF_A_ID },
  };
  const res = createMockRes();

  await assert.rejects(
    staffController.getStaffById(req, res),
    (err) => err.statusCode === 404 && /Staff not found/.test(err.message),
    "Staff of another store receives 404"
  );
});

test("Staff Store Ownership: 10. Website context must belong to the target Store", async (t) => {
  t.mock.method(Store, "findOne", async () => ({ id: STORE_A, ownerUserId: MERCHANT_A, status: "active" }));
  t.mock.method(Store, "findByPk", async (id) => id === STORE_A ? ({ id: STORE_A, ownerUserId: MERCHANT_A, status: "active" }) : null);
  t.mock.method(Website, "findByPk", async (id) => id === WEBSITE_B ? ({ id: WEBSITE_B, storeId: STORE_B }) : null);

  // Merchant A passes websiteId of Store B
  const req = {
    user: { id: MERCHANT_A, role: "user" },
    body: {
      name: "Grace Staff",
      contact: "grace@example.com",
      contactMethod: "email",
      permissions: ["manage_products"],
      websiteId: WEBSITE_B, // Mismatch!
    },
  };
  const res = createMockRes();

  await assert.rejects(
    staffController.sendStaffInvitation(req, res),
    (err) => err.statusCode === 400 && /Website does not belong to the target store/.test(err.message)
  );
});

test("Staff Store Ownership: 11. Invitation acceptance: activates account and nullifies token (single-use)", async (t) => {
  const invitationToken = "valid-token-1234567890abcdef";
  let savedStaff = null;

  const pendingStaff = {
    id: "pending-staff-1",
    storeId: STORE_A,
    name: "Henry Pending",
    email: "henry@example.com",
    permissions: ["manage_products"],
    invitationToken,
    invitationSentAt: new Date(),
    isActive: false,
    isVerified: false,
    password: null,
    save: async function () {
      savedStaff = this;
    },
  };

  t.mock.method(Staff, "findOne", async ({ where }) => {
    if (where.invitationToken === invitationToken) return pendingStaff;
    return null;
  });
  t.mock.method(Store, "findByPk", async (id) => id === STORE_A ? ({ id: STORE_A, status: "active" }) : null);

  const req = {
    body: {
      token: invitationToken,
      password: "SuperSecretPassword123!",
      contact: "henry@example.com",
    },
  };
  const res = createMockRes();

  await staffController.acceptStaffInvitation(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(savedStaff.isActive, true);
  assert.equal(savedStaff.isVerified, true);
  assert.equal(savedStaff.invitationToken, null, "Invitation token must be cleared for single-use guarantee");
  assert.ok(savedStaff.password && savedStaff.password !== "SuperSecretPassword123!");
});

test("Staff Store Ownership: 12. Reused invitation token is rejected", async (t) => {
  // Simulating token already cleared/used
  t.mock.method(Staff, "findOne", async () => null);

  const req = {
    body: {
      token: "already-used-or-unknown-token",
      password: "SuperSecretPassword123!",
    },
  };
  const res = createMockRes();

  await assert.rejects(
    staffController.acceptStaffInvitation(req, res),
    (err) => err.statusCode === 400 && /Invalid or expired invitation token/.test(err.message)
  );
});

test("Staff Store Ownership: 13. Expired invitation token (> 7 days) is rejected", async (t) => {
  // Query includes invitationSentAt > Date.now() - 7 days, so Sequelize findOne returns null for expired tokens
  t.mock.method(Staff, "findOne", async () => null);

  const req = {
    body: {
      token: "expired-token-older-than-7-days",
      password: "SuperSecretPassword123!",
    },
  };
  const res = createMockRes();

  await assert.rejects(
    staffController.acceptStaffInvitation(req, res),
    (err) => err.statusCode === 400 && /Invalid or expired invitation token/.test(err.message)
  );
});

test("Staff Store Ownership: 14. Contact mismatch on invitation acceptance is rejected with 403", async (t) => {
  const pendingStaff = {
    id: "pending-staff-2",
    storeId: STORE_A,
    email: "legitimate@example.com",
    invitationToken: "token-contact-check",
    invitationSentAt: new Date(),
  };

  t.mock.method(Staff, "findOne", async () => pendingStaff);

  const req = {
    body: {
      token: "token-contact-check",
      password: "SuperSecretPassword123!",
      contact: "attacker-impostor@example.com", // Mismatch!
    },
  };
  const res = createMockRes();

  await assert.rejects(
    staffController.acceptStaffInvitation(req, res),
    (err) => err.statusCode === 403 && /Contact does not match invitation recipient/.test(err.message)
  );
});

test("Staff Store Ownership: 15. Deactivated/revoked staff immediately invalidates sessions", async (t) => {
  const staffMember = {
    id: ORDINARY_STAFF_A_ID,
    storeId: STORE_A,
    merchantId: MERCHANT_A,
    isActive: true,
    refreshToken: "valid-hashed-refresh-token",
    refreshTokenExpires: new Date(Date.now() + 1000000),
    save: async function () {},
    toJSON: function () { return { id: this.id, isActive: this.isActive }; },
  };

  t.mock.method(Staff, "findByPk", async (id) => id === ORDINARY_STAFF_A_ID ? staffMember : null);
  t.mock.method(Store, "findByPk", async (id) => id === STORE_A ? ({ id: STORE_A, ownerUserId: MERCHANT_A, status: "active" }) : null);

  // Store Owner deactivates staff
  const req = {
    user: { id: MERCHANT_A, role: "user" },
    params: { id: ORDINARY_STAFF_A_ID },
    body: { isActive: false },
  };
  const res = createMockRes();

  await staffController.updateStaff(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(staffMember.isActive, false);
  assert.equal(staffMember.refreshToken, null, "Refresh token must be wiped on deactivation");
  assert.equal(staffMember.refreshTokenExpires, null);

  // Subsequent token validation endpoint rejects with 403
  const validateReq = {
    body: { accessToken: "some-token", refreshToken: "some-token" },
  };
  const validateRes = createMockRes();

  t.mock.method(StaffAuthService.prototype, "validateToken", async () => ({
    valid: true,
    entity: { id: ORDINARY_STAFF_A_ID },
  }));

  await assert.rejects(
    staffController.validateStaffToken(validateReq, validateRes),
    (err) => err.statusCode === 403 && /Staff access is inactive/.test(err.message)
  );
});

test("Staff Store Ownership: 16. Multi-Store membership: disambiguation requires storeId when multiple exist", async (t) => {
  const authService = new StaffAuthService();

  const membershipStoreA = {
    id: "staff-membership-a",
    email: "shared-worker@example.com",
    storeId: STORE_A,
    isActive: true,
    isVerified: true,
    password: await bcrypt.hash("WorkerPassword123!", 10),
    save: async function () {},
  };
  const membershipStoreB = {
    id: "staff-membership-b",
    email: "shared-worker@example.com",
    storeId: STORE_B,
    isActive: true,
    isVerified: true,
    password: await bcrypt.hash("WorkerPassword123!", 10),
    save: async function () {},
  };

  t.mock.method(Staff, "findAll", async () => [membershipStoreA, membershipStoreB]);

  // Attempting login without specifying storeId
  await assert.rejects(
    authService.login({
      email: "shared-worker@example.com",
      password: "WorkerPassword123!",
      storeId: undefined,
    }),
    (err) => err.statusCode === 400 && /Multiple store memberships found. Please specify storeId./.test(err.message)
  );

  // Specifying storeId explicitly allows login to Store A
  t.mock.method(Staff, "findOne", async ({ where }) => {
    const isStoreA =
      where.storeId === STORE_A ||
      (Array.isArray(where[Op.and]) &&
        where[Op.and].some((c) => c && c.storeId === STORE_A));
    return isStoreA ? membershipStoreA : membershipStoreB;
  });
  t.mock.method(Staff, "findByPk", async (id) => {
    return id === "staff-membership-a" ? membershipStoreA : membershipStoreB;
  });
  t.mock.method(Store, "findByPk", async () => ({ id: STORE_A, status: "active" }));

  const loginResult = await authService.login({
    email: "shared-worker@example.com",
    password: "WorkerPassword123!",
    storeId: STORE_A,
  });

  assert.equal(loginResult.entity.storeId, STORE_A);
});

test("Staff Store Ownership: 17. Suspended Store: write operations fail with 403 Store is suspended", async (t) => {
  t.mock.method(Store, "findOne", async () => ({ id: STORE_SUSPENDED, ownerUserId: MERCHANT_SUSPENDED, status: "suspended" }));
  t.mock.method(Store, "findByPk", async (id) => id === STORE_SUSPENDED ? ({ id: STORE_SUSPENDED, ownerUserId: MERCHANT_SUSPENDED, status: "suspended" }) : null);

  const req = {
    user: { id: MERCHANT_SUSPENDED, role: "user" },
    body: {
      name: "Suspended Store Staff",
      contact: "staff@suspended.com",
      contactMethod: "email",
      permissions: ["manage_products"],
    },
  };
  const res = createMockRes();

  await assert.rejects(
    staffController.sendStaffInvitation(req, res),
    (err) => err.statusCode === 403 && /Store is suspended/.test(err.message)
  );
});
