// rentify-server/src/migrations/20261025_014_standard_events.js
// Migration 014: P3-EVT-001 Standard Event Outbox, Inbox, and Replay Audit tables.
const { DataTypes } = require('sequelize');

exports.up = async (contextOrQueryInterface, maybeSequelize) => {
  const queryInterface = contextOrQueryInterface.queryInterface || contextOrQueryInterface;
  const existingTables = (await queryInterface.showAllTables()).map((t) => String(t).toLowerCase());

  // 1. Create EventOutboxes
  if (!existingTables.includes('eventoutboxes')) {
    await queryInterface.createTable('EventOutboxes', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      eventId: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
      },
      eventType: {
        type: DataTypes.STRING(120),
        allowNull: false,
      },
      schemaVersion: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: '1.0.0',
      },
      aggregateType: {
        type: DataTypes.STRING(64),
        allowNull: false,
      },
      aggregateId: {
        type: DataTypes.STRING(64),
        allowNull: false,
      },
      aggregateVersion: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      occurredAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      producer: {
        type: DataTypes.STRING(64),
        allowNull: false,
      },
      correlationId: {
        type: DataTypes.STRING(128),
        allowNull: true,
      },
      causationId: {
        type: DataTypes.STRING(128),
        allowNull: true,
      },
      storeId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      payload: {
        type: DataTypes.JSON,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM('pending', 'publishing', 'published', 'failed', 'dead_letter'),
        allowNull: false,
        defaultValue: 'pending',
      },
      attempts: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      maxAttempts: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 5,
      },
      nextAttemptAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      lastError: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      errorClassification: {
        type: DataTypes.ENUM('transient', 'fatal', 'poison'),
        allowNull: true,
      },
      publishedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    });

    await queryInterface.addIndex('EventOutboxes', ['status', 'nextAttemptAt']).catch(() => {});
    await queryInterface.addIndex('EventOutboxes', ['aggregateType', 'aggregateId', 'aggregateVersion']).catch(() => {});
    await queryInterface.addIndex('EventOutboxes', ['storeId']).catch(() => {});
    await queryInterface.addIndex('EventOutboxes', ['correlationId']).catch(() => {});
  }

  // 2. Create EventInboxes
  if (!existingTables.includes('eventinboxes')) {
    await queryInterface.createTable('EventInboxes', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      eventId: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
      },
      eventType: {
        type: DataTypes.STRING(120),
        allowNull: false,
      },
      schemaVersion: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: '1.0.0',
      },
      aggregateType: {
        type: DataTypes.STRING(64),
        allowNull: false,
      },
      aggregateId: {
        type: DataTypes.STRING(64),
        allowNull: false,
      },
      aggregateVersion: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      occurredAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      producer: {
        type: DataTypes.STRING(64),
        allowNull: false,
      },
      consumer: {
        type: DataTypes.STRING(64),
        allowNull: false,
      },
      correlationId: {
        type: DataTypes.STRING(128),
        allowNull: true,
      },
      causationId: {
        type: DataTypes.STRING(128),
        allowNull: true,
      },
      storeId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      payload: {
        type: DataTypes.JSON,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM('received', 'processing', 'processed', 'ignored', 'dead_letter'),
        allowNull: false,
        defaultValue: 'received',
      },
      attempts: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      maxAttempts: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 5,
      },
      nextAttemptAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      lastError: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      errorClassification: {
        type: DataTypes.ENUM('transient', 'fatal', 'poison'),
        allowNull: true,
      },
      processedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    });

    await queryInterface.addIndex('EventInboxes', ['status', 'nextAttemptAt']).catch(() => {});
    await queryInterface.addIndex('EventInboxes', ['aggregateType', 'aggregateId', 'aggregateVersion']).catch(() => {});
    await queryInterface.addIndex('EventInboxes', ['storeId']).catch(() => {});
    await queryInterface.addIndex('EventInboxes', ['correlationId']).catch(() => {});
  }

  // 3. Create EventReplayAudits
  if (!existingTables.includes('eventreplayaudits')) {
    await queryInterface.createTable('EventReplayAudits', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      replayId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      actorId: {
        type: DataTypes.STRING(128),
        allowNull: false,
      },
      eventId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      eventType: {
        type: DataTypes.STRING(120),
        allowNull: false,
      },
      aggregateType: {
        type: DataTypes.STRING(64),
        allowNull: false,
      },
      aggregateId: {
        type: DataTypes.STRING(64),
        allowNull: false,
      },
      target: {
        type: DataTypes.ENUM('outbox', 'inbox'),
        allowNull: false,
      },
      reason: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM('initiated', 'success', 'failed'),
        allowNull: false,
        defaultValue: 'initiated',
      },
      error: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      correlationId: {
        type: DataTypes.STRING(128),
        allowNull: true,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    });

    await queryInterface.addIndex('EventReplayAudits', ['replayId']).catch(() => {});
    await queryInterface.addIndex('EventReplayAudits', ['eventId']).catch(() => {});
    await queryInterface.addIndex('EventReplayAudits', ['actorId', 'createdAt']).catch(() => {});
    await queryInterface.addIndex('EventReplayAudits', ['aggregateType', 'aggregateId']).catch(() => {});
  }
};

exports.down = async (contextOrQueryInterface) => {
  const queryInterface = contextOrQueryInterface.queryInterface || contextOrQueryInterface;
  await queryInterface.dropTable('EventReplayAudits').catch(() => {});
  await queryInterface.dropTable('EventInboxes').catch(() => {});
  await queryInterface.dropTable('EventOutboxes').catch(() => {});
};
