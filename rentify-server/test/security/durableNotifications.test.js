const test = require('node:test');
const assert = require('node:assert/strict');
const { Sequelize } = require('sequelize');
const db = new Sequelize({ dialect: 'sqlite', storage: ':memory:', logging: false });
const dbPath = require.resolve('../../src/config/db');
require(dbPath);
require.cache[dbPath].exports = db;
const models = require('../../src/models');
const service = require('../../src/modules/notifications/durableNotificationService');
const controller = require('../../src/modules/notifications/durableNotificationController');
const storeId = '11111111-1111-4111-8111-111111111111';
const ownerId = '22222222-2222-4222-8222-222222222222';
const staffId = '33333333-3333-4333-8333-333333333333';
const strangerId = '44444444-4444-4444-8444-444444444444';
const base = { eventId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', eventName: 'order.placed.v1',
  schemaVersion: '1.0.0', aggregateType: 'Order', aggregateId: 'order-1', aggregateVersion: 1,
  occurredAt: '2026-01-01T00:00:00.000Z', producer: 'ecommerce-server', correlationId: 'test-correlation-123', storeId,
  data: { buyerSubjectId: 'buyer-1', buyerAddress: 'not stored', paymentStatus: 'not stored', token: 'not stored' } };

test.before(async () => {
  for (const model of [models.InboxNotification, models.NotificationPreference, models.NotificationDelivery,
    models.NotificationDeliveryAttempt, models.NotificationSourceEvent, models.EventOutbox]) await model.sync({ force: true });
  models.Store.findByPk = async (id) => id === storeId ? { id, ownerUserId: ownerId } : null;
  models.Staff.findAll = async () => [{ id: staffId, permissions: ['manage_orders'] },
    { id: strangerId, permissions: ['manage_products'] }];
  models.User.findByPk = async (id) => id === ownerId ? { id } : null;
  await models.NotificationPreference.create({ recipientKind: 'user', recipientId: ownerId,
    locale: 'km', optionalEnabled: false, emailEnabled: true });
});

test('Core outbox processing resolves an assignment only to the authorized case assignee', async (t) => {
  const eventId = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  t.mock.method(models.SupportCase, 'findByPk', async () => ({ id: 'case-1', assigneeSubjectId: staffId,
    requesterKind: 'buyer', requesterSubjectId: 'buyer-1', storeId }));
  await models.EventOutbox.create({ id: eventId, eventId, eventType: 'support.case.assigned.v1', schemaVersion: '1.0.0',
    aggregateType: 'SupportCase', aggregateId: 'case-1', aggregateVersion: 2, occurredAt: new Date(), producer: 'rentify-server',
    correlationId: 'support-event-1234', storeId, payload: { caseId: 'case-1', assigneeSubjectId: staffId }, status: 'pending' });
  const result = await service.consumeCoreEvents();
  assert.equal(result.failures.length, 0);
  const notifications = await models.InboxNotification.findAll({ where: { eventId } });
  assert.equal(notifications.length, 1);
  assert.equal(notifications[0].recipientId, staffId);
  assert.equal((await service.consumeCoreEvents()).checked, 0);
});
test.after(async () => db.close());

test('replayed events produce one visible notification per authoritative recipient with minimal data', async () => {
  assert.deepEqual(await service.ingest(base), { duplicate: false, count: 3 });
  assert.deepEqual(await service.ingest(base), { duplicate: true, count: 0 });
  const rows = await models.InboxNotification.findAll({ where: { eventId: base.eventId }, raw: true });
  assert.equal(rows.length, 3);
  assert.deepEqual(new Set(rows.map((row) => `${row.recipientKind}:${row.recipientId}`)),
    new Set([`user:${ownerId}`, `staff:${staffId}`, 'buyer:buyer-1']));
  assert.equal(JSON.stringify(rows).includes('not stored'), false);
  assert.equal(rows.find((row) => row.recipientId === ownerId).locale, 'km');
  assert.equal(rows.find((row) => row.recipientId === staffId).locale, 'en');
  assert.equal(rows.find((row) => row.recipientId === ownerId).title, service.FAMILY_TEMPLATES.order.km[0]);
  assert.equal(rows.find((row) => row.recipientId === staffId).title, service.FAMILY_TEMPLATES.order.en[0]);
  await assert.rejects(() => service.ingest({ ...base, aggregateId: 'different' }), (error) => error.code === 'IDEMPOTENCY_CONFLICT');
});

test('delivery, return and refund recipients remain the Commerce buyer and permitted Store operators', async () => {
  for (const eventName of ['delivery.delivered.v1', 'return.updated.v1', 'refund.confirmed.v1']) {
    const event = service.validateEvent({ ...base, eventName });
    const recipients = await service.resolveRecipients(event);
    assert.deepEqual(new Set(recipients.map((item) => `${item.kind}:${item.id}`)),
      new Set([`user:${ownerId}`, `staff:${staffId}`, 'buyer:buyer-1']));
  }
  const subscription = service.validateEvent({ ...base, producer: 'rentify-server', eventName: 'subscription.suspended.v1', data: {} });
  const recipients = await service.resolveRecipients(subscription);
  assert.deepEqual(recipients, [{ kind: 'user', id: ownerId }]);
});

test('preferences suppress optional external notices but cannot suppress mandatory inbox or delivery', async () => {
  const optional = { ...base, eventId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    eventName: 'seller.review.approved.v1', producer: 'rentify-server', aggregateType: 'Store', aggregateId: storeId, data: {} };
  await service.ingest(optional);
  const optionalItem = await models.InboxNotification.findOne({ where: { eventId: optional.eventId, recipientId: ownerId } });
  const optionalDelivery = await models.NotificationDelivery.findOne({ where: { notificationId: optionalItem.id, channel: 'email' } });
  assert.equal(optionalItem.mandatory, false);
  assert.equal(optionalDelivery.status, 'suppressed');
  const mandatoryItem = await models.InboxNotification.findOne({ where: { eventId: base.eventId, recipientId: ownerId } });
  const mandatoryDelivery = await models.NotificationDelivery.findOne({ where: { notificationId: mandatoryItem.id, channel: 'email' } });
  assert.equal(mandatoryItem.mandatory, true);
  assert.equal(mandatoryDelivery.status, 'pending');
  assert.equal(service.policy('security.new_session.v1').mandatory, true);
  assert.equal(service.policy('legal.notice.v1').mandatory, true);
  const security = { ...base, eventId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', eventName: 'security.new_session.v1',
    producer: 'rentify-server', storeId: null, aggregateType: 'User', aggregateId: ownerId,
    data: { affectedSubjectId: ownerId } };
  await service.ingest(security);
  const securityItem = await models.InboxNotification.findOne({ where: { eventId: security.eventId, recipientId: ownerId } });
  assert.equal(securityItem.mandatory, true);
  assert.equal((await models.NotificationDelivery.findOne({ where: { notificationId: securityItem.id } })).status, 'pending');
});

test('failed provider remains visible and retry uses the same deduplication key without repeating successful delivery', async () => {
  const item = await models.InboxNotification.findOne({ where: { eventId: base.eventId, recipientId: ownerId } });
  const delivery = await models.NotificationDelivery.findOne({ where: { notificationId: item.id, channel: 'email' } });
  const start = new Date(Date.now() + 10000);
  const failed = await service.dispatch(delivery.id, { now: start });
  assert.equal(failed.status, 'failed_retryable');
  assert.equal(failed.lastErrorCode, 'PROVIDER_UNAVAILABLE');
  let calls = 0; let key;
  service.registerProvider('email', { async send(request) { calls += 1; key = request.idempotencyKey; return { reference: 'provider-123' }; } });
  await service.dispatch(delivery.id, { now: new Date(start.getTime() + 30000) });
  await service.dispatch(delivery.id, { now: new Date(start.getTime() + 60000) });
  assert.equal(calls, 1);
  assert.equal(key, delivery.dedupeKey);
  assert.equal((await models.NotificationDelivery.findByPk(delivery.id)).status, 'sent');
  assert.equal(await models.NotificationDeliveryAttempt.count({ where: { deliveryId: delivery.id } }), 2);
});

test('subjects cannot read or retry a different recipient’s notification', async () => {
  const item = await models.InboxNotification.findOne({ where: { eventId: base.eventId, recipientId: ownerId } });
  const req = { user: { id: strangerId, role: 'user' }, params: { notificationId: item.id }, body: { read: true } };
  const res = { json() { throw new Error('Cross-tenant notification exposed'); } };
  await assert.rejects(() => controller.setRead(req, res), (error) => error.code === 'NOT_FOUND');
  await assert.rejects(() => controller.deliveries(req, res), (error) => error.code === 'NOT_FOUND');
  await assert.rejects(() => service.ingest({ ...base, eventId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', storeId: strangerId }),
    (error) => error.code === 'VALIDATION_FAILED');
});
