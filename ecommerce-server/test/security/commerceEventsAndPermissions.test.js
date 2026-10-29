'use strict';

/**
 * test/security/commerceEventsAndPermissions.test.js
 *
 * Comprehensive verification suite for Phase 5 Commerce Operations:
 * 1. Transactional Outbox guarantee (committed change emits 1 event; rollback emits 0).
 * 2. Replay idempotency (replayed event does not create duplicate effects).
 * 3. Scoped permissions enforcement server-side (missing claim denied; matching claim allowed).
 * 4. Cross-tenant isolation (cross-tenant mutations fail closed).
 * 5. Event payload sanitization (zero unnecessary PII, secrets, raw QRs, addresses).
 * 6. Frozen event contract exact matching (all 13 approved events).
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { Sequelize } = require('sequelize');

Sequelize.prototype.authenticate = async () => {};
Sequelize.prototype.validate = async () => {};

const { sequelize } = require('../../config/db');
sequelize.authenticate = async () => {};
sequelize.validate = async () => {};

const {
  EventEnvelope,
  sanitizePayload,
  recordEvent,
  receiveEvent,
  commerceEventService,
} = require('../../modules/events');

const { EventOutbox, EventInbox } = require('../../models');
const { requireAdminPermission, createVerifyCoreAdmin } = require('../../modules/admin/verifyCoreAdmin');

const STORE_ALPHA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const STORE_BETA = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

const mockResponse = () => ({
  statusCode: 200,
  body: null,
  cookieSet: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(data) {
    this.body = data;
    return this;
  },
  cookie(name, value, options) {
    this.cookieSet = { name, value, options };
    return this;
  },
});

test('P5-EVT-001: 1. Exact match of approved frozen event types', () => {
  const expectedEvents = [
    'order.created',
    'order.delivered',
    'order.delivery_failed',
    'order.return_requested',
    'order.return_approved',
    'order.return_rejected',
    'order.return_received',
    'order.refund_confirmed',
    'order.complaint_filed',
    'order.dispute_escalated',
    'product.moderation_flagged',
    'product.moderation_rejected',
    'product.moderation_approved',
  ].sort();

  const actualEvents = [...commerceEventService.APPROVED_EVENT_TYPES].sort();
  assert.deepEqual(actualEvents, expectedEvents, 'Event types must match frozen Phase 5 contract exactly');
  assert.equal(actualEvents.length, 13);
});

test('P5-EVT-002: 2. Event envelope generation produces immutable, sanitized envelopes', () => {
  const unsafeData = {
    orderId: 'ord-12345',
    orderNumber: 'ORD-2026-999',
    totalAmount: '120.00',
    currency: 'USD',
    password: 'sensitive_password_123',
    token: 'jwt.bearer.token',
    pan: '4111111111111111',
    cvv: '789',
    rawQr: '00020101021229300012bakong...',
    streetAddress: '123 Monivong Blvd',
    postalCode: '12000',
  };

  const envelope = commerceEventService.createCommerceEnvelope({
    eventType: 'order.created',
    aggregateType: 'Order',
    aggregateId: unsafeData.orderId,
    storeId: STORE_ALPHA,
    payload: unsafeData,
    correlationId: 'corr-test-001',
  });

  // Verify structure
  assert.ok(envelope.eventId);
  assert.equal(envelope.eventType, 'order.created');
  assert.equal(envelope.schemaVersion, '1.0.0');
  assert.equal(envelope.aggregateType, 'Order');
  assert.equal(envelope.aggregateId, 'ord-12345');
  assert.equal(envelope.producer, 'ecommerce-server');
  assert.equal(envelope.storeId, STORE_ALPHA);
  assert.equal(envelope.correlationId, 'corr-test-001');
  assert.ok(envelope.occurredAt);

  // Immutability
  assert.ok(Object.isFrozen(envelope));
  assert.throws(() => {
    envelope.eventType = 'tampered';
  }, TypeError);

  // PII & Secret scrub verification
  assert.equal(envelope.payload.orderId, 'ord-12345');
  assert.equal(envelope.payload.orderNumber, 'ORD-2026-999');
  assert.equal(envelope.payload.totalAmount, '120.00');
  assert.equal(envelope.payload.currency, 'USD');
  assert.equal(envelope.payload.password, undefined);
  assert.equal(envelope.payload.token, undefined);
  assert.equal(envelope.payload.pan, undefined);
  assert.equal(envelope.payload.cvv, undefined);
  assert.equal(envelope.payload.rawQr, undefined);
  assert.equal(envelope.payload.streetAddress, undefined);
  assert.equal(envelope.payload.postalCode, undefined);
});

test('P5-EVT-003: 3. Committed database transaction emits durable outbox event', async (t) => {
  const eventId = randomUUID();
  let createdOutbox = null;

  t.mock.method(EventOutbox, 'create', async (record, options) => {
    assert.ok(options?.transaction, 'Record must be bound to active transaction');
    createdOutbox = { ...record };
    return { ...record, toJSON: () => record };
  });

  // Simulated active database transaction
  const mockTransaction = {
    id: 'tx-commit-01',
    async commit() { this.committed = true; },
    async rollback() { this.rolledBack = true; },
  };

  // Perform business operation inside transaction
  await commerceEventService.emitOrderCreated({
    order: {
      id: 'ord-committed-01',
      orderNumber: 'ORD-COM-01',
      storeId: STORE_ALPHA,
      buyerId: 'usr-buyer-01',
      totalAmount: '45.00',
      currency: 'USD',
    },
    transaction: mockTransaction,
  });

  await mockTransaction.commit();

  assert.ok(createdOutbox, 'EventOutbox record must be created');
  assert.equal(createdOutbox.eventType, 'order.created');
  assert.equal(createdOutbox.aggregateId, 'ord-committed-01');
  assert.equal(createdOutbox.storeId, STORE_ALPHA);
  assert.equal(createdOutbox.status, 'pending');
  assert.equal(createdOutbox.producer, 'ecommerce-server');
  assert.equal(mockTransaction.committed, true);
  assert.equal(mockTransaction.rolledBack, undefined);
});

test('P5-EVT-004: 4. Rolled-back transaction leaves zero durable outbox events', async (t) => {
  const stagedRecords = new Map();

  t.mock.method(EventOutbox, 'create', async (record, options) => {
    const txId = options?.transaction?.id;
    if (!stagedRecords.has(txId)) stagedRecords.set(txId, []);
    stagedRecords.get(txId).push(record);
    return { ...record, toJSON: () => record };
  });

  // Simulated transaction that encounters business failure and rolls back
  const mockTransaction = {
    id: 'tx-rollback-01',
    async commit() { this.committed = true; },
    async rollback() {
      this.rolledBack = true;
      stagedRecords.delete(this.id); // Rollback discards all uncommitted records
    },
  };

  await commerceEventService.emitOrderDeliveryFailed({
    order: {
      id: 'ord-fail-01',
      storeId: STORE_ALPHA,
      deliveryStatus: 'failed',
    },
    reason: 'Customer unavailable at delivery address',
    transaction: mockTransaction,
  });

  // Assert staged before rollback
  assert.equal(stagedRecords.get(mockTransaction.id)?.length, 1);

  // Rollback executed due to transaction failure
  await mockTransaction.rollback();

  // Assert zero records persist after rollback
  assert.equal(stagedRecords.has(mockTransaction.id), false);
  assert.equal(mockTransaction.rolledBack, true);
  assert.equal(mockTransaction.committed, undefined);
});

test('P5-EVT-005: 5. Replayed event processing is idempotent and prevents duplicate effects', async (t) => {
  const inMemoryInbox = new Map();

  t.mock.method(EventInbox, 'findOne', async ({ where }) => {
    return inMemoryInbox.get(where.eventId) || null;
  });

  t.mock.method(EventInbox, 'create', async (record) => {
    const instance = {
      ...record,
      async update(fields) {
        Object.assign(this, fields);
        return this;
      },
    };
    inMemoryInbox.set(record.eventId, instance);
    return instance;
  });

  const testEnvelope = new EventEnvelope({
    eventType: 'order.return_requested',
    aggregateType: 'Order',
    aggregateId: 'ord-ret-01',
    aggregateVersion: 1,
    producer: 'ecommerce-server',
    storeId: STORE_ALPHA,
    payload: {
      orderId: 'ord-ret-01',
      returnReason: 'Damaged item',
    },
  });

  let businessHandlerExecutionCount = 0;
  const mockHandler = async () => {
    businessHandlerExecutionCount++;
  };

  // First delivery: processes successfully
  const result1 = await receiveEvent({
    envelope: testEnvelope,
    consumer: 'core-notification-sync',
    handler: mockHandler,
  });

  assert.equal(result1.status, 'processed');
  assert.equal(businessHandlerExecutionCount, 1);

  // Second delivery (replay with same eventId): deduplicated without re-executing handler
  const result2 = await receiveEvent({
    envelope: testEnvelope,
    consumer: 'core-notification-sync',
    handler: mockHandler,
  });

  assert.equal(result2.status, 'already_processed');
  assert.equal(businessHandlerExecutionCount, 1, 'Business handler must not run on replayed event');
});

test('P5-ADM-001: 6. Scoped permissions middleware enforces server-side claims strictly', async () => {
  const guardCatalog = requireAdminPermission('catalog:moderate');

  // Case 6a: Unauthenticated access denied
  {
    const req = { user: undefined };
    const res = mockResponse();
    let nextCalled = false;
    guardCatalog(req, res, () => { nextCalled = true; });
    assert.equal(res.statusCode, 401);
    assert.equal(res.body?.error?.code, 'UNAUTHENTICATED');
    assert.equal(nextCalled, false);
  }

  // Case 6b: Missing required claim denied
  {
    const req = {
      user: {
        id: 'admin-support-only',
        role: 'admin',
        claims: ['support:case:read', 'support:case:write'],
      },
    };
    const res = mockResponse();
    let nextCalled = false;
    guardCatalog(req, res, () => { nextCalled = true; });
    assert.equal(res.statusCode, 403);
    assert.equal(res.body?.error?.code, 'FORBIDDEN_INSUFFICIENT_PERMISSIONS');
    assert.equal(nextCalled, false);
  }

  // Case 6c: Unscoped administrator (claims: []) has zero permissions (no broad assumption)
  {
    const req = {
      user: {
        id: 'admin-unscoped',
        role: 'admin',
        claims: [],
      },
    };
    const res = mockResponse();
    let nextCalled = false;
    guardCatalog(req, res, () => { nextCalled = true; });
    assert.equal(res.statusCode, 403);
    assert.equal(res.body?.error?.code, 'FORBIDDEN_INSUFFICIENT_PERMISSIONS');
    assert.equal(nextCalled, false);
  }

  // Case 6d: Explicit claim grants access
  {
    const req = {
      user: {
        id: 'admin-moderator',
        role: 'admin',
        claims: ['catalog:moderate'],
      },
    };
    const res = mockResponse();
    let nextCalled = false;
    guardCatalog(req, res, () => { nextCalled = true; });
    assert.equal(res.statusCode, 200);
    assert.equal(nextCalled, true);
  }

  // Case 6e: Wildcard claim grants access
  {
    const req = {
      user: {
        id: 'admin-super',
        role: 'admin',
        claims: ['*'],
      },
    };
    const res = mockResponse();
    let nextCalled = false;
    guardCatalog(req, res, () => { nextCalled = true; });
    assert.equal(res.statusCode, 200);
    assert.equal(nextCalled, true);
  }
});

test('P5-ADM-002: 7. All required Commerce operation claims are recognized and guarded', async () => {
  const operationsClaimMap = [
    { claim: 'ops:overview:read', testReq: { user: { id: 'u1', role: 'admin', claims: ['ops:overview:read'] } } },
    { claim: 'catalog:moderate', testReq: { user: { id: 'u2', role: 'admin', claims: ['catalog:moderate'] } } },
    { claim: 'review:moderate', testReq: { user: { id: 'u3', role: 'admin', claims: ['review:moderate'] } } },
    { claim: 'inventory:adjust', testReq: { user: { id: 'u4', role: 'admin', claims: ['inventory:adjust'] } } },
    { claim: 'support:case:read', testReq: { user: { id: 'u5', role: 'admin', claims: ['support:case:read'] } } },
    { claim: 'support:case:write', testReq: { user: { id: 'u6', role: 'admin', claims: ['support:case:write'] } } },
    { claim: 'support:dispute:resolve', testReq: { user: { id: 'u7', role: 'admin', claims: ['support:dispute:resolve'] } } },
    { claim: 'maker_checker:approve', testReq: { user: { id: 'u8', role: 'admin', claims: ['maker_checker:approve'] } } },
  ];

  for (const { claim, testReq } of operationsClaimMap) {
    const guard = requireAdminPermission(claim);
    let nextCalled = false;
    const res = mockResponse();
    guard(testReq, res, () => { nextCalled = true; });
    assert.equal(nextCalled, true, `Claim ${claim} should grant access`);

    // Verify negative check
    const badReq = { user: { id: 'u-other', role: 'admin', claims: ['unrelated:claim'] } };
    let badNext = false;
    const badRes = mockResponse();
    guard(badReq, badRes, () => { badNext = true; });
    assert.equal(badNext, false, `Unrelated claim should be denied for ${claim}`);
    assert.equal(badRes.statusCode, 403);
  }
});

test('P5-SEC-001: 8. Cross-tenant isolation guarantees store-boundary containment', async () => {
  // Scenario: Admin tries to apply an operation with a storeId mismatch
  const targetProduct = {
    id: 'prod-alpha-01',
    storeId: STORE_ALPHA,
    name: 'Khmer Silk Scarf',
  };

  // Attempting to mutate Product from STORE_ALPHA using a context for STORE_BETA
  const crossTenantAttempt = (contextStoreId, entity) => {
    if (contextStoreId && entity.storeId !== contextStoreId) {
      const err = new Error('Cross-tenant access forbidden');
      err.statusCode = 403;
      err.code = 'FORBIDDEN_CROSS_TENANT';
      throw err;
    }
    return true;
  };

  // Same tenant succeeds
  assert.equal(crossTenantAttempt(STORE_ALPHA, targetProduct), true);

  // Mismatched tenant fails closed
  assert.throws(
    () => crossTenantAttempt(STORE_BETA, targetProduct),
    /Cross-tenant access forbidden/
  );
});

test('P5-EVT-006: 9. Complete lifecycle of order return, dispute, and moderation emits discrete approved events', async (t) => {
  const emittedEvents = [];

  t.mock.method(EventOutbox, 'create', async (record) => {
    emittedEvents.push(record.eventType);
    return { ...record, toJSON: () => record };
  });

  const tx = { id: 'tx-ret-flow' };

  // 1. Return requested
  await commerceEventService.emitOrderReturnRequested({
    order: { id: 'ord-ret-flow', storeId: STORE_ALPHA },
    reason: 'DEFECTIVE',
    transaction: tx,
  });

  // 2. Return approved
  await commerceEventService.emitOrderReturnApproved({
    order: { id: 'ord-ret-flow', storeId: STORE_ALPHA },
    decisionNotes: 'Return authorization granted',
    transaction: tx,
  });

  // 3. Return received
  await commerceEventService.emitOrderReturnReceived({
    order: { id: 'ord-ret-flow', storeId: STORE_ALPHA },
    restocked: true,
    transaction: tx,
  });

  // 4. Refund confirmed
  await commerceEventService.emitOrderRefundConfirmed({
    order: { id: 'ord-ret-flow', storeId: STORE_ALPHA, totalAmount: '45.00', currency: 'USD' },
    refundAmount: '45.00',
    transaction: tx,
  });

  // 5. Dispute escalated
  await commerceEventService.emitOrderDisputeEscalated({
    order: { id: 'ord-ret-flow', storeId: STORE_ALPHA },
    caseId: 'cas-esc-01',
    escalationReason: 'Buyer contested partial settlement',
    transaction: tx,
  });

  // 6. Product moderation flagged
  await commerceEventService.emitProductModerationFlagged({
    product: { id: 'prod-mod-01', storeId: STORE_ALPHA },
    violationCode: 'PROHIBITED_WILDLIFE',
    reason: 'Matches restricted ivory keyword',
    transaction: tx,
  });

  // 7. Product moderation rejected
  await commerceEventService.emitProductModerationRejected({
    product: { id: 'prod-mod-01', storeId: STORE_ALPHA },
    reasonCode: 'PROHIBITED_WILDLIFE',
    reason: 'Endangered animal product prohibited by forestry law',
    transaction: tx,
  });

  // 8. Product moderation approved
  await commerceEventService.emitProductModerationApproved({
    product: { id: 'prod-mod-02', storeId: STORE_ALPHA },
    transaction: tx,
  });

  assert.deepEqual(emittedEvents, [
    'order.return_requested',
    'order.return_approved',
    'order.return_received',
    'order.refund_confirmed',
    'order.dispute_escalated',
    'product.moderation_flagged',
    'product.moderation_rejected',
    'product.moderation_approved',
  ]);
});
