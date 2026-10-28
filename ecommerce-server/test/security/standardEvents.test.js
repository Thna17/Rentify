'use strict';

// test/security/standardEvents.test.js
// Verification suite for P3-EVT-001: Standard outbox, inbox, and replay operations.

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
  dispatchOutboxEvent,
  dispatchPendingEvents,
  calculateBackoff,
  classifyError,
  receiveEvent,
  replayEvent,
  listDeadLetters,
  getEventDetails,
} = require('../../modules/events');

const { EventOutbox, EventInbox, EventReplayAudit, StoreAccess, StoreDeliveryPolicy } = require('../../models');
const { applyStoreProjectedEvent } = require('../../modules/store-access/storeAccessService');
const migration016 = require('../../migrations/20261025_016_standard_events');

const STORE_A = '11111111-1111-4111-8111-111111111111';

test('P3-EVT-001: 1. EventEnvelope validation, immutability, and defaults', () => {
  // Required field validation
  assert.throws(() => new EventEnvelope({}), /eventType is required/);
  assert.throws(() => new EventEnvelope({ eventType: 'test.event' }), /aggregateType is required/);
  assert.throws(() => new EventEnvelope({ eventType: 'test.event', aggregateType: 'Store' }), /aggregateId is required/);
  assert.throws(() => new EventEnvelope({
    eventType: 'test.event', aggregateType: 'Store', aggregateId: STORE_A, aggregateVersion: -1,
  }), /aggregateVersion must be a positive integer/);
  assert.throws(() => new EventEnvelope({
    eventType: 'test.event', aggregateType: 'Store', aggregateId: STORE_A, aggregateVersion: 1,
  }), /producer is required/);

  // Valid envelope creation
  const event = new EventEnvelope({
    eventType: 'store.projected.v1',
    aggregateType: 'Store',
    aggregateId: STORE_A,
    aggregateVersion: 1,
    producer: 'rentify-server',
    storeId: STORE_A,
    payload: { name: 'Angkor Silk' },
  });

  assert.ok(event.eventId);
  assert.equal(event.eventType, 'store.projected.v1');
  assert.equal(event.schemaVersion, '1.0.0');
  assert.equal(event.aggregateType, 'Store');
  assert.equal(event.aggregateId, STORE_A);
  assert.equal(event.aggregateVersion, 1);
  assert.equal(event.producer, 'rentify-server');
  assert.equal(event.storeId, STORE_A);
  assert.deepEqual(event.payload, { name: 'Angkor Silk' });
  assert.ok(event.occurredAt);
  assert.ok(event.correlationId);

  // Immutability: frozen
  assert.ok(Object.isFrozen(event));
  assert.throws(() => {
    event.eventType = 'tampered.event';
  }, TypeError);
});

test('P3-EVT-001: 2. Payload sanitization: stripping secrets, tokens, raw QRs, and unneeded addresses', () => {
  const unsafePayload = {
    storeName: 'Crafts of Cambodia',
    adminPassword: 'super-secret-password',
    token: 'jwt-access-token-12345',
    apiKey: 'test_api_key_123456',
    clientSecret: 'secret_live_789',
    paymentCredential: {
      pan: '4111111111111111',
      cvv: '123',
    },
    rawQr: '00020101021229300012bakong@nbc...',
    qrPayload: 'qr-raw-string-sensitive',
    streetAddress: 'No 123 Norodom Blvd',
    postalCode: '12000',
    publicDescription: 'Authentic handmade silk and crafts',
  };

  // Default sanitization: sensitive keys AND addresses stripped
  const sanitized = sanitizePayload(unsafePayload);
  assert.equal(sanitized.storeName, 'Crafts of Cambodia');
  assert.equal(sanitized.publicDescription, 'Authentic handmade silk and crafts');
  assert.equal(sanitized.adminPassword, undefined);
  assert.equal(sanitized.token, undefined);
  assert.equal(sanitized.apiKey, undefined);
  assert.equal(sanitized.clientSecret, undefined);
  assert.equal(sanitized.rawQr, undefined);
  assert.equal(sanitized.qrPayload, undefined);
  assert.equal(sanitized.streetAddress, undefined);
  assert.equal(sanitized.postalCode, undefined);
  assert.equal(sanitized.paymentCredential, undefined);

  // With allowAddresses: true, addresses preserved while secrets remain stripped
  const withAddresses = sanitizePayload(unsafePayload, { allowAddresses: true });
  assert.equal(withAddresses.streetAddress, 'No 123 Norodom Blvd');
  assert.equal(withAddresses.postalCode, '12000');
  assert.equal(withAddresses.adminPassword, undefined);
  assert.equal(withAddresses.apiKey, undefined);
});

test('P3-EVT-001: 3. Transactional Outbox write and correlation propagation', async (t) => {
  const correlationId = 'corr-' + randomUUID();
  let createdRecord = null;

  t.mock.method(EventOutbox, 'create', async (data) => {
    createdRecord = data;
    return { ...data, toJSON: () => data };
  });

  const outboxEntry = await recordEvent({
    eventType: 'order.placed.v1',
    aggregateType: 'Order',
    aggregateId: 'ord-123',
    aggregateVersion: 1,
    producer: 'ecommerce-server',
    correlationId,
    storeId: STORE_A,
    payload: { orderNumber: 'ORD-2026-001', amount: 50.0 },
  });

  assert.ok(createdRecord);
  assert.equal(createdRecord.eventType, 'order.placed.v1');
  assert.equal(createdRecord.aggregateType, 'Order');
  assert.equal(createdRecord.aggregateId, 'ord-123');
  assert.equal(createdRecord.correlationId, correlationId);
  assert.equal(createdRecord.status, 'pending');
  assert.equal(createdRecord.attempts, 0);
  assert.equal(createdRecord.maxAttempts, 5);
  assert.ok(createdRecord.nextAttemptAt);
});

test('P3-EVT-001: 4. Outbox dispatch, exponential backoff, and dead-letter state', async (t) => {
  const eventId = randomUUID();
  const mockItem = {
    id: eventId,
    eventId,
    eventType: 'order.placed.v1',
    aggregateVersion: 1,
    correlationId: 'corr-test',
    status: 'pending',
    attempts: 0,
    maxAttempts: 3,
    nextAttemptAt: new Date(),
    payload: { test: true },
    toJSON() { return this; },
    async update(fields) {
      Object.assign(this, fields);
      return this;
    },
  };

  t.mock.method(EventOutbox, 'findOne', async () => mockItem);

  // 4a. Transient failure attempt 1: schedules exponential retry
  let attemptCount = 0;
  const transientDispatcher = async () => {
    attemptCount++;
    const err = new Error('Gateway network timeout');
    err.statusCode = 503;
    throw err;
  };

  const res1 = await dispatchOutboxEvent(eventId, transientDispatcher);
  assert.equal(res1.published, false);
  assert.equal(res1.status, 'pending');
  assert.equal(mockItem.attempts, 1);
  assert.equal(mockItem.errorClassification, 'transient');
  assert.ok(mockItem.nextAttemptAt > new Date());

  // 4b. Transient failure until maxAttempts: moves to dead_letter
  mockItem.attempts = 2; // Next attempt will hit maxAttempts (3)
  const res2 = await dispatchOutboxEvent(eventId, transientDispatcher);
  assert.equal(res2.published, false);
  assert.equal(res2.status, 'dead_letter');
  assert.equal(mockItem.attempts, 3);
  assert.equal(mockItem.status, 'dead_letter');

  // 4c. Successful dispatch: marks published
  mockItem.attempts = 0;
  mockItem.status = 'pending';
  const successDispatcher = async () => ({ ok: true });
  const resSuccess = await dispatchOutboxEvent(eventId, successDispatcher);
  assert.equal(resSuccess.published, true);
  assert.equal(mockItem.status, 'published');
  assert.ok(mockItem.publishedAt);
  assert.equal(mockItem.lastError, null);
});

test('P3-EVT-001: 5. Poison event immediate classification and dead-lettering', async (t) => {
  const eventId = randomUUID();
  const mockItem = {
    id: eventId,
    eventId,
    eventType: 'order.placed.v1',
    attempts: 0,
    maxAttempts: 5,
    status: 'pending',
    toJSON() { return this; },
    async update(fields) {
      Object.assign(this, fields);
      return this;
    },
  };

  t.mock.method(EventOutbox, 'findOne', async () => mockItem);

  const poisonDispatcher = async () => {
    const err = new SyntaxError('Malformed JSON payload');
    err.code = 'POISON_EVENT';
    throw err;
  };

  const res = await dispatchOutboxEvent(eventId, poisonDispatcher);
  // Poison event must be immediately dead-lettered on attempt 1 without retrying!
  assert.equal(res.published, false);
  assert.equal(res.status, 'dead_letter');
  assert.equal(res.classification, 'poison');
  assert.equal(mockItem.status, 'dead_letter');
  assert.equal(mockItem.errorClassification, 'poison');
  assert.equal(mockItem.attempts, 1);
});

test('P3-EVT-001: 6. Inbox duplicate event idempotency (exactly one effect)', async (t) => {
  const eventId = randomUUID();
  const envelope = {
    eventId,
    eventType: 'inventory.reserved.v1',
    schemaVersion: '1.0.0',
    aggregateType: 'Inventory',
    aggregateId: 'inv-item-1',
    aggregateVersion: 1,
    producer: 'ecommerce-server',
    consumer: 'test-consumer',
    payload: { reservedQty: 5 },
  };

  let executionCount = 0;
  const handler = async () => {
    executionCount++;
    return { applied: true };
  };

  let inboxRecord = null;
  t.mock.method(EventInbox, 'findOne', async () => inboxRecord);
  t.mock.method(EventInbox, 'create', async (data) => {
    inboxRecord = {
      ...data,
      async update(fields) {
        Object.assign(this, fields);
        return this;
      },
    };
    return inboxRecord;
  });

  // First delivery: handler executes
  const res1 = await receiveEvent({
    envelope,
    consumer: 'test-consumer',
    handler,
  });
  assert.equal(res1.status, 'processed');
  assert.equal(res1.applied, true);
  assert.equal(executionCount, 1);
  assert.equal(inboxRecord.status, 'processed');

  // Duplicate delivery: handler is NOT called
  const res2 = await receiveEvent({
    envelope,
    consumer: 'test-consumer',
    handler,
  });
  assert.equal(res2.status, 'already_processed');
  assert.equal(res2.duplicate, true);
  assert.equal(executionCount, 1, 'Handler must not execute for duplicate event');
});

test('P3-EVT-001: 7. Monotonic version ordering: delayed / out-of-order event cannot overwrite newer state', async (t) => {
  const staleEventId = randomUUID();
  const staleEnvelope = {
    eventId: staleEventId,
    eventType: 'store.projected.v1',
    schemaVersion: '1.0.0',
    aggregateType: 'Store',
    aggregateId: STORE_A,
    aggregateVersion: 2, // Out of order: aggregate is already at version 5
    producer: 'rentify-server',
    payload: { name: 'Old Store Name' },
  };

  let handlerExecuted = false;
  const handler = async () => {
    handlerExecuted = true;
  };

  let savedRecord = null;
  t.mock.method(EventInbox, 'findOne', async () => null);
  t.mock.method(EventInbox, 'create', async (data) => {
    savedRecord = { ...data };
    return savedRecord;
  });

  // Current aggregate version is 5
  const getCurrentAggregateVersion = async () => 5;

  const result = await receiveEvent({
    envelope: staleEnvelope,
    consumer: 'store-access-projection',
    handler,
    getCurrentAggregateVersion,
  });

  assert.equal(result.status, 'ignored');
  assert.equal(result.outOfOrder, true);
  assert.equal(handlerExecuted, false, 'Stale event handler must not execute');
  assert.equal(savedRecord.status, 'ignored');
  assert.match(savedRecord.lastError, /Stale event version \(2\) superseded by current state \(5\)/);
});

test('P3-EVT-001: 8. Privileged Replay: unauthorized rejection and audit trail', async (t) => {
  const eventId = randomUUID();

  // 8a. Non-admin actor is rejected with 403 Forbidden
  await assert.rejects(async () => {
    await replayEvent({
      target: 'outbox',
      eventId,
      actor: { id: 'buyer-user-1', role: 'customer' },
      reason: 'Trying to replay',
    });
  }, (err) => {
    assert.equal(err.statusCode, 403);
    assert.match(err.message, /Replay requires admin authorization/);
    return true;
  });

  // 8b. Missing reason is rejected with 400 Bad Request
  await assert.rejects(async () => {
    await replayEvent({
      target: 'outbox',
      eventId,
      actor: { id: 'admin-user-1', role: 'admin' },
      reason: '',
    });
  }, (err) => {
    assert.equal(err.statusCode, 400);
    assert.match(err.message, /Replay reason is required for audit/);
    return true;
  });
});

test('P3-EVT-001: 9. Safe Outbox Replay execution and audit record creation', async (t) => {
  const eventId = randomUUID();
  const mockOutboxItem = {
    id: eventId,
    eventId,
    eventType: 'order.placed.v1',
    aggregateType: 'Order',
    aggregateId: 'ord-999',
    aggregateVersion: 1,
    status: 'dead_letter',
    attempts: 5,
    lastError: 'Permanent network drop',
    toJSON() { return this; },
    async update(fields) {
      Object.assign(this, fields);
      return this;
    },
  };

  let auditRecord = null;
  t.mock.method(EventOutbox, 'findOne', async () => mockOutboxItem);
  t.mock.method(EventReplayAudit, 'create', async (data) => {
    auditRecord = {
      ...data,
      async update(fields) {
        Object.assign(this, fields);
        return this;
      },
    };
    return auditRecord;
  });

  let dispatched = false;
  const dispatcher = async () => {
    dispatched = true;
  };

  const replayResult = await replayEvent({
    target: 'outbox',
    eventId,
    actor: { id: 'admin-1', role: 'admin' },
    reason: 'Investigated gateway outage, retrying outbox delivery',
    dispatcher,
  });

  assert.equal(replayResult.status, 'success');
  assert.equal(dispatched, true);
  assert.equal(mockOutboxItem.status, 'published');
  assert.ok(auditRecord);
  assert.equal(auditRecord.actorId, 'admin-1');
  assert.equal(auditRecord.target, 'outbox');
  assert.equal(auditRecord.status, 'success');
  assert.equal(auditRecord.reason, 'Investigated gateway outage, retrying outbox delivery');
});

test('P3-EVT-001: 10. Safe Inbox Replay: cannot duplicate authoritative effects', async (t) => {
  const eventId = randomUUID();
  const mockProcessedInbox = {
    id: eventId,
    eventId,
    eventType: 'order.payment_confirmed.v1',
    aggregateType: 'Order',
    aggregateId: 'ord-111',
    aggregateVersion: 1,
    consumer: 'order-fulfillment',
    status: 'processed',
    toJSON() { return this; },
    async update(fields) {
      Object.assign(this, fields);
      return this;
    },
  };

  let auditRecord = null;
  t.mock.method(EventInbox, 'findOne', async () => mockProcessedInbox);
  t.mock.method(EventReplayAudit, 'create', async (data) => {
    auditRecord = {
      ...data,
      async update(fields) {
        Object.assign(this, fields);
        return this;
      },
    };
    return auditRecord;
  });

  let handlerRan = false;
  const handler = async () => {
    handlerRan = true;
  };

  // Replaying an already-processed event must NOT re-run authoritative effect
  const result = await replayEvent({
    target: 'inbox',
    eventId,
    actor: { id: 'admin-super', role: 'superadmin' },
    reason: 'Auditing event receipt',
    handler,
  });

  assert.equal(result.status, 'already_processed');
  assert.equal(result.duplicateSkipped, true);
  assert.equal(handlerRan, false, 'Authoritative effect must NEVER be re-executed on already processed event');
  assert.equal(auditRecord.status, 'success');
});

test('P3-EVT-001: 11. Operator-safe inspection: sanitizing dead-letter payloads', async (t) => {
  const deadLetters = [
    {
      id: randomUUID(),
      eventId: randomUUID(),
      eventType: 'payment.failed.v1',
      status: 'dead_letter',
      payload: {
        amount: 25.0,
        token: 'secret-auth-token',
        password: 'admin-password',
        streetAddress: '123 Monivong Blvd',
      },
      createdAt: new Date(),
      toJSON() { return { ...this }; },
    },
  ];

  t.mock.method(EventOutbox, 'findAll', async () => deadLetters);

  const inspected = await listDeadLetters({ target: 'outbox' });
  assert.equal(inspected.length, 1);
  assert.equal(inspected[0].payload.amount, 25.0);
  assert.equal(inspected[0].payload.token, undefined, 'Secrets must be masked from operator views');
  assert.equal(inspected[0].payload.password, undefined);
  assert.equal(inspected[0].payload.streetAddress, undefined);
});

test('P3-EVT-001: 12. Representative flow: Store Access Projection event handling', async (t) => {
  const eventId = randomUUID();
  const envelope = {
    eventId,
    eventType: 'store.projected.v1',
    schemaVersion: '1.0.0',
    aggregateType: 'Store',
    aggregateId: STORE_A,
    aggregateVersion: 3,
    producer: 'rentify-server',
    payload: {
      storeId: STORE_A,
      ownerUserId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      websiteId: null,
      primaryCategory: 'Handmade Crafts',
      needsCategoryReview: false,
      marketplaceEnabled: true,
      marketplaceApprovalStatus: 'approved',
      status: 'active',
      version: 3,
      marketplaceEntitlement: 'pilot',
    },
  };

  t.mock.method(sequelize, 'transaction', async (fn) => fn({ LOCK: { UPDATE: 'UPDATE' } }));
  t.mock.method(StoreAccess, 'findByPk', async () => null);
  t.mock.method(StoreAccess, 'create', async (data) => data);
  t.mock.method(StoreDeliveryPolicy, 'findByPk', async () => ({ id: STORE_A }));
  t.mock.method(EventInbox, 'findOne', async () => null);
  t.mock.method(EventInbox, 'create', async (data) => ({
    ...data,
    async update(fields) {
      Object.assign(this, fields);
      return this;
    },
  }));

  const result = await applyStoreProjectedEvent(envelope);
  assert.equal(result.status, 'processed');
  assert.equal(result.applied, true);
  assert.equal(result.eventId, eventId);
});

test('P3-EVT-001: 13. Migration 016 verification: empty DB, existing DB, and rollback', async () => {
  const createdTables = [];
  const addedIndexes = [];
  const droppedTables = [];

  const mockQueryInterface = {
    showAllTables: async () => [],
    createTable: async (tableName, attributes) => {
      createdTables.push({ tableName, attributes });
    },
    addIndex: async (tableName, fields) => {
      addedIndexes.push({ tableName, fields });
    },
    dropTable: async (tableName) => {
      droppedTables.push(tableName);
    },
  };

  // Run up on empty database
  await migration016.up({ queryInterface: mockQueryInterface });

  assert.ok(createdTables.some((t) => t.tableName === 'EventOutboxes'));
  assert.ok(createdTables.some((t) => t.tableName === 'EventInboxes'));
  assert.ok(createdTables.some((t) => t.tableName === 'EventReplayAudits'));
  assert.ok(addedIndexes.some((i) => i.tableName === 'EventOutboxes'));
  assert.ok(addedIndexes.some((i) => i.tableName === 'EventInboxes'));
  assert.ok(addedIndexes.some((i) => i.tableName === 'EventReplayAudits'));

  // Run up on existing database (idempotent)
  mockQueryInterface.showAllTables = async () => ['eventoutboxes', 'eventinboxes', 'eventreplayaudits'];
  const createdOnSecondRun = [];
  mockQueryInterface.createTable = async (tableName) => {
    createdOnSecondRun.push(tableName);
  };
  await migration016.up({ queryInterface: mockQueryInterface });
  assert.equal(createdOnSecondRun.length, 0, 'Must not recreate existing tables on rerun');

  // Run down (rollback)
  await migration016.down({ queryInterface: mockQueryInterface });
  assert.ok(droppedTables.includes('EventReplayAudits'));
  assert.ok(droppedTables.includes('EventInboxes'));
  assert.ok(droppedTables.includes('EventOutboxes'));
});
