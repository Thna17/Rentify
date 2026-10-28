const test = require('node:test');
const assert = require('node:assert/strict');
const { Sequelize } = require('sequelize');
const sequelize = new Sequelize('sqlite::memory:', { logging: false });
const dbPath = require.resolve('../../src/config/db');
require(dbPath);
require.cache[dbPath].exports = sequelize;
const models = require('../../src/models');
const service = require('../../src/modules/support/supportService');
const controller = require('../../src/modules/support/supportController');
const merchant = require('../../src/modules/support/merchantSupportController');

const actorId = '11111111-1111-4111-8111-111111111111';
const storeId = '22222222-2222-4222-8222-222222222222';
const assigneeId = '33333333-3333-4333-8333-333333333333';
const ctx = { actorId, roles: ['support_agent'], permissions: ['support.case.create', 'support.case.update'],
  reason: 'Manual support triage', correlationId: 'support-test-correlation' };
const input = { caseType: 'buyer_report', priority: 'normal', requesterKind: 'buyer', storeId,
  summary: 'Buyer needs help', sourceSystem: 'commerce', sourceType: 'buyer_report', sourceId: 'report-1',
  links: [{ subjectType: 'order', subjectId: 'order-1', relationship: 'related' }], reason: ctx.reason };
let item;

test.before(async () => {
  for (const model of [models.SupportCase, models.SupportCaseLink, models.SupportCaseNote,
    models.SupportCaseAttachment, models.SupportCaseEvent, models.SupportIdempotency, models.EventOutbox]) await model.sync({ force: true });
  models.Store.findByPk = async (id) => id === storeId ? { id } : null;
  models.User.findByPk = async (id) => id === assigneeId ? { id } : null;
  models.PlatformRoleGrant.findAll = async ({ where }) => where.userId === assigneeId
    ? [{ role: 'support_agent', scopeType: 'store', scopeId: storeId, status: 'active' }] : [];
  models.BreakGlassGrant.findAll = async () => [];
});
test.after(async () => sequelize.close());

test('idempotent creation keeps references only and leaves policy-dependent deadline disabled', async () => {
  const first = await service.create(input, ctx, 'create-1');
  const second = await service.create(input, ctx, 'create-1');
  assert.equal(first.data.id, second.data.id);
  assert.equal(second.replayed, true);
  assert.equal(await models.SupportCase.count(), 1);
  await assert.rejects(() => service.create(input, ctx, 'different-key'), (error) => error.code === 'CONFLICT');
  assert.equal(first.data.serviceDeadlineAt, null);
  assert.equal(first.data.sla.automaticEnforcementEnabled, false);
  const links = await models.SupportCaseLink.findAll({ where: { caseId: first.data.id }, raw: true });
  assert.equal(links[0].ownerService, 'commerce');
  assert.equal(links[0].subjectId, 'order-1');
  assert.equal(Object.hasOwn(links[0], 'orderStatus'), false);
  await assert.rejects(() => service.create({ ...input, summary: 'changed' }, ctx, 'create-1'), (error) => error.code === 'IDEMPOTENCY_CONFLICT');
  assert.throws(() => service.validateLinks([{ subjectType: 'order', subjectId: 'o', relationship: 'related', status: 'paid' }]));
  item = await models.SupportCase.findByPk(first.data.id);
});

test('scoped access denies other tenants and internal permissions are required', () => {
  const access = { grants: [{ role: 'support_agent', scopeType: 'store', scopeId: storeId }] };
  assert.equal(controller.can(access, 'support.case.read', { id: 'case-a', storeId }), true);
  assert.equal(controller.can(access, 'support.case.read', { id: 'case-b', storeId: '44444444-4444-4444-8444-444444444444' }), false);
  assert.equal(controller.can(access, 'finance.payment.read', { id: 'case-a', storeId }), false);
});

test('assignment and legal transitions require current version and an existing assignee', async () => {
  await assert.rejects(() => service.mutate(item, { expectedVersion: 1, assigneeSubjectId: 'invalid', reason: ctx.reason }, ctx, 'assign-bad', 'assign'));
  await assert.rejects(() => service.mutate(item, { expectedVersion: 1, status: 'resolved', reason: ctx.reason }, ctx, 'invalid-transition', 'transition'),
    (error) => error.code === 'CASE_TRANSITION_INVALID');
  const assigned = await service.mutate(item, { expectedVersion: 1, assigneeSubjectId: assigneeId, reason: ctx.reason }, ctx, 'assign-1', 'assign');
  assert.equal(assigned.data.assigneeSubjectId, assigneeId);
  item = await models.SupportCase.findByPk(item.id);
  await service.mutate(item, { expectedVersion: 2, status: 'triaged', reason: ctx.reason }, ctx, 'triage-1', 'transition');
  item = await models.SupportCase.findByPk(item.id);
  await service.mutate(item, { expectedVersion: 3, status: 'in_progress', reason: ctx.reason }, ctx, 'progress-1', 'transition');
  item = await models.SupportCase.findByPk(item.id);
});

test('manual escalation and competing updates produce a version conflict', async () => {
  const stale = await models.SupportCase.findByPk(item.id);
  const escalation = await service.mutate(item, { expectedVersion: 4, status: 'escalated', reason: ctx.reason }, ctx, 'escalate-1', 'transition');
  assert.equal(escalation.data.status, 'escalated');
  assert.ok(escalation.data.escalatedAt);
  await assert.rejects(() => service.mutate(stale, { expectedVersion: 4, status: 'waiting_on_merchant', reason: ctx.reason }, ctx, 'race-1', 'transition'),
    (error) => error.code === 'VERSION_CONFLICT');
  item = await models.SupportCase.findByPk(item.id);
});

test('notes retain visibility and attachments reject invalid metadata', async () => {
  await service.mutate(item, { expectedVersion: 5, visibility: 'internal', body: 'Internal review', reason: ctx.reason }, ctx, 'note-1', 'note');
  item = await models.SupportCase.findByPk(item.id);
  await service.mutate(item, { expectedVersion: 6, visibility: 'requester', body: 'We are reviewing your case', reason: ctx.reason }, ctx, 'note-2', 'note');
  const notes = await models.SupportCaseNote.findAll({ where: { caseId: item.id, visibility: 'requester' } });
  assert.equal(notes.length, 1);
  assert.equal(notes[0].body, 'We are reviewing your case');
  item = await models.SupportCase.findByPk(item.id);
  await assert.rejects(() => service.mutate(item, { expectedVersion: 7, visibility: 'internal', mediaAssetId: assigneeId,
    mediaType: 'application/x-executable', sizeBytes: 10, sha256: 'a'.repeat(64), reason: ctx.reason }, ctx, 'attachment-bad', 'attachment'));
  await service.mutate(item, { expectedVersion: 7, visibility: 'internal', mediaAssetId: assigneeId,
    mediaType: 'image/png', sizeBytes: 20, sha256: 'a'.repeat(64), reason: ctx.reason }, ctx, 'attachment-1', 'attachment');
  const attachment = await models.SupportCaseAttachment.findOne({ where: { caseId: item.id }, raw: true });
  assert.equal(attachment.scanStatus, 'pending');
  assert.equal(Object.hasOwn(attachment, 'path'), false);
  const access = { grants: [{ role: 'seller_reviewer', scopeType: 'platform' }] };
  assert.equal(controller.can(access, 'support.attachment.read', item), false);
  item = await models.SupportCase.findByPk(item.id);
});

test('resolution, closure and reopening leave an immutable ordered audit history', async () => {
  await service.mutate(item, { expectedVersion: 8, status: 'resolved', resolutionCode: 'guidance',
    resolutionSummary: 'Guidance provided', reason: ctx.reason }, ctx, 'resolve-1', 'transition');
  item = await models.SupportCase.findByPk(item.id);
  await service.mutate(item, { expectedVersion: 9, status: 'closed', reason: ctx.reason }, ctx, 'close-1', 'transition');
  item = await models.SupportCase.findByPk(item.id);
  await service.mutate(item, { expectedVersion: 10, status: 'reopened', reason: ctx.reason }, ctx, 'reopen-1', 'transition');
  const events = await models.SupportCaseEvent.findAll({ where: { caseId: item.id }, order: [['version', 'ASC']] });
  assert.deepEqual(events.map((event) => event.version), [1,2,3,4,5,6,7,8,9,10,11]);
  assert.deepEqual(events.slice(-3).map((event) => event.action), ['resolved', 'transition', 'reopened']);
  assert.ok(events.every((event) => event.actorId && event.reason && event.correlationId && event.idempotencyKeyHash));
  await assert.rejects(() => events[0].update({ reason: 'rewritten' }), /append-only/);
  assert.equal(await models.EventOutbox.count({ where: { aggregateId: item.id } }), 5);
});

test('note and attachment endpoints enforce case scope before revealing internal records', async (t) => {
  t.mock.method(models.User, 'findByPk', async () => ({ id: actorId, role: 'user' }));
  t.mock.method(models.PlatformRoleGrant, 'findAll', async () => [{ role: 'support_agent',
    scopeType: 'store', scopeId: '44444444-4444-4444-8444-444444444444', status: 'active' }]);
  const req = { user: { id: actorId }, params: { caseId: item.id } };
  const res = { json() { throw new Error('Unauthorized case data was returned'); } };
  await assert.rejects(() => controller.notes(req, res), (error) => error.code === 'NOT_FOUND');
  await assert.rejects(() => controller.attachments(req, res), (error) => error.code === 'NOT_FOUND');
});

test('merchant sees only their store and merchant-visible notes and can reply idempotently', async (t) => {
  t.mock.method(models.Store, 'findOne', async ({ where }) => where.ownerUserId === actorId ? { id: storeId, ownerUserId: actorId }
    : { id: '44444444-4444-4444-8444-444444444444', ownerUserId: where.ownerUserId });
  const data = [];
  const res = { json(value) { data.push(value); return this; } };
  const req = { user: { id: actorId, role: 'user' }, params: { caseId: item.id }, correlationId: 'merchant-test-001',
    get: () => 'merchant-response-key', body: { expectedVersion: 11, body: 'Thank you for helping.' } };
  await merchant.get(req, res);
  assert.deepEqual(data[0].data.notes.map((note) => note.body), []);
  await merchant.respond(req, res);
  await merchant.respond(req, res);
  assert.equal(data[2].replayed, true);
  await merchant.get(req, res);
  assert.deepEqual(data[3].data.notes.map((note) => note.body), ['Thank you for helping.']);
  assert.equal(JSON.stringify(data[3]).includes('Internal review'), false);
  await assert.rejects(() => merchant.get({ ...req, user: { id: assigneeId, role: 'user' } }, res),
    (error) => error.code === 'NOT_FOUND');
});
