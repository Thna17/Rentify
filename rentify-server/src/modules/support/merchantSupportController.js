const { Op } = require('sequelize');
const crypto = require('crypto');
const { Store, SupportCase, SupportCaseNote } = require('../../models');
const { ApiError } = require('../../utils/errors');
const support = require('./supportService');

async function ownedStore(req) {
  if (!req.user?.id || !['user', 'admin'].includes(req.user.role)) throw ApiError.unauthorized();
  const store = await Store.findOne({ where: { ownerUserId: req.user.id }, attributes: ['id', 'ownerUserId'] });
  if (!store) throw ApiError.notFound('Store not found');
  return store;
}
async function ownedCase(req) {
  const store = await ownedStore(req);
  const item = await SupportCase.findOne({ where: { id: req.params.caseId, storeId: store.id } });
  if (!item) throw ApiError.notFound('Case not found');
  return item;
}
function merchantView(item) {
  return { id: item.id, caseNumber: item.caseNumber, caseType: item.caseType, priority: item.priority,
    status: item.status, summary: item.summary, openedAt: item.openedAt, updatedAt: item.updatedAt,
    resolvedAt: item.resolvedAt, closedAt: item.closedAt, version: item.version };
}
function signature(data) {
  if (!process.env.JWT_SECRET) throw new ApiError(503, 'Pagination is unavailable', 'SERVICE_UNAVAILABLE');
  return crypto.createHmac('sha256', process.env.JWT_SECRET).update(data).digest('base64url');
}
exports.list = async (req, res) => {
  const store = await ownedStore(req);
  const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 25));
  const where = { storeId: store.id };
  if (req.query.after) {
    try {
      const [data, mac] = String(req.query.after).split('.');
      if (!data || mac !== signature(data)) throw new Error();
      const cursor = JSON.parse(Buffer.from(data, 'base64url').toString());
      if (cursor.storeId !== store.id || !cursor.id || Number.isNaN(Date.parse(cursor.createdAt))) throw new Error();
      where[Op.or] = [{ createdAt: { [Op.lt]: new Date(cursor.createdAt) } },
        { createdAt: new Date(cursor.createdAt), id: { [Op.lt]: cursor.id } }];
    } catch (_error) { throw ApiError.validation([], 'Invalid cursor'); }
  }
  const rows = await SupportCase.findAll({ where, order: [['createdAt', 'DESC'], ['id', 'DESC']], limit: limit + 1 });
  const page = rows.slice(0, limit);
  const last = page[page.length - 1];
  const data = last && rows.length > limit ? Buffer.from(JSON.stringify({ storeId: store.id, id: last.id,
    createdAt: last.createdAt })).toString('base64url') : null;
  res.json({ data: page.map(merchantView), page: { limit, hasMore: rows.length > limit,
    nextCursor: data ? `${data}.${signature(data)}` : null } });
};
exports.get = async (req, res) => {
  const item = await ownedCase(req);
  const notes = await SupportCaseNote.findAll({ where: { caseId: item.id, visibility: 'merchant' },
    attributes: ['id', 'body', 'createdAt'], order: [['createdAt', 'ASC'], ['id', 'ASC']] });
  res.json({ data: { ...merchantView(item), notes } });
};
exports.respond = async (req, res) => {
  const item = await ownedCase(req);
  const input = { expectedVersion: req.body.expectedVersion, body: req.body.body, visibility: 'merchant', reason: 'Merchant response' };
  const ctx = { actorId: req.user.id, roles: ['merchant'], permissions: ['support.case.respond'],
    correlationId: req.correlationId || null, reason: 'Merchant response' };
  const result = await support.mutate(item, input, ctx, req.get('Idempotency-Key'), 'note');
  res.json({ data: merchantView(result.data), replayed: result.replayed });
};
