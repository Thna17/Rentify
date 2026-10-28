'use strict';
const { DataTypes: T } = require('sequelize');
const id = () => ({ type: T.UUID, primaryKey: true, defaultValue: T.UUIDV4 });
const str = (n, allowNull = false) => ({ type: T.STRING(n), allowNull });
const uuid = (allowNull = false) => ({ type: T.UUID, allowNull });
const date = (allowNull = true) => ({ type: T.DATE, allowNull });
const timestamps = (updated = true) => ({ createdAt: date(false), ...(updated ? { updatedAt: date(false) } : {}) });
const tables = [
  ['InboxNotifications', { id: id(), eventId: uuid(), eventName: str(120), schemaVersion: str(20),
    recipientKind: str(20), recipientId: str(128), storeId: uuid(true), aggregateType: str(64), aggregateId: str(128),
    templateKey: str(120), templateVersion: { type: T.INTEGER, allowNull: false }, locale: str(8), title: str(255),
    body: str(500), mandatory: { type: T.BOOLEAN, allowNull: false }, correlationId: str(128),
    sourceOccurredAt: date(false), readAt: date(), ...timestamps() }, [
    { fields: ['eventId', 'recipientKind', 'recipientId'], unique: true, name: 'uq_notification_event_recipient' },
    { fields: ['recipientKind', 'recipientId', 'createdAt', 'id'] }]],
  ['NotificationPreferences', { id: id(), recipientKind: str(20), recipientId: str(128), locale: { ...str(8), defaultValue: 'en' },
    optionalEnabled: { type: T.BOOLEAN, allowNull: false, defaultValue: true },
    emailEnabled: { type: T.BOOLEAN, allowNull: false, defaultValue: false },
    telegramEnabled: { type: T.BOOLEAN, allowNull: false, defaultValue: false }, ...timestamps() },
  [{ fields: ['recipientKind', 'recipientId'], unique: true, name: 'uq_notification_preference_subject' }]],
  ['NotificationDeliveries', { id: id(), notificationId: { ...uuid(), references: { model: 'InboxNotifications', key: 'id' }, onDelete: 'RESTRICT' },
    channel: str(20), dedupeKey: { ...str(64), unique: true }, status: { ...str(24), defaultValue: 'pending' },
    attempts: { type: T.INTEGER, allowNull: false, defaultValue: 0 }, nextAttemptAt: date(), lastErrorCode: str(64, true), lockedUntil: date(),
    providerReference: str(128, true), sentAt: date(), ...timestamps() }, [
    { fields: ['notificationId', 'channel'], unique: true, name: 'uq_notification_delivery_channel' },
    { fields: ['status', 'nextAttemptAt'] }]],
  ['NotificationDeliveryAttempts', { id: id(), deliveryId: { ...uuid(), references: { model: 'NotificationDeliveries', key: 'id' }, onDelete: 'RESTRICT' },
    number: { type: T.INTEGER, allowNull: false }, status: str(24), errorCode: str(64, true),
    providerReference: str(128, true), ...timestamps(false) },
  [{ fields: ['deliveryId', 'number'], unique: true, name: 'uq_notification_attempt_number' }]],
  ['NotificationSourceEvents', { id: { type: T.UUID, primaryKey: true }, eventName: str(120),
    payloadHash: str(64), correlationId: str(128), ...timestamps(false) }, []],
];
exports.up = async ({ queryInterface }) => {
  const existing = (await queryInterface.showAllTables()).map((item) => String(item).toLowerCase());
  for (const [name, columns, indexes] of tables) {
    if (existing.includes(name.toLowerCase())) continue;
    await queryInterface.createTable(name, columns);
    for (const index of indexes) await queryInterface.addIndex(name, index.fields, index);
  }
};
exports.down = async ({ queryInterface }) => {
  const existing = (await queryInterface.showAllTables()).map((item) => String(item).toLowerCase());
  for (const [name] of [...tables].reverse()) if (existing.includes(name.toLowerCase())) await queryInterface.dropTable(name);
};
