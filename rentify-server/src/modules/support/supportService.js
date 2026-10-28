const crypto = require('crypto');
const { Op } = require('sequelize');
const { SupportCase, SupportCaseLink, SupportCaseNote, SupportCaseAttachment, SupportCaseEvent,
  SupportIdempotency, Store, User } = require('../../models');
const { recordEvent } = require('../events');
const { ApiError } = require('../../utils/errors');
const { resolvePlatformAccess, scopeMatches } = require('../../middlewares/platformAuthorization');
const { permissionsForRole } = require('../../config/platformAuthorization');

const TRANSITIONS = Object.freeze({
  open: ['triaged'], triaged: ['in_progress'],
  in_progress: ['waiting_on_requester', 'waiting_on_merchant', 'escalated', 'resolved'],
  waiting_on_requester: ['in_progress', 'escalated', 'resolved'],
  waiting_on_merchant: ['in_progress', 'escalated', 'resolved'],
  escalated: ['in_progress', 'resolved'], resolved: ['closed', 'reopened'],
  closed: ['reopened'], reopened: ['triaged', 'in_progress'],
});
const LINK_OWNERS = Object.freeze({ tenant: 'core', store: 'core', user: 'core', buyer: 'commerce',
  product: 'commerce', order: 'commerce', return: 'commerce', payment: 'commerce', buyer_report: 'commerce',
  review: 'commerce', subscription: 'core', payment_attempt: 'core', approval_request: 'core' });
const VISIBILITIES = ['internal', 'requester', 'merchant'];
const MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
}
function validation(message) { throw ApiError.validation([], message); }
function requireText(value, field, max) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) validation(`${field} is required and must be at most ${max} characters`);
  return value.trim();
}
function requireKey(key) {
  if (typeof key !== 'string' || !key.trim() || key.length > 200) throw ApiError.badRequest('Idempotency-Key is required', 'IDEMPOTENCY_KEY_REQUIRED');
  return hash(key.trim());
}
function expectedVersion(value) {
  if (!Number.isInteger(value) || value < 1) throw ApiError.badRequest('expectedVersion is required', 'EXPECTED_VERSION_REQUIRED');
  return value;
}
function caseScope(item) { return item.storeId ? `store/${item.storeId}` : 'platform/*'; }
function sourceKey(item) {
  return item.sourceSystem && item.sourceType && item.sourceId
    ? hash(JSON.stringify([item.sourceSystem, item.sourceType, item.sourceId, item.caseType])) : null;
}
function safeCase(item) {
  const data = item.toJSON ? item.toJSON() : item;
  const { activeSourceKey: _activeSourceKey, ...safe } = data;
  return { ...safe, sla: { automaticEnforcementEnabled: false, breached: Boolean(data.serviceDeadlineAt &&
    !['resolved', 'closed'].includes(data.status) && new Date(data.serviceDeadlineAt) < new Date()) } };
}
function validateLinks(links) {
  if (links == null) return [];
  if (!Array.isArray(links) || links.length > 30) validation('links must be an array of at most 30 references');
  return links.map((link) => {
    if (!link || Object.keys(link).some((key) => !['subjectType', 'subjectId', 'relationship'].includes(key))) validation('Linked records accept identifiers only');
    const ownerService = LINK_OWNERS[link.subjectType];
    if (!ownerService) validation('Unsupported linked subject type');
    return { subjectType: link.subjectType, subjectId: requireText(link.subjectId, 'subjectId', 128),
      ownerService, relationship: requireText(link.relationship || 'related', 'relationship', 32) };
  });
}
async function appendEvent(item, ctx, action, before, after, keyHash, transaction) {
  const event = await SupportCaseEvent.create({ caseId: item.id, version: item.version, action,
    actorId: ctx.actorId, actorRoles: ctx.roles || [], permissions: ctx.permissions || [],
    tenantScope: caseScope(item), reason: ctx.reason, before, after, correlationId: ctx.correlationId || null,
    idempotencyKeyHash: keyHash }, { transaction });
  const eventNames = { created: 'support.case.opened.v1', assigned: 'support.case.assigned.v1',
    escalated: 'support.case.escalated.v1', resolved: 'support.case.resolved.v1', reopened: 'support.case.reopened.v1' };
  if (eventNames[action]) await recordEvent({ eventType: eventNames[action], aggregateType: 'SupportCase',
    aggregateId: item.id, aggregateVersion: item.version, producer: 'rentify-server',
    correlationId: ctx.correlationId || null, storeId: item.storeId || null,
    payload: { caseId: item.id, status: item.status, assigneeSubjectId: item.assigneeSubjectId || null,
      policyVersion: item.policyVersion || null } }, { transaction });
  return event;
}
async function idempotent(ctx, operation, tenantScope, key, request, run) {
  const keyHash = requireKey(key);
  const requestHash = hash(JSON.stringify(stable(request)));
  const where = { actorId: ctx.actorId, operation, tenantScope, keyHash };
  const replay = async () => {
    const existing = await SupportIdempotency.findOne({ where });
    if (!existing) return null;
    if (existing.requestHash !== requestHash) throw ApiError.conflict('Idempotency key was used with a different request', 'IDEMPOTENCY_CONFLICT');
    return { data: existing.result, replayed: true };
  };
  const previous = await replay();
  if (previous) return previous;
  try {
    return await SupportCase.sequelize.transaction(async (transaction) => {
      const result = await run(transaction, keyHash);
      await SupportIdempotency.create({ ...where, requestHash, caseId: result.id, result }, { transaction });
      return { data: result, replayed: false };
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      const found = await replay();
      if (found) return found;
      throw ApiError.conflict('An equivalent request or active source case already exists', 'CONFLICT');
    }
    throw error;
  }
}
async function create(input, ctx, key) {
  const allowed = ['caseType', 'priority', 'queueKey', 'requesterSubjectId', 'requesterKind', 'storeId',
    'sourceSystem', 'sourceType', 'sourceId', 'summary', 'descriptionClassification', 'language', 'links', 'reason'];
  if (Object.keys(input).some((field) => !allowed.includes(field))) validation('Unsupported case field');
  const caseType = requireText(input.caseType, 'caseType', 64);
  if (!['low', 'normal', 'high', 'urgent'].includes(input.priority)) validation('Invalid priority');
  const summary = requireText(input.summary, 'summary', 500);
  const requesterKind = requireText(input.requesterKind, 'requesterKind', 32);
  const links = validateLinks(input.links);
  requireText(ctx.reason, 'reason', 500);
  if (input.storeId && (!UUID.test(input.storeId) || !await Store.findByPk(input.storeId, { attributes: ['id'] }))) validation('Store does not exist');
  if (links.some((link) => link.subjectType === 'store' && link.subjectId !== input.storeId)) validation('Linked Store must match the case Store');
  if ([input.sourceSystem, input.sourceType, input.sourceId].some(Boolean) && ![input.sourceSystem, input.sourceType, input.sourceId].every(Boolean)) validation('Source system, type and ID must be supplied together');
  const tenantScope = input.storeId ? `store/${input.storeId}` : 'platform/*';
  return idempotent(ctx, 'support.case.create', tenantScope, key, input, async (transaction, keyHash) => {
    const item = await SupportCase.create({ caseNumber: `SC-${crypto.randomBytes(8).toString('hex').toUpperCase()}`,
      caseType, priority: input.priority, status: 'open', queueKey: input.queueKey || null,
      requesterSubjectId: input.requesterSubjectId || null, requesterKind, storeId: input.storeId || null,
      sourceSystem: input.sourceSystem || null, sourceType: input.sourceType || null, sourceId: input.sourceId || null,
      activeSourceKey: sourceKey(input),
      summary, descriptionClassification: input.descriptionClassification || null, language: input.language || null,
      openedAt: new Date(), serviceDeadlineAt: null, policyVersion: null, version: 1 }, { transaction });
    for (const link of links) await SupportCaseLink.create({ caseId: item.id, ...link }, { transaction });
    await appendEvent(item, ctx, 'created', null, { status: 'open', priority: item.priority, storeId: item.storeId }, keyHash, transaction);
    return safeCase(item);
  });
}
async function mutate(item, input, ctx, key, kind) {
  const version = expectedVersion(input.expectedVersion);
  requireText(ctx.reason, 'reason', 500);
  return idempotent(ctx, `support.case.${kind}`, caseScope(item), key, { caseId: item.id, ...input }, async (transaction, keyHash) => {
    const before = { status: item.status, priority: item.priority, assigneeSubjectId: item.assigneeSubjectId,
      version: item.version, escalatedAt: item.escalatedAt, resolvedAt: item.resolvedAt, closedAt: item.closedAt };
    if (item.version !== version) throw ApiError.conflict('Case version has changed', 'VERSION_CONFLICT');
    let changes = {}; let action = kind; let detail = {};
    if (kind === 'assign') {
      if (!UUID.test(input.assigneeSubjectId || '') || !await User.findByPk(input.assigneeSubjectId, { attributes: ['id'], transaction })) validation('Assignee must be an existing Core user');
      if (['resolved', 'closed'].includes(item.status)) validation('Resolved or closed cases cannot be assigned');
      const assignee = await resolvePlatformAccess(input.assigneeSubjectId);
      const scopes = [{ type: 'case', id: item.id }, { type: 'store', id: item.storeId },
        { type: 'queue', id: item.queueKey }].filter((scope) => scope.id);
      if (!assignee || !assignee.grants.some((grant) => permissionsForRole(grant.role).includes('support.case.read') &&
        (grant.scopeType === 'platform' || scopes.some((scope) => scopeMatches(grant, scope))))) validation('Assignee lacks access to this case');
      changes.assigneeSubjectId = input.assigneeSubjectId; action = 'assigned';
    } else if (kind === 'transition') {
      if (!(TRANSITIONS[item.status] || []).includes(input.status)) throw ApiError.conflict('Invalid case transition', 'CASE_TRANSITION_INVALID');
      changes.status = input.status;
      if (input.status === 'triaged') changes.triagedAt = new Date();
      if (input.status === 'escalated') { changes.escalatedAt = new Date(); action = 'escalated'; }
      if (input.status === 'resolved') {
        changes.resolutionCode = requireText(input.resolutionCode, 'resolutionCode', 64);
        changes.resolutionSummary = requireText(input.resolutionSummary, 'resolutionSummary', 1000);
        changes.resolvedAt = new Date(); action = 'resolved';
      }
      if (input.status === 'closed') { changes.closedAt = new Date(); changes.activeSourceKey = null; }
      if (input.status === 'reopened') { changes.closedAt = null; changes.resolvedAt = null; changes.activeSourceKey = sourceKey(item); action = 'reopened'; }
    } else if (kind === 'note') {
      if (ctx.roles?.includes('merchant') && ['closed', 'resolved'].includes(item.status)) {
        throw ApiError.conflict('This case is closed to responses', 'CASE_TRANSITION_INVALID');
      }
      if (!VISIBILITIES.includes(input.visibility)) validation('Invalid note visibility');
      if (/<\/?[a-z][^>]*>/i.test(input.body || '')) validation('Notes must be plain text');
      const note = await SupportCaseNote.create({ caseId: item.id, authorId: ctx.actorId, visibility: input.visibility,
        body: requireText(input.body, 'body', 10000) }, { transaction });
      detail = { noteId: note.id, visibility: note.visibility };
    } else if (kind === 'attachment') {
      if (!VISIBILITIES.includes(input.visibility) || !UUID.test(input.mediaAssetId || '') ||
        !MIME_TYPES.includes(input.mediaType) || !Number.isInteger(input.sizeBytes) || input.sizeBytes < 1 ||
        input.sizeBytes > MAX_ATTACHMENT_BYTES || !/^[a-f0-9]{64}$/i.test(input.sha256 || '')) validation('Invalid attachment metadata');
      const attachment = await SupportCaseAttachment.create({ caseId: item.id, uploaderId: ctx.actorId,
        mediaAssetId: input.mediaAssetId, visibility: input.visibility, mediaType: input.mediaType,
        sizeBytes: input.sizeBytes, sha256: input.sha256.toLowerCase(), scanStatus: 'pending' }, { transaction });
      detail = { attachmentId: attachment.id, visibility: attachment.visibility, scanStatus: attachment.scanStatus };
    } else validation('Unsupported operation');
    changes.version = version + 1;
    const [count] = await SupportCase.update(changes, { where: { id: item.id, version }, transaction });
    if (count !== 1) throw ApiError.conflict('Case version has changed', 'VERSION_CONFLICT');
    const updated = await SupportCase.findByPk(item.id, { transaction });
    await appendEvent(updated, ctx, action, before, { status: updated.status, priority: updated.priority,
      assigneeSubjectId: updated.assigneeSubjectId, version: updated.version, ...detail }, keyHash, transaction);
    return safeCase(updated);
  });
}

module.exports = { TRANSITIONS, LINK_OWNERS, MIME_TYPES, MAX_ATTACHMENT_BYTES, caseScope, safeCase,
  validateLinks, requireKey, expectedVersion, create, mutate };
