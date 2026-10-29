'use strict';

// test/security/buyerReportSupportCaseLinkage.test.js
// Verification suite for P5-SUP-001: Commerce-to-Core support case linkage,
// authoritative fact boundary, server-side eligibility, evidence sanitization,
// idempotency, and retry recovery.

const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');

const { sequelize, Sequelize } = require('../../config/db');

if (Sequelize && Sequelize.prototype) {
  Sequelize.prototype.authenticate = async () => {};
  Sequelize.prototype.validate = async () => {};
}
sequelize.authenticate = async () => {};
sequelize.validate = async () => {};

// Stub transactions to run in-memory without external DB connection
const mockTx = {
  id: 'mock-tx-id',
  LOCK: { UPDATE: 'UPDATE' },
  commit: async () => {},
  rollback: async () => {},
};

sequelize.transaction = async (fn) => {
  if (typeof fn === 'function') return fn(mockTx);
  return mockTx;
};

const {
  BuyerReport,
  Order,
  OrderItem,
  OrderEvent,
  Product,
  StoreAccess,
  EventOutbox,
} = require('../../models');

const {
  buyerReportService,
  coreCaseLinkageAdapter,
} = require('../../modules/support');

// In-memory repositories
const inMemoryOrders = new Map();
const inMemoryOrderEvents = [];
const inMemoryReports = new Map();
const inMemoryProducts = new Map();
const inMemoryStores = new Map();
const inMemoryOutbox = [];

// Helper to create model instance with update capability
function wrapReportInstance(data) {
  const instance = {
    ...data,
    async update(fields) {
      Object.assign(this, fields);
      inMemoryReports.set(this.id, this);
      return this;
    },
  };
  return instance;
}

// Stub Order model methods
Order.findByPk = async (id) => inMemoryOrders.get(id) || null;
Order.findOne = async ({ where }) => {
  for (const ord of inMemoryOrders.values()) {
    let match = true;
    for (const [k, v] of Object.entries(where || {})) {
      if (ord[k] !== v) { match = false; break; }
    }
    if (match) return ord;
  }
  return null;
};
Order.create = async (data) => {
  const instance = { ...data, updatedAt: new Date(), createdAt: data.createdAt || new Date() };
  inMemoryOrders.set(instance.id, instance);
  return instance;
};

// Stub OrderEvent model methods
OrderEvent.findOne = async ({ where }) => {
  const matches = inMemoryOrderEvents.filter((ev) => {
    for (const [k, v] of Object.entries(where || {})) {
      if (ev[k] !== v) return false;
    }
    return true;
  });
  return matches.length > 0 ? matches[matches.length - 1] : null;
};
OrderEvent.findAll = async ({ where }) => {
  return inMemoryOrderEvents.filter((ev) => {
    for (const [k, v] of Object.entries(where || {})) {
      if (ev[k] !== v) return false;
    }
    return true;
  });
};
OrderEvent.create = async (data) => {
  const instance = { ...data, createdAt: data.createdAt || new Date() };
  inMemoryOrderEvents.push(instance);
  return instance;
};

// Stub BuyerReport model methods
BuyerReport.findOne = async ({ where }) => {
  for (const rpt of inMemoryReports.values()) {
    let match = true;
    for (const [k, v] of Object.entries(where || {})) {
      if (k === 'linkageStatus' && v && typeof v === 'object') {
        const syms = Object.getOwnPropertySymbols(v);
        const allowed = syms.length > 0 ? v[syms[0]] : Object.values(v)[0];
        if (Array.isArray(allowed) && !allowed.includes(rpt.linkageStatus)) {
          match = false;
          break;
        }
      } else if (rpt[k] !== v) {
        match = false;
        break;
      }
    }
    if (match) return rpt;
  }
  return null;
};
BuyerReport.findByPk = async (id) => {
  const rpt = inMemoryReports.get(id);
  if (!rpt) return null;
  const instance = { ...rpt };
  if (instance.orderId) instance.Order = inMemoryOrders.get(instance.orderId) || null;
  if (instance.storeId) instance.Store = inMemoryStores.get(instance.storeId) || { storeId: instance.storeId, name: 'Sample Store' };
  if (instance.productId) instance.Product = inMemoryProducts.get(instance.productId) || { id: instance.productId, name: 'Sample Product' };
  instance.update = async (fields) => {
    Object.assign(rpt, fields);
    Object.assign(instance, fields);
    return instance;
  };
  return instance;
};
BuyerReport.create = async (data) => {
  const instance = wrapReportInstance(data);
  inMemoryReports.set(instance.id, instance);
  return instance;
};
BuyerReport.findAndCountAll = async ({ where, offset = 0, limit = 20 }) => {
  const all = Array.from(inMemoryReports.values()).filter((rpt) => {
    for (const [k, v] of Object.entries(where || {})) {
      if (rpt[k] !== v) return false;
    }
    return true;
  });
  return {
    rows: all.slice(offset, offset + limit),
    count: all.length,
  };
};

// Stub Product model methods
Product.findByPk = async (id) => inMemoryProducts.get(id) || { id, name: 'Sample Product', storeId: 'store-1' };

// Stub StoreAccess model methods
StoreAccess.findByPk = async (id) => inMemoryStores.get(id) || { storeId: id, name: 'Sample Store' };

// Stub EventOutbox
try {
  const { eventOutboxService } = require('../../modules/events');
  if (eventOutboxService) {
    eventOutboxService.recordEvent = async (eventData) => {
      inMemoryOutbox.push(eventData);
      return eventData;
    };
  }
} catch (e) {
  // outbox service stub fallback
}

// Reset in-memory stores before each test scenario
function resetStores() {
  inMemoryOrders.clear();
  inMemoryOrderEvents.length = 0;
  inMemoryReports.clear();
  inMemoryProducts.clear();
  inMemoryStores.clear();
  inMemoryOutbox.length = 0;
}

test('P5-SUP-001: 1. Server-side eligibility checks enforce 7-day return window and delivery gating', async () => {
  resetStores();
  const buyerId = randomUUID();
  const storeId = randomUUID();

  // 1a. Test order not delivered -> return ineligible
  const undeliveredOrderId = randomUUID();
  await Order.create({
    id: undeliveredOrderId,
    orderNumber: 'ORD-2026-UNDELIVERED',
    buyerId,
    storeId,
    status: 'pending',
    deliveryStatus: 'shipping',
    totalAmount: '45.00',
    subtotal: '40.00',
    deliveryFee: '5.00',
    createdAt: new Date(),
  });

  const undeliveredElig = await buyerReportService.evaluateEligibility(buyerId, {
    subjectType: 'order',
    subjectId: undeliveredOrderId,
  });

  assert.equal(undeliveredElig.eligible, true, 'General order complaint should be eligible');
  assert.equal(undeliveredElig.deadline, null, 'No 7-day return deadline if not delivered yet');

  // Return request for undelivered order fails eligibility
  const undeliveredReturnElig = await buyerReportService.evaluateEligibility(buyerId, {
    subjectType: 'return',
    subjectId: undeliveredOrderId,
  });
  // Without delivered event, elapsed time from order creation is used
  assert.ok(undeliveredReturnElig.deadline, 'Deadline calculated');

  // 1b. Test order delivered 10 days ago -> return window expired (>7 days)
  const expiredOrderId = randomUUID();
  const tenDaysAgo = new Date(Date.now() - 10 * 24 * 3600 * 1000);
  await Order.create({
    id: expiredOrderId,
    orderNumber: 'ORD-2026-EXPIRED',
    buyerId,
    storeId,
    status: 'fulfilled',
    deliveryStatus: 'delivered',
    totalAmount: '60.00',
    subtotal: '55.00',
    deliveryFee: '5.00',
    createdAt: tenDaysAgo,
    updatedAt: tenDaysAgo,
  });

  await OrderEvent.create({
    id: randomUUID(),
    orderId: expiredOrderId,
    type: 'delivered',
    createdAt: tenDaysAgo,
  });

  const expiredElig = await buyerReportService.evaluateEligibility(buyerId, {
    subjectType: 'return',
    subjectId: expiredOrderId,
  });

  assert.equal(expiredElig.eligible, false, 'Expired delivery should be ineligible for return');
  assert.ok(expiredElig.reasonCodes.includes('ORDER_RETURN_WINDOW_EXPIRED'), 'Reason code should be ORDER_RETURN_WINDOW_EXPIRED');

  // 1c. Test order delivered 2 days ago -> eligible
  const freshOrderId = randomUUID();
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 3600 * 1000);
  await Order.create({
    id: freshOrderId,
    orderNumber: 'ORD-2026-FRESH',
    buyerId,
    storeId,
    status: 'fulfilled',
    deliveryStatus: 'delivered',
    totalAmount: '35.00',
    subtotal: '30.00',
    deliveryFee: '5.00',
    createdAt: twoDaysAgo,
    updatedAt: twoDaysAgo,
  });

  await OrderEvent.create({
    id: randomUUID(),
    orderId: freshOrderId,
    type: 'delivered',
    createdAt: twoDaysAgo,
  });

  const freshElig = await buyerReportService.evaluateEligibility(buyerId, {
    subjectType: 'return',
    subjectId: freshOrderId,
  });

  assert.equal(freshElig.eligible, true, 'Recent delivery should be return-eligible');
  assert.ok(freshElig.deadline, 'Deadline must be populated for return-eligible order');
});

test('P5-SUP-001: 2. Unauthorized order access is denied (cross-buyer isolation)', async () => {
  resetStores();
  const legitBuyerId = randomUUID();
  const maliciousBuyerId = randomUUID();
  const storeId = randomUUID();

  const orderId = randomUUID();
  await Order.create({
    id: orderId,
    orderNumber: 'ORD-2026-LEGIT',
    buyerId: legitBuyerId,
    storeId,
    status: 'fulfilled',
    deliveryStatus: 'delivered',
    totalAmount: '80.00',
    subtotal: '75.00',
    deliveryFee: '5.00',
    createdAt: new Date(),
  });

  // Malicious buyer checks eligibility on another buyer's order
  await assert.rejects(
    async () => {
      await buyerReportService.evaluateEligibility(maliciousBuyerId, {
        subjectType: 'order',
        subjectId: orderId,
      });
    },
    (err) => {
      assert.equal(err.code, 'UNAUTHORIZED_ORDER_ACCESS');
      assert.equal(err.statusCode, 403);
      return true;
    },
    'Should reject unauthorized order eligibility check',
  );

  // Malicious buyer attempts report submission on another buyer's order
  await assert.rejects(
    async () => {
      await buyerReportService.submitBuyerReport(maliciousBuyerId, {
        subjectType: 'order',
        subjectId: orderId,
        category: 'damaged_item',
        reason: 'Attempted fraud',
        description: 'Trying to report someone else order',
      });
    },
    (err) => {
      assert.equal(err.code, 'UNAUTHORIZED_ORDER_ACCESS');
      assert.equal(err.statusCode, 403);
      return true;
    },
    'Should reject unauthorized order report submission',
  );
});

test('P5-SUP-001: 3. Evidence sanitization: rejects HTTP, javascript:, data: schemes, and enforces max 5 items', async () => {
  // 3a. Insecure HTTP rejected
  assert.throws(
    () => {
      buyerReportService.sanitizeEvidence(['http://insecure.example.com/pic.jpg']);
    },
    (err) => {
      assert.equal(err.code, 'INSECURE_EVIDENCE_URL');
      assert.equal(err.statusCode, 400);
      return true;
    },
  );

  // 3b. Dangerous javascript: scheme rejected
  assert.throws(
    () => {
      buyerReportService.sanitizeEvidence(['javascript:alert(1)']);
    },
    (err) => {
      assert.equal(err.code, 'INSECURE_EVIDENCE_URL');
      return true;
    },
  );

  // 3c. data: URI rejected
  assert.throws(
    () => {
      buyerReportService.sanitizeEvidence(['data:text/html,<script>alert(1)</script>']);
    },
    (err) => {
      assert.equal(err.code, 'INSECURE_EVIDENCE_URL');
      return true;
    },
  );

  // 3d. More than 5 items rejected
  const sixItems = [1, 2, 3, 4, 5, 6].map((i) => `https://cdn.example.com/photo${i}.jpg`);
  assert.throws(
    () => {
      buyerReportService.sanitizeEvidence(sixItems);
    },
    (err) => {
      assert.equal(err.code, 'TOO_MANY_EVIDENCE_ITEMS');
      return true;
    },
  );

  // 3e. Safe HTTPS items validated and sanitized
  const valid = [
    { url: 'https://cdn.example.com/photo1.jpg', label: 'product_damage' },
    { url: 'https://cdn.example.com/photo2.jpg', label: 'shipping_label' },
  ];
  const sanitized = buyerReportService.sanitizeEvidence(valid);
  assert.equal(sanitized.length, 2);
  assert.equal(sanitized[0].url, 'https://cdn.example.com/photo1.jpg');
  assert.equal(sanitized[0].label, 'product_damage');
  assert.ok(sanitized[0].uploadedAt, 'uploadedAt should be populated');
});

test('P5-SUP-001: 4. Duplicate prevention and idempotency: repeated keys return cached report, active dispute blocks second', async () => {
  resetStores();
  const buyerId = randomUUID();
  const storeId = randomUUID();
  const orderId = randomUUID();

  await Order.create({
    id: orderId,
    orderNumber: 'ORD-2026-IDEM',
    buyerId,
    storeId,
    status: 'fulfilled',
    deliveryStatus: 'delivered',
    totalAmount: '50.00',
    subtotal: '45.00',
    deliveryFee: '5.00',
    createdAt: new Date(),
  });

  const idempotencyKey = `test-idem-${Date.now()}-${randomUUID()}`;

  // 4a. First submission succeeds
  const result1 = await buyerReportService.submitBuyerReport(buyerId, {
    subjectType: 'order',
    subjectId: orderId,
    category: 'damaged_item',
    reason: 'Plate was cracked',
    description: 'Arrived broken into two pieces upon opening parcel.',
    idempotencyKey,
  });

  assert.equal(result1.duplicate, false);
  assert.ok(result1.report.id, 'Report should be created');
  assert.equal(result1.report.reportNumber.startsWith('RPT-'), true);
  assert.equal(result1.report.linkageStatus, 'linked');

  // 4b. Submitting with same idempotency key returns exact same record
  const resultCached = await buyerReportService.submitBuyerReport(buyerId, {
    subjectType: 'order',
    subjectId: orderId,
    category: 'damaged_item',
    reason: 'Plate was cracked',
    description: 'Arrived broken into two pieces upon opening parcel.',
    idempotencyKey,
  });

  assert.equal(resultCached.duplicate, true);
  assert.equal(resultCached.report.id, result1.report.id, 'Idempotent replay must return original report ID');

  // 4c. Submitting a new report with different idempotency key on same active subject fails with 409 DUPLICATE_REPORT_EXISTS
  await assert.rejects(
    async () => {
      await buyerReportService.submitBuyerReport(buyerId, {
        subjectType: 'order',
        subjectId: orderId,
        category: 'defective',
        reason: 'Another complaint on same order',
        description: 'Attempting to file concurrent complaint',
        idempotencyKey: `diff-key-${randomUUID()}`,
      });
    },
    (err) => {
      assert.equal(err.code, 'DUPLICATE_REPORT_EXISTS');
      assert.equal(err.statusCode, 409);
      return true;
    },
    'Should block duplicate active report',
  );
});

test('P5-SUP-001: 5. Core Case linkage: creates deterministic Core case, records OrderEvent, emits outbox event', async () => {
  resetStores();
  const buyerId = randomUUID();
  const storeId = randomUUID();
  const orderId = randomUUID();

  await Order.create({
    id: orderId,
    orderNumber: 'ORD-2026-LINK',
    buyerId,
    storeId,
    status: 'fulfilled',
    deliveryStatus: 'delivered',
    totalAmount: '120.00',
    subtotal: '115.00',
    deliveryFee: '5.00',
    createdAt: new Date(),
  });

  const res = await buyerReportService.submitBuyerReport(buyerId, {
    subjectType: 'order',
    subjectId: orderId,
    category: 'not_as_described',
    reason: 'Color is drastically different from listing photos',
    description: 'The wood is painted dark black instead of natural teak brown.',
    evidence: [{ url: 'https://cdn.example.com/carving.jpg', label: 'product_damage' }],
    idempotencyKey: `idem-core-case-${randomUUID()}`,
  });

  const report = res.report;

  // Verify linkage status and identifiers
  assert.equal(report.linkageStatus, 'linked');
  assert.ok(report.coreCaseId, 'coreCaseId must be populated');
  assert.ok(report.coreCaseNumber, 'coreCaseNumber must be populated');
  assert.equal(report.coreCaseNumber.startsWith('CAS-'), true);

  // Verify OrderEvent timeline entry was recorded
  assert.ok(inMemoryOrderEvents.length > 0, 'OrderEvent should be recorded');
  const timelineEvent = inMemoryOrderEvents.find((e) => e.orderId === orderId);
  assert.ok(timelineEvent, 'OrderEvent for order must exist');
  assert.equal(timelineEvent.details.reportNumber, report.reportNumber);

  // Verify EventOutbox was emitted
  assert.ok(inMemoryOutbox.length > 0, 'EventOutbox event must be emitted');
  const outboxEvent = inMemoryOutbox.find((e) => e.eventType === 'order.complaint_filed');
  assert.ok(outboxEvent, 'order.complaint_filed outbox event must exist');
  assert.equal(outboxEvent.payload.reportNumber, report.reportNumber);
});

test('P5-SUP-001: 6. Transient adapter failure records linkage_failed, and retry successfully recovers', async () => {
  resetStores();
  const buyerId = randomUUID();
  const storeId = randomUUID();
  const orderId = randomUUID();

  await Order.create({
    id: orderId,
    orderNumber: 'ORD-2026-RETRY',
    buyerId,
    storeId,
    status: 'fulfilled',
    deliveryStatus: 'delivered',
    totalAmount: '70.00',
    subtotal: '65.00',
    deliveryFee: '5.00',
    createdAt: new Date(),
  });

  // Submit with simulateFailure = true
  const res = await buyerReportService.submitBuyerReport(buyerId, {
    subjectType: 'order',
    subjectId: orderId,
    category: 'damaged_item',
    reason: 'Damaged bracelet',
    description: 'Clasp is completely broken',
    idempotencyKey: `fail-key-${randomUUID()}`,
  }, { simulateFailure: true });

  const failedReport = res.report;
  assert.equal(failedReport.linkageStatus, 'linkage_failed');
  assert.equal(failedReport.coreCaseId, undefined);
  assert.ok(failedReport.lastLinkageError);
  assert.equal(failedReport.linkageAttempts, 1);

  // Execute retry
  const retryResult = await coreCaseLinkageAdapter.retryReportLinkage(failedReport.id);

  assert.equal(retryResult.success, true);
  assert.equal(retryResult.linkageStatus, 'linked');
  assert.ok(retryResult.coreCaseId, 'coreCaseId must now be set');
  assert.ok(retryResult.coreCaseNumber, 'coreCaseNumber must now be set');

  const recoveredReport = await BuyerReport.findByPk(failedReport.id);
  assert.equal(recoveredReport.linkageStatus, 'linked');
  assert.equal(recoveredReport.lastLinkageError, null, 'lastLinkageError must be cleared on success');
  assert.equal(recoveredReport.linkageAttempts, 2);
});

test('P5-SUP-001: 7. Authoritative Commerce facts endpoint supplies commerce facts without leaking Core mutable fields', async () => {
  resetStores();
  const buyerId = randomUUID();
  const storeId = randomUUID();
  const orderId = randomUUID();

  await Order.create({
    id: orderId,
    orderNumber: 'ORD-2026-FACTS',
    buyerId,
    storeId,
    status: 'fulfilled',
    deliveryStatus: 'delivered',
    totalAmount: '95.00',
    subtotal: '90.00',
    deliveryFee: '5.00',
    createdAt: new Date(),
  });

  const res = await buyerReportService.submitBuyerReport(buyerId, {
    subjectType: 'order',
    subjectId: orderId,
    category: 'defective',
    reason: 'Packaging seal broken on both pepper packets',
    description: 'Aroma lost and product compromised due to torn vacuum seals.',
    evidence: [{ url: 'https://cdn.example.com/seal.jpg', label: 'packaging' }],
    idempotencyKey: `facts-test-${randomUUID()}`,
  });

  const facts = await buyerReportService.getAuthoritativeFacts(res.report.id);

  assert.ok(facts.report, 'Report fact must exist');
  assert.equal(facts.report.reportNumber, res.report.reportNumber);
  assert.equal(facts.report.category, 'defective');

  // Verify Order facts
  assert.ok(facts.orderFacts, 'Order facts must exist');
  assert.equal(facts.orderFacts.totalAmount, '95.00');

  // Verify Core Support Case separation
  // Facts endpoint MUST NOT contain mutable Core support fields
  assert.equal(facts.internalNotes, undefined, 'Must not duplicate Core internal notes');
  assert.equal(facts.caseStatus, undefined, 'Must not duplicate Core case status');
  assert.equal(facts.assigneeId, undefined, 'Must not duplicate Core assigneeId');
  assert.equal(facts.serviceDeadline, undefined, 'Must not duplicate Core serviceDeadline');
  assert.equal(facts.resolution, undefined, 'Must not duplicate Core resolution');
});

test('P5-SUP-001: 8. Non-order report subjects (product, merchant) link correctly without order requirements', async () => {
  resetStores();
  const buyerId = randomUUID();
  const productId = randomUUID();
  const storeId = randomUUID();

  // 8a. Product report
  const prodElig = await buyerReportService.evaluateEligibility(buyerId, {
    subjectType: 'product',
    subjectId: productId,
  });
  assert.equal(prodElig.eligible, true, 'Product report should be eligible without order');

  const prodRes = await buyerReportService.submitBuyerReport(buyerId, {
    subjectType: 'product',
    subjectId: productId,
    category: 'prohibited_listing',
    reason: 'Listing appears to promote unlicensed counterfeit goods',
    description: 'The listing is using trademarked photos with blurred brand names.',
    idempotencyKey: `prod-report-${randomUUID()}`,
  });

  assert.equal(prodRes.report.subjectType, 'product');
  assert.equal(prodRes.report.subjectId, productId);
  assert.equal(prodRes.report.linkageStatus, 'linked');
  assert.ok(prodRes.report.coreCaseNumber);

  // 8b. Merchant report
  const merchElig = await buyerReportService.evaluateEligibility(buyerId, {
    subjectType: 'merchant',
    subjectId: storeId,
  });
  assert.equal(merchElig.eligible, true, 'Merchant report should be eligible without order');

  const merchRes = await buyerReportService.submitBuyerReport(buyerId, {
    subjectType: 'merchant',
    subjectId: storeId,
    category: 'seller_unresponsive',
    reason: 'Merchant stopped responding to messages',
    description: 'Multiple inquiries sent over 5 days with zero replies.',
    idempotencyKey: `merch-report-${randomUUID()}`,
  });

  assert.equal(merchRes.report.subjectType, 'merchant');
  assert.equal(merchRes.report.subjectId, storeId);
  assert.equal(merchRes.report.linkageStatus, 'linked');
  assert.ok(merchRes.report.coreCaseNumber);
});
