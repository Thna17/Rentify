const crypto = require('crypto');
const { Op } = require('sequelize');
const { InboxNotification, NotificationPreference, NotificationDelivery, NotificationDeliveryAttempt } = require('../../models');
const { ApiError } = require('../../utils/errors');
const service = require('./durableNotificationService');

function subject(req) {
  if (!req.user?.id || !['user', 'admin', 'staff'].includes(req.user.role)) throw ApiError.unauthorized();
  return { recipientKind: req.user.role === 'staff' ? 'staff' : 'user', recipientId: String(req.user.id) };
}
function cursorMac(value) {
  if (!process.env.JWT_SECRET) throw new ApiError(503, 'Inbox pagination unavailable', 'SERVICE_UNAVAILABLE');
  return crypto.createHmac('sha256', process.env.JWT_SECRET).update(value).digest('base64url');
}
function decodeCursor(cursor, owner) {
  if (!cursor) return null;
  try {
    const [body, signature, extra] = String(cursor).split('.');
    if (!body || !signature || extra || cursorMac(body) !== signature) throw new Error();
    const data = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (data.owner !== `${owner.recipientKind}:${owner.recipientId}` || !data.id || Number.isNaN(Date.parse(data.createdAt))) throw new Error();
    return data;
  } catch (_error) { throw ApiError.validation([], 'Invalid inbox cursor'); }
}
function encodeCursor(data) {
  const value = Buffer.from(JSON.stringify(data)).toString('base64url');
  return `${value}.${cursorMac(value)}`;
}
async function ownNotification(req) {
  const item = await InboxNotification.findOne({ where: { id: req.params.notificationId, ...subject(req) } });
  if (!item) throw ApiError.notFound('Notification not found');
  return item;
}
exports.ingest = async (req, res) => {
  const name = req.body.eventName || req.body.eventType || '';
  if (req.body.producer !== 'ecommerce-server' || !['order', 'delivery', 'return', 'refund', 'catalog'].includes(name.split('.')[0])) {
    throw ApiError.forbidden('Only Commerce-owned events are accepted at this endpoint');
  }
  const result = await service.ingest(req.body);
  res.status(result.duplicate ? 200 : 202).json(result);
};
exports.inbox = async (req, res) => {
  const owner = subject(req);
  const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 25));
  const where = { ...owner };
  if (req.query.unread === 'true') where.readAt = null;
  const cursor = decodeCursor(req.query.after, owner);
  if (cursor) where[Op.or] = [{ createdAt: { [Op.lt]: new Date(cursor.createdAt) } },
    { createdAt: new Date(cursor.createdAt), id: { [Op.lt]: cursor.id } }];
  const rows = await InboxNotification.findAll({ where, order: [['createdAt', 'DESC'], ['id', 'DESC']], limit: limit + 1 });
  const hasMore = rows.length > limit; const page = rows.slice(0, limit); const last = page[page.length - 1];
  res.json({ data: page, page: { limit, hasMore, nextCursor: hasMore ? encodeCursor({
    owner: `${owner.recipientKind}:${owner.recipientId}`, id: last.id, createdAt: last.createdAt }) : null } });
};
exports.setRead = async (req, res) => {
  if (typeof req.body.read !== 'boolean') throw ApiError.validation([], 'read must be boolean');
  const item = await ownNotification(req);
  await item.update({ readAt: req.body.read ? (item.readAt || new Date()) : null });
  res.json({ data: item });
};
exports.getPreferences = async (req, res) => {
  const owner = subject(req);
  const item = await NotificationPreference.findOne({ where: owner });
  res.json({ data: item || { ...owner, locale: 'en', optionalEnabled: true, emailEnabled: false, telegramEnabled: false },
    mandatoryNotice: 'Security, legal and mandatory transactional in-app notices cannot be disabled.' });
};
exports.updatePreferences = async (req, res) => {
  const owner = subject(req); const allowed = ['locale', 'optionalEnabled', 'emailEnabled', 'telegramEnabled'];
  if (!Object.keys(req.body).length || Object.keys(req.body).some((key) => !allowed.includes(key))) throw ApiError.validation([], 'Unsupported preference');
  if (req.body.locale !== undefined && !['en', 'km'].includes(req.body.locale)) throw ApiError.validation([], 'Unsupported locale');
  for (const key of allowed.slice(1)) if (req.body[key] !== undefined && typeof req.body[key] !== 'boolean') throw ApiError.validation([], 'Preference must be boolean');
  const [item] = await NotificationPreference.findOrCreate({ where: owner, defaults: owner });
  await item.update(req.body);
  res.json({ data: item });
};
exports.deliveries = async (req, res) => {
  const item = await ownNotification(req);
  const data = await NotificationDelivery.findAll({ where: { notificationId: item.id },
    attributes: ['id', 'channel', 'status', 'attempts', 'nextAttemptAt', 'lastErrorCode', 'sentAt'] });
  res.json({ data });
};
exports.retry = async (req, res) => {
  const item = await ownNotification(req);
  const delivery = await NotificationDelivery.findOne({ where: { id: req.params.deliveryId, notificationId: item.id } });
  if (!delivery) throw ApiError.notFound('Delivery not found');
  if (delivery.status === 'failed_terminal') {
    await delivery.update({ status: 'failed_retryable', nextAttemptAt: new Date(), lockedUntil: null });
  }
  const result = await service.dispatch(delivery.id);
  res.json({ data: { id: result.id, channel: result.channel, status: result.status, attempts: result.attempts,
    nextAttemptAt: result.nextAttemptAt, lastErrorCode: result.lastErrorCode } });
};
exports.attempts = async (req, res) => {
  const item = await ownNotification(req);
  const delivery = await NotificationDelivery.findOne({ where: { id: req.params.deliveryId, notificationId: item.id } });
  if (!delivery) throw ApiError.notFound('Delivery not found');
  const data = await NotificationDeliveryAttempt.findAll({ where: { deliveryId: delivery.id },
    attributes: ['number', 'status', 'errorCode', 'createdAt'], order: [['number', 'ASC']] });
  res.json({ data });
};
