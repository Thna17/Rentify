const crypto = require('crypto');
const { Op, literal } = require('sequelize');
const { InboxNotification, NotificationPreference, NotificationDelivery, NotificationDeliveryAttempt,
  NotificationSourceEvent, EventOutbox, Store, Staff, User, SupportCase, PlatformRoleGrant } = require('../../models');
const { ApiError } = require('../../utils/errors');

const EVENT_NAMES = Object.freeze([
  'seller.review.submitted.v1', 'seller.review.needs_changes.v1', 'seller.review.approved.v1',
  'seller.review.rejected.v1', 'seller.marketplace_suspended.v1', 'catalog.product.held.v1',
  'catalog.product.rejected.v1', 'catalog.appeal.updated.v1', 'order.placed.v1', 'order.accepted.v1',
  'delivery.out_for_delivery.v1', 'delivery.delivered.v1', 'delivery.failed.v1', 'return.requested.v1',
  'return.updated.v1', 'refund.confirmed.v1', 'support.case.opened.v1', 'support.case.assigned.v1',
  'support.case.deadline_approaching.v1', 'support.case.deadline_breached.v1', 'support.case.escalated.v1',
  'support.case.resolved.v1', 'support.case.reopened.v1', 'subscription.trial_started.v1',
  'subscription.renewal_due.v1', 'subscription.payment_failed.v1', 'subscription.grace_started.v1',
  'subscription.suspended.v1', 'subscription.cancelled.v1', 'security.new_session.v1',
  'security.mfa_changed.v1', 'security.contact_changed.v1', 'security.role_changed.v1',
  'security.break_glass_started.v1', 'security.break_glass_ended.v1', 'legal.notice.v1',
]);
const FAMILY_TEMPLATES = Object.freeze({
  seller: { en: ['Seller review update', 'Your seller review has an update.'], km: ['ព័ត៌មានថ្មីអំពីការពិនិត្យអ្នកលក់', 'ការពិនិត្យអ្នកលក់របស់អ្នកមានព័ត៌មានថ្មី។'] },
  catalog: { en: ['Catalog update', 'A catalog item has an update.'], km: ['ព័ត៌មានថ្មីអំពីផលិតផល', 'ផលិតផលមានព័ត៌មានថ្មី។'] },
  order: { en: ['Order update', 'An order has an update.'], km: ['ព័ត៌មានថ្មីអំពីការបញ្ជាទិញ', 'ការបញ្ជាទិញមានព័ត៌មានថ្មី។'] },
  delivery: { en: ['Delivery update', 'A delivery has an update.'], km: ['ព័ត៌មានថ្មីអំពីការដឹកជញ្ជូន', 'ការដឹកជញ្ជូនមានព័ត៌មានថ្មី។'] },
  return: { en: ['Return update', 'A return has an update.'], km: ['ព័ត៌មានថ្មីអំពីការត្រឡប់ទំនិញ', 'ការត្រឡប់ទំនិញមានព័ត៌មានថ្មី។'] },
  refund: { en: ['Refund update', 'A refund has an update.'], km: ['ព័ត៌មានថ្មីអំពីការសងប្រាក់', 'ការសងប្រាក់មានព័ត៌មានថ្មី។'] },
  support: { en: ['Support case update', 'A support case has an update.'], km: ['ព័ត៌មានថ្មីអំពីករណីជំនួយ', 'ករណីជំនួយមានព័ត៌មានថ្មី។'] },
  subscription: { en: ['Subscription update', 'Your subscription has an update.'], km: ['ព័ត៌មានថ្មីអំពីការជាវ', 'ការជាវរបស់អ្នកមានព័ត៌មានថ្មី។'] },
  security: { en: ['Security notice', 'Your account security has an update.'], km: ['សេចក្ដីជូនដំណឹងសុវត្ថិភាព', 'សុវត្ថិភាពគណនីរបស់អ្នកមានព័ត៌មានថ្មី។'] },
  legal: { en: ['Important notice', 'An important notice is available.'], km: ['សេចក្ដីជូនដំណឹងសំខាន់', 'មានសេចក្ដីជូនដំណឹងសំខាន់។'] },
});
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const digest = (value) => crypto.createHash('sha256').update(value).digest('hex');
const stable = (value) => Array.isArray(value) ? value.map(stable) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])])) : value;
function policy(eventName) {
  const family = eventName.split('.')[0];
  const mandatory = ['order', 'delivery', 'return', 'refund', 'security', 'legal'].includes(family)
    || ['support.case.deadline_approaching.v1', 'support.case.deadline_breached.v1', 'support.case.resolved.v1',
      'subscription.payment_failed.v1', 'subscription.grace_started.v1', 'subscription.suspended.v1',
      'subscription.cancelled.v1'].includes(eventName);
  return { family, mandatory, templateKey: eventName.replace(/\.v1$/, ''), templateVersion: 1 };
}
function validateEvent(input) {
  const name = input.eventName || input.eventType;
  if (!UUID.test(input.eventId || '') || !EVENT_NAMES.includes(name) || input.schemaVersion !== '1.0.0' ||
    !input.aggregateId || !input.aggregateType || !Number.isSafeInteger(input.aggregateVersion) || input.aggregateVersion < 1 ||
    !input.occurredAt || Number.isNaN(Date.parse(input.occurredAt)) || !input.producer || !input.correlationId) {
    throw ApiError.validation([], 'Invalid notification source event');
  }
  const family = policy(name).family;
  if (['order', 'delivery', 'return', 'refund', 'catalog'].includes(family) && input.producer !== 'ecommerce-server') {
    throw ApiError.forbidden('Commerce event must originate from Commerce');
  }
  if (['support', 'security', 'seller', 'subscription', 'legal'].includes(family) && input.producer !== 'rentify-server') {
    throw ApiError.forbidden('Core event must originate from Core');
  }
  const payload = input.data || input.payload || {};
  const permitted = ['buyerSubjectId', 'affectedSubjectId', 'caseId', 'assigneeSubjectId'];
  const safe = Object.fromEntries(permitted.filter((key) => typeof payload[key] === 'string')
    .map((key) => [key, payload[key].slice(0, 128)]));
  return { eventId: input.eventId, eventName: name, schemaVersion: '1.0.0', aggregateType: String(input.aggregateType).slice(0, 64),
    aggregateId: String(input.aggregateId).slice(0, 128), aggregateVersion: input.aggregateVersion,
    occurredAt: new Date(input.occurredAt).toISOString(), producer: input.producer,
    correlationId: String(input.correlationId).slice(0, 128), storeId: input.storeId || null, data: safe };
}
async function resolveRecipients(event, transaction) {
  const { family } = policy(event.eventName);
  const recipients = [];
  const add = (kind, id) => { if (id) recipients.push({ kind, id: String(id) }); };
  if (['security', 'legal'].includes(family)) {
    if (!UUID.test(event.data.affectedSubjectId || '')) throw ApiError.validation([], 'Affected subject cannot be resolved');
    const user = await User.findByPk(event.data.affectedSubjectId, { attributes: ['id'], transaction });
    if (!user) throw ApiError.validation([], 'Affected subject cannot be resolved');
    add('user', user.id);
    if (family === 'security' && ['security.role_changed.v1', 'security.break_glass_started.v1',
      'security.break_glass_ended.v1'].includes(event.eventName)) {
      const administrators = await User.findAll({ where: { role: 'admin' }, attributes: ['id'], transaction });
      const grants = await PlatformRoleGrant.findAll({ where: { role: 'platform_admin', status: 'active', scopeType: 'platform' },
        attributes: ['userId'], transaction });
      for (const admin of administrators) add('user', admin.id);
      for (const grant of grants) add('user', grant.userId);
    }
  } else if (family === 'support') {
    const item = await SupportCase.findByPk(event.data.caseId || event.aggregateId, { transaction });
    if (!item || (event.storeId && item.storeId !== event.storeId)) throw ApiError.validation([], 'Support case cannot be resolved');
    const assignee = event.eventName === 'support.case.assigned.v1' ? event.data.assigneeSubjectId : item.assigneeSubjectId;
    if (assignee) add('user', assignee);
    if (event.eventName !== 'support.case.assigned.v1' && item.requesterKind === 'buyer') add('buyer', item.requesterSubjectId);
    else if (event.eventName !== 'support.case.assigned.v1' && item.requesterSubjectId && await User.findByPk(item.requesterSubjectId, { attributes: ['id'], transaction })) add('user', item.requesterSubjectId);
    if (event.eventName !== 'support.case.assigned.v1' && item.storeId) {
      const store = await Store.findByPk(item.storeId, { attributes: ['id', 'ownerUserId'], transaction });
      if (store) add('user', store.ownerUserId);
    }
  } else {
    if (!UUID.test(event.storeId || '')) throw ApiError.validation([], 'Authoritative Store ID is required');
    const store = await Store.findByPk(event.storeId, { attributes: ['id', 'ownerUserId'], transaction });
    if (!store) throw ApiError.validation([], 'Store cannot be resolved');
    add('user', store.ownerUserId);
    const staff = await Staff.findAll({ where: { storeId: store.id, isActive: true }, attributes: ['id', 'permissions'], transaction });
    const requiredPermission = ['catalog', 'seller'].includes(family) ? 'manage_products'
      : family === 'subscription' ? 'manage_settings' : 'manage_orders';
    for (const member of staff) if (Array.isArray(member.permissions) && member.permissions.includes(requiredPermission)) add('staff', member.id);
    if (['order', 'delivery', 'return', 'refund'].includes(family)) {
      if (!event.data.buyerSubjectId) throw ApiError.validation([], 'Commerce buyer subject ID is required');
      add('buyer', event.data.buyerSubjectId);
    }
  }
  const unique = new Map(recipients.map((recipient) => [`${recipient.kind}:${recipient.id}`, recipient]));
  if (!unique.size) throw ApiError.validation([], 'Notification recipients cannot be resolved');
  return [...unique.values()];
}
async function ingest(input) {
  const event = validateEvent(input);
  const payloadHash = digest(JSON.stringify(stable(event)));
  const processEvent = async (transaction) => {
    const existing = await NotificationSourceEvent.findByPk(event.eventId, { transaction });
    if (existing) {
      if (existing.payloadHash !== payloadHash) throw ApiError.conflict('Event ID was reused with a different payload', 'IDEMPOTENCY_CONFLICT');
      return { duplicate: true, count: 0 };
    }
    await NotificationSourceEvent.create({ id: event.eventId, eventName: event.eventName, payloadHash,
      correlationId: event.correlationId }, { transaction });
    const recipients = await resolveRecipients(event, transaction);
    const rule = policy(event.eventName);
    for (const recipient of recipients) {
      const preference = await NotificationPreference.findOne({ where: { recipientKind: recipient.kind, recipientId: recipient.id }, transaction });
      const locale = preference?.locale === 'km' ? 'km' : 'en';
      const [title, body] = FAMILY_TEMPLATES[rule.family][locale];
      const notification = await InboxNotification.create({ eventId: event.eventId, eventName: event.eventName,
        schemaVersion: event.schemaVersion, recipientKind: recipient.kind, recipientId: recipient.id,
        storeId: event.storeId, aggregateType: event.aggregateType, aggregateId: event.aggregateId,
        templateKey: rule.templateKey, templateVersion: rule.templateVersion, locale, title, body,
        mandatory: rule.mandatory, correlationId: event.correlationId, sourceOccurredAt: event.occurredAt }, { transaction });
      for (const channel of ['email', 'telegram']) {
        if (!preference?.[`${channel}Enabled`]) continue;
        const suppressed = !rule.mandatory && preference.optionalEnabled === false;
        const dedupeKey = digest(JSON.stringify([event.eventId, rule.templateKey, rule.templateVersion, recipient.kind, recipient.id, channel]));
        await NotificationDelivery.create({ notificationId: notification.id, channel, dedupeKey,
          status: suppressed ? 'suppressed' : 'pending', nextAttemptAt: suppressed ? null : new Date() }, { transaction });
      }
    }
    return { duplicate: false, count: recipients.length };
  };
  try { return await InboxNotification.sequelize.transaction(processEvent); }
  catch (error) {
    if (error.name !== 'SequelizeUniqueConstraintError') throw error;
    const existing = await NotificationSourceEvent.findByPk(event.eventId);
    if (existing && existing.payloadHash === payloadHash) return { duplicate: true, count: 0 };
    throw ApiError.conflict('Event ID already exists', 'IDEMPOTENCY_CONFLICT');
  }
}

const providers = new Map();
function registerProvider(channel, adapter) {
  if (!['email', 'telegram'].includes(channel) || typeof adapter?.send !== 'function') throw new Error('Invalid notification provider');
  providers.set(channel, adapter);
}
async function dispatch(deliveryId, { now = new Date(), maxAttempts = 5 } = {}) {
  const delivery = await NotificationDelivery.findByPk(deliveryId);
  if (!delivery) throw ApiError.notFound('Delivery not found');
  if (['sent', 'delivered', 'suppressed', 'failed_terminal'].includes(delivery.status)) return delivery;
  if (delivery.nextAttemptAt && new Date(delivery.nextAttemptAt) > now) return delivery;
  const [claimed] = await NotificationDelivery.update({ status: 'sending', lockedUntil: new Date(now.getTime() + 60000) },
    { where: { id: delivery.id, attempts: delivery.attempts, [Op.or]: [
      { status: { [Op.in]: ['pending', 'failed_retryable'] } },
      { status: 'sending', lockedUntil: { [Op.lte]: now } },
    ] } });
  if (!claimed) return NotificationDelivery.findByPk(delivery.id);
  const notification = await InboxNotification.findByPk(delivery.notificationId);
  const number = delivery.attempts + 1;
  try {
    const adapter = providers.get(delivery.channel);
    if (!adapter) throw Object.assign(new Error('Provider is not configured'), { safeCode: 'PROVIDER_UNAVAILABLE' });
    const result = await adapter.send({ notification, idempotencyKey: delivery.dedupeKey });
    const reference = typeof result?.reference === 'string' && /^[a-zA-Z0-9_.:-]{1,128}$/.test(result.reference) ? result.reference : null;
    await NotificationDelivery.sequelize.transaction(async (transaction) => {
      await NotificationDeliveryAttempt.create({ deliveryId: delivery.id, number, status: 'sent', providerReference: reference }, { transaction });
      await delivery.update({ status: 'sent', attempts: number, providerReference: reference, lastErrorCode: null,
        nextAttemptAt: null, lockedUntil: null, sentAt: now }, { transaction });
    });
  } catch (error) {
    const code = /^[A-Z0-9_]{1,64}$/.test(error.safeCode || '') ? error.safeCode : 'PROVIDER_ERROR';
    const terminal = number >= maxAttempts || error.retryable === false;
    const nextAttemptAt = terminal ? null : new Date(now.getTime() + Math.min(3600000, 1000 * 2 ** Math.min(number, 12)));
    await NotificationDelivery.sequelize.transaction(async (transaction) => {
      await NotificationDeliveryAttempt.create({ deliveryId: delivery.id, number,
        status: terminal ? 'failed_terminal' : 'failed_retryable', errorCode: code }, { transaction });
      await delivery.update({ status: terminal ? 'failed_terminal' : 'failed_retryable', attempts: number,
        lastErrorCode: code, nextAttemptAt, lockedUntil: null }, { transaction });
    });
  }
  return delivery;
}
async function processPending({ limit = 50, now = new Date() } = {}) {
  const rows = await NotificationDelivery.findAll({ where: { [Op.or]: [
    { status: { [Op.in]: ['pending', 'failed_retryable'] }, nextAttemptAt: { [Op.lte]: now } },
    { status: 'sending', lockedUntil: { [Op.lte]: now } },
  ] }, order: [['createdAt', 'ASC']], limit });
  for (const row of rows) await dispatch(row.id, { now });
  return rows.length;
}
async function consumeCoreEvents({ limit = 50 } = {}) {
  const coreNames = EVENT_NAMES.filter((name) => ['seller', 'support', 'subscription', 'security', 'legal'].includes(name.split('.')[0]));
  const rows = await EventOutbox.findAll({ where: { producer: 'rentify-server', eventType: { [Op.in]: coreNames },
    eventId: { [Op.notIn]: literal('(SELECT id FROM NotificationSourceEvents)') } },
  order: [['createdAt', 'ASC']], limit });
  const failures = [];
  for (const event of rows) {
    try { await ingest(event.toJSON()); }
    catch (error) { failures.push({ eventId: event.eventId, code: error.code || 'NOTIFICATION_PROCESSING_FAILED' }); }
  }
  return { checked: rows.length, failures };
}
module.exports = { EVENT_NAMES, FAMILY_TEMPLATES, policy, validateEvent, resolveRecipients, ingest, registerProvider,
  dispatch, processPending, consumeCoreEvents };
