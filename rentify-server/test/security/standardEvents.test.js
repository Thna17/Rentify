'use strict';

// test/security/standardEvents.test.js
// Verification suite for P3-EVT-001 in rentify-server: Standard outbox, inbox, and replay operations.

const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { Sequelize } = require('sequelize');

Sequelize.prototype.authenticate = async () => {};
Sequelize.prototype.validate = async () => {};

const sequelize = require('../../src/config/db');
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
} = require('../../src/modules/events');

const { EventOutbox, EventInbox, EventReplayAudit, StoreSyncOutbox } = require('../../src/models');
const { queueStore } = require('../../src/modules/commerce-sync/storeSyncService');
const migration014 = require('../../src/migrations/20261025_014_standard_events');

const STORE_A = '11111111-1111-4111-8111-111111111111';

test('P3-EVT-001 (Core): 1. EventEnvelope validation, immutability, and defaults', () => {
  assert.throws(() => new EventEnvelope({}), /eventType is required/);
  assert.throws(() => new EventEnvelope({ eventType: 'test.event' }), /aggregateType is required/);
  assert.throws(() => new EventEnvelope({ eventType: 'test.event', aggregateType: 'Store' }), /aggregateId is required/);
  assert.throws(() => new EventEnvelope({
    eventType: 'test.event', aggregateType: 'Store', aggregateId: STORE_A, aggregateVersion: 0,
  }), /aggregateVersion must be a positive integer/);
  assert.throws(() => new EventEnvelope({
    eventType: 'test.event', aggregateType: 'Store', aggregateId: STORE_A, aggregateVersion: 1,
  }), /producer is required/);

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
  assert.equal(event.aggregateType, 'Store');
  assert.equal(event.aggregateId, STORE_A);
  assert.equal(event.aggregateVersion, 1);
  assert.equal(event.producer, 'rentify-server');
  assert.equal(event.storeId, STORE_A);
  assert.deepEqual(event.payload, { name: 'Angkor Silk' });
  assert.ok(event.occurredAt);
  assert.ok(event.correlationId);

  assert.ok(Object.isFrozen(event));
  assert.throws(() => {
    event.eventType = 'tampered';
  }, TypeError);
});

test('P3-EVT-001 (Core): 2. Payload sanitization: stripping secrets, tokens, raw QRs, and unneeded addresses', () => {
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

  const withAddresses = sanitizePayload(unsafePayload, { allowAddresses: true });
  assert.equal(withAddresses.streetAddress, 'No 123 Norodom Blvd');
  assert.equal(withAddresses.postalCode, '12000');
  assert.equal(withAddresses.adminPassword, undefined);
  assert.equal(withAddresses.apiKey, undefined);
});

test('P3-EVT-001 (Core): 3. Transactional Outbox write and correlation propagation', async (t) => {
  const correlationId = 'corr-' + randomUUID();
  let createdRecord = null;

  t.mock.method(EventOutbox, 'create', async (data) => {
    createdRecord = data;
    return { ...data, toJSON: () => data };
  });

  await recordEvent({
    eventType: 'store.created.v1',
    aggregateType: 'Store',
    aggregateId: STORE_A,
    aggregateVersion: 1,
    producer: 'rentify-server',
    correlationId,
    storeId: STORE_A,
    payload: { name: 'Angkor Silk' },
  });

  assert.ok(createdRecord);
  assert.equal(createdRecord.eventType, 'store.created.v1');
  assert.equal(createdRecord.aggregateType, 'Store');
  assert.equal(createdRecord.aggregateId, STORE_A);
  assert.equal(createdRecord.correlationId, correlationId);
  assert.equal(createdRecord.status, 'pending');
  assert.equal(createdRecord.attempts, 0);
  assert.equal(createdRecord.maxAttempts, 5);
  assert.ok(createdRecord.nextAttemptAt);
});

test('P3-EVT-001 (Core): 4. Outbox dispatch, exponential backoff, and dead-letter state', async (t) => {
  const eventId = randomUUID();
  const mockItem = {
    id: eventId,
    eventId,
    eventType: 'store.projected.v1',
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

  let attemptCount = 0;
  const transientDispatcher = async () => {
    attemptCount++;
    const err = new Error('Connection refused by downstream');
    err.statusCode = 503;
    throw err;
  };

  const res1 = await dispatchOutboxEvent(eventId, transientDispatcher);
  assert.equal(res1.published, false);
  assert.equal(res1.status, 'pending');
  assert.equal(mockItem.attempts, 1);
  assert.equal(mockItem.errorClassification, 'transient');

  mockItem.attempts = 2;
  const res2 = await dispatchOutboxEvent(eventId, transientDispatcher);
  assert.equal(res2.published, false);
  assert.equal(res2.status, 'dead_letter');
  assert.equal(mockItem.attempts, 3);
  assert.equal(mockItem.status, 'dead_letter');

  mockItem.attempts = 0;
  mockItem.status = 'pending';
  const successDispatcher = async () => ({ ok: true });
  const resSuccess = await dispatchOutboxEvent(eventId, successDispatcher);
  assert.equal(resSuccess.published, true);
  assert.equal(mockItem.status, 'published');
  assert.ok(mockItem.publishedAt);
  assert.equal(mockItem.lastError, null);
});

test('P3-EVT-001 (Core): 5. Poison event immediate classification and dead-lettering', async (t) => {
  const eventId = randomUUID();
  const mockItem = {
    id: eventId,
    eventId,
    eventType: 'store.projected.v1',
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
    const err = new SyntaxError('Poisonous invalid schema structure');
    err.code = 'POISON_EVENT';
    throw err;
  };

  const res = await dispatchOutboxEvent(eventId, poisonDispatcher);
  assert.equal(res.published, false);
  assert.equal(res.status, 'dead_letter');
  assert.equal(res.classification, 'poison');
  assert.equal(mockItem.status, 'dead_letter');
  assert.equal(mockItem.errorClassification, 'poison');
  assert.equal(mockItem.attempts, 1);
});

test('P3-EVT-001 (Core): 6. Inbox duplicate event idempotency (exactly one effect)', async (t) => {
  const eventId = randomUUID();
  const envelope = {
    eventId,
    eventType: 'account.billing_updated.v1',
    schemaVersion: '1.0.0',
    aggregateType: 'Account',
    aggregateId: 'acc-1',
    aggregateVersion: 1,
    producer: 'ecommerce-server',
    consumer: 'core-billing',
    payload: { status: 'paid' },
  };

  let executionCount = 0;
  const handler = async () => {
    executionCount++;
    return { recorded: true };
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

  const res1 = await receiveEvent({
    envelope,
    consumer: 'core-billing',
    handler,
  });
  assert.equal(res1.status, 'processed');
  assert.equal(res1.applied, true);
  assert.equal(executionCount, 1);

  const res2 = await receiveEvent({
    envelope,
    consumer: 'core-billing',
    handler,
  });
  assert.equal(res2.status, 'already_processed');
  assert.equal(res2.duplicate, true);
  assert.equal(executionCount, 1, 'Duplicate event must not execute handler');
});

test('P3-EVT-001 (Core): 7. Monotonic version ordering: delayed / out-of-order event cannot overwrite newer state', async (t) => {
  const staleEnvelope = {
    eventId: randomUUID(),
    eventType: 'subscription.tier_changed.v1',
    schemaVersion: '1.0.0',
    aggregateType: 'Subscription',
    aggregateId: 'sub-1',
    aggregateVersion: 1, // Stale version
    producer: 'core-billing',
    payload: { tier: 'free_pilot' },
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

  const getCurrentAggregateVersion = async () => 3; // Current state is version 3

  const result = await receiveEvent({
    envelope: staleEnvelope,
    consumer: 'subscription-consumer',
    handler,
    getCurrentAggregateVersion,
  });

  assert.equal(result.status, 'ignored');
  assert.equal(result.outOfOrder, true);
  assert.equal(handlerExecuted, false);
  assert.equal(savedRecord.status, 'ignored');
});

test('P3-EVT-001 (Core): 8. Privileged Replay: unauthorized rejection and audit trail', async (t) => {
  const eventId = randomUUID();

  await assert.rejects(async () => {
    await replayEvent({
      target: 'outbox',
      eventId,
      actor: { id: 'staff-user', role: 'merchant_staff' },
      reason: 'Attempt replay without admin privilege',
    });
  }, (err) => {
    assert.equal(err.statusCode, 403);
    return true;
  });

  await assert.rejects(async () => {
    await replayEvent({
      target: 'outbox',
      eventId,
      actor: { id: 'admin-user', role: 'admin' },
      reason: '   ',
    });
  }, (err) => {
    assert.equal(err.statusCode, 400);
    return true;
  });
});

test('P3-EVT-001 (Core): 9. Safe Outbox Replay execution and audit record creation', async (t) => {
  const eventId = randomUUID();
  const mockOutboxItem = {
    id: eventId,
    eventId,
    eventType: 'store.projected.v1',
    aggregateType: 'Store',
    aggregateId: STORE_A,
    aggregateVersion: 2,
    status: 'dead_letter',
    attempts: 5,
    lastError: 'Downstream timeout',
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

  const result = await replayEvent({
    target: 'outbox',
    eventId,
    actor: { id: 'ops-admin', role: 'admin' },
    reason: 'Restarted consumer service, replaying dead-lettered projection',
    dispatcher,
  });

  assert.equal(result.status, 'success');
  assert.equal(dispatched, true);
  assert.equal(mockOutboxItem.status, 'published');
  assert.ok(auditRecord);
  assert.equal(auditRecord.status, 'success');
  assert.equal(auditRecord.actorId, 'ops-admin');
});

test('P3-EVT-001 (Core): 10. Safe Inbox Replay: cannot duplicate authoritative effects', async (t) => {
  const eventId = randomUUID();
  const mockProcessedInbox = {
    id: eventId,
    eventId,
    eventType: 'payment.settled.v1',
    aggregateType: 'Payment',
    aggregateId: 'pay-777',
    aggregateVersion: 1,
    consumer: 'core-settlements',
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

  const result = await replayEvent({
    target: 'inbox',
    eventId,
    actor: { id: 'admin-super', role: 'superadmin' },
    reason: 'Audit verification',
    handler,
  });

  assert.equal(result.status, 'already_processed');
  assert.equal(result.duplicateSkipped, true);
  assert.equal(handlerRan, false);
  assert.equal(auditRecord.status, 'success');
});

test('P3-EVT-001 (Core): 11. Operator-safe inspection: sanitizing dead-letter payloads', async (t) => {
  const deadLetters = [
    {
      id: randomUUID(),
      eventId: randomUUID(),
      eventType: 'staff.invited.v1',
      status: 'dead_letter',
      payload: {
        role: 'manager',
        invitationToken: 'secret-invite-token-abc',
        tempPassword: 'temp-password-123',
        businessAddress: '456 Russian Hospital Blvd',
      },
      createdAt: new Date(),
      toJSON() { return { ...this }; },
    },
  ];

  t.mock.method(EventOutbox, 'findAll', async () => deadLetters);

  const inspected = await listDeadLetters({ target: 'outbox' });
  assert.equal(inspected.length, 1);
  assert.equal(inspected[0].payload.role, 'manager');
  assert.equal(inspected[0].payload.invitationToken, undefined);
  assert.equal(inspected[0].payload.tempPassword, undefined);
  assert.equal(inspected[0].payload.businessAddress, undefined);
});

test('P3-EVT-001 (Core): 12. Representative flow: storeSyncService records EventOutbox transactionally', async (t) => {
  const mockStore = {
    id: STORE_A,
    ownerUserId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    primaryCategory: 'Handmade Crafts',
    needsCategoryReview: false,
    marketplaceEnabled: true,
    marketplaceApprovalStatus: 'approved',
    status: 'active',
    marketplaceEntitlement: 'pilot',
    projectionVersion: 2,
  };

  let storeSyncOutboxWritten = false;
  let standardEventOutboxWritten = false;

  t.mock.method(StoreSyncOutbox, 'findByPk', async () => null);
  t.mock.method(StoreSyncOutbox, 'create', async () => {
    storeSyncOutboxWritten = true;
    return { storeId: STORE_A };
  });

  t.mock.method(EventOutbox, 'create', async (data) => {
    standardEventOutboxWritten = true;
    assert.equal(data.eventType, 'store.projected.v1');
    assert.equal(data.aggregateType, 'Store');
    assert.equal(data.aggregateId, STORE_A);
    assert.equal(data.aggregateVersion, 2);
    assert.equal(data.producer, 'rentify-server');
    return data;
  });

  const payload = await queueStore(mockStore);
  assert.equal(storeSyncOutboxWritten, true, 'StoreSyncOutbox write must be preserved');
  assert.equal(standardEventOutboxWritten, true, 'EventOutbox record must be created');
  assert.equal(payload.storeId, STORE_A);
  assert.equal(payload.version, 2);
});

test('P3-EVT-001 (Core): 13. Migration 014 verification: empty DB, existing DB, and rollback', async () => {
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

  await migration014.up({ queryInterface: mockQueryInterface });

  assert.ok(createdTables.some((t) => t.tableName === 'EventOutboxes'));
  assert.ok(createdTables.some((t) => t.tableName === 'EventInboxes'));
  assert.ok(createdTables.some((t) => t.tableName === 'EventReplayAudits'));
  assert.ok(addedIndexes.some((i) => i.tableName === 'EventOutboxes'));
  assert.ok(addedIndexes.some((i) => i.tableName === 'EventInboxes'));
  assert.ok(addedIndexes.some((i) => i.tableName === 'EventReplayAudits'));

  mockQueryInterface.showAllTables = async () => ['eventoutboxes', 'eventinboxes', 'eventreplayaudits'];
  const createdOnSecondRun = [];
  mockQueryInterface.createTable = async (tableName) => {
    createdOnSecondRun.push(tableName);
  };
  await migration014.up({ queryInterface: mockQueryInterface });
  assert.equal(createdOnSecondRun.length, 0);

  await migration014.down({ queryInterface: mockQueryInterface });
  assert.ok(droppedTables.includes('EventReplayAudits'));
  assert.ok(droppedTables.includes('EventInboxes'));
  assert.ok(droppedTables.includes('EventOutboxes'));
});
