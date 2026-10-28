const crypto = require('crypto');
const { Op } = require('sequelize');
const { SupportCase, SupportCaseLink, SupportCaseNote, SupportCaseAttachment, SupportCaseEvent } = require('../../models');
const { resolvePlatformAccess, scopeMatches } = require('../../middlewares/platformAuthorization');
const { permissionsForRole } = require('../../config/platformAuthorization');
const { ApiError } = require('../../utils/errors');
const service = require('./supportService');

function grantAllows(grant, permission, item) {
  const scopes = [{ type: 'store', id: item.storeId }, { type: 'case', id: item.id },
    { type: 'queue', id: item.queueKey }].filter((scope) => scope.id);
  return permissionsForRole(grant.role).includes(permission) &&
    (grant.scopeType === 'platform' || scopes.some((scope) => scopeMatches(grant, scope)));
}
function can(access, permission, item) {
  return access.grants.some((grant) => grantAllows(grant, permission, item));
}
function context(req, access, reason) {
  return { actorId: req.user.id, roles: access.roles, permissions: access.permissions,
    correlationId: req.correlationId || null, reason };
}
async function accessFor(req) {
  const access = await resolvePlatformAccess(req.user.id);
  if (!access) throw ApiError.unauthorized();
  return access;
}
async function findAuthorized(req, permission) {
  const access = await accessFor(req);
  const item = await SupportCase.findByPk(req.params.caseId);
  if (!item || !can(access, permission, item)) throw ApiError.notFound('Case not found');
  return { access, item };
}
function cursorSignature(payload) {
  if (!process.env.JWT_SECRET) throw new ApiError(503, 'Pagination is unavailable', 'SERVICE_UNAVAILABLE');
  return crypto.createHmac('sha256', process.env.JWT_SECRET).update(payload).digest('base64url');
}
function encodeCursor(data) {
  const payload = Buffer.from(JSON.stringify(data)).toString('base64url');
  return `${payload}.${cursorSignature(payload)}`;
}
function decodeCursor(cursor, scope) {
  if (!cursor) return null;
  try {
    const [payload, sig, extra] = String(cursor).split('.');
    if (!payload || !sig || extra || sig !== cursorSignature(payload)) throw new Error();
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (data.scope !== scope || !data.id || Number.isNaN(Date.parse(data.createdAt))) throw new Error();
    return data;
  } catch (_error) { throw ApiError.validation([], 'Invalid pagination cursor'); }
}
function listWhere(access) {
  const grants = access.grants.filter((grant) => permissionsForRole(grant.role).includes('support.case.read'));
  if (grants.some((grant) => grant.scopeType === 'platform')) return {};
  const conditions = grants.flatMap((grant) => {
    if (grant.scopeType === 'store') return [{ storeId: grant.scopeId }];
    if (grant.scopeType === 'case') return [{ id: grant.scopeId }];
    if (grant.scopeType === 'queue') return [{ queueKey: grant.scopeId }];
    return [];
  });
  return { [Op.or]: conditions.length ? conditions : [{ id: null }] };
}
exports.create = async (req, res) => {
  const access = await accessFor(req);
  if (!access.grants.some((grant) => permissionsForRole(grant.role).includes('support.case.create') &&
    (grant.scopeType === 'platform' || (grant.scopeType === 'store' && grant.scopeId === req.body.storeId)))) throw ApiError.forbidden();
  const result = await service.create(req.body, context(req, access, req.body.reason), req.get('Idempotency-Key'));
  return res.status(result.replayed ? 200 : 201).json(result);
};
exports.list = async (req, res) => {
  const access = await accessFor(req);
  const where = listWhere(access);
  const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 25));
  const filters = {};
  for (const key of ['status', 'priority', 'caseType', 'storeId', 'assigneeSubjectId', 'queueKey']) {
    if (req.query[key]) filters[key] = req.query[key];
  }
  const scope = crypto.createHash('sha256').update(JSON.stringify({ actor: req.user.id, filters,
    grants: access.grants.map((g) => [g.role, g.scopeType, g.scopeId]).sort() })).digest('hex');
  const cursor = decodeCursor(req.query.after, scope);
  const parts = [where, filters];
  if (req.query.q) parts.push({ [Op.or]: [{ caseNumber: { [Op.like]: `%${String(req.query.q).slice(0, 100)}%` } },
    { summary: { [Op.like]: `%${String(req.query.q).slice(0, 100)}%` } }] });
  if (cursor) parts.push({ [Op.or]: [{ createdAt: { [Op.lt]: new Date(cursor.createdAt) } },
    { createdAt: new Date(cursor.createdAt), id: { [Op.lt]: cursor.id } }] });
  const rows = await SupportCase.findAll({ where: { [Op.and]: parts }, order: [['createdAt', 'DESC'], ['id', 'DESC']], limit: limit + 1 });
  const hasMore = rows.length > limit; const page = rows.slice(0, limit); const last = page[page.length - 1];
  res.json({ data: page.map(service.safeCase), page: { limit, hasMore,
    nextCursor: hasMore ? encodeCursor({ scope, id: last.id, createdAt: last.createdAt }) : null } });
};
exports.get = async (req, res) => {
  const { item } = await findAuthorized(req, 'support.case.read');
  const links = await SupportCaseLink.findAll({ where: { caseId: item.id }, attributes: ['id', 'subjectType', 'subjectId', 'ownerService', 'relationship', 'createdAt'] });
  res.json({ data: { ...service.safeCase(item), links } });
};
exports.notes = async (req, res) => {
  const { item } = await findAuthorized(req, 'support.case.read');
  const notes = await SupportCaseNote.findAll({ where: { caseId: item.id }, order: [['createdAt', 'ASC'], ['id', 'ASC']] });
  res.json({ data: notes });
};
exports.attachments = async (req, res) => {
  const { item } = await findAuthorized(req, 'support.attachment.read');
  const rows = await SupportCaseAttachment.findAll({ where: { caseId: item.id },
    attributes: ['id', 'caseId', 'uploaderId', 'mediaAssetId', 'visibility', 'mediaType', 'sizeBytes', 'sha256', 'scanStatus', 'createdAt'],
    order: [['createdAt', 'ASC'], ['id', 'ASC']] });
  res.json({ data: rows });
};
exports.events = async (req, res) => {
  const { item } = await findAuthorized(req, 'support.case.read');
  const rows = await SupportCaseEvent.findAll({ where: { caseId: item.id }, order: [['version', 'ASC']] });
  res.json({ data: rows });
};
exports.mutation = (kind) => async (req, res) => {
  const permission = kind === 'assign' ? 'support.case.assign' : kind === 'note' ? 'support.note.create'
    : kind === 'attachment' ? 'support.attachment.create'
      : req.body.status === 'escalated' ? 'support.case.escalate' : req.body.status === 'resolved' || req.body.status === 'closed'
        ? 'support.case.resolve' : req.body.status === 'reopened' ? 'support.case.reopen' : 'support.case.update';
  const { item, access } = await findAuthorized(req, permission);
  const result = await service.mutate(item, req.body, context(req, access, req.body.reason), req.get('Idempotency-Key'), kind);
  res.json(result);
};
module.exports.can = can;
module.exports.listWhere = listWhere;
