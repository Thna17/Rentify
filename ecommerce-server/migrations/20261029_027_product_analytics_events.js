'use strict';

const { DataTypes } = require('sequelize');

exports.up = async (contextOrQueryInterface) => {
  const queryInterface = contextOrQueryInterface.queryInterface || contextOrQueryInterface;
  if (await queryInterface.tableExists('ProductAnalyticsEvents')) return;
  await queryInterface.createTable('ProductAnalyticsEvents', {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4, allowNull: false },
    eventId: { type: DataTypes.UUID, allowNull: false, unique: true },
    eventName: { type: DataTypes.STRING(120), allowNull: false },
    schemaVersion: { type: DataTypes.STRING(20), allowNull: false },
    catalogVersion: { type: DataTypes.STRING(20), allowNull: false },
    source: { type: DataTypes.STRING(32), allowNull: false, defaultValue: 'browser' },
    storeId: { type: DataTypes.UUID, allowNull: true },
    channel: { type: DataTypes.STRING(24), allowNull: false },
    locale: { type: DataTypes.STRING(8), allowNull: true },
    properties: { type: DataTypes.JSON, allowNull: false },
    measures: { type: DataTypes.JSON, allowNull: false },
    occurredAt: { type: DataTypes.DATE, allowNull: false },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  });
  await queryInterface.addIndex('ProductAnalyticsEvents', ['eventName', 'occurredAt'], {
    name: 'idx_product_analytics_name_time',
  });
  await queryInterface.addIndex('ProductAnalyticsEvents', ['storeId', 'occurredAt'], {
    name: 'idx_product_analytics_store_time',
  });
};

exports.down = async (contextOrQueryInterface) => {
  const queryInterface = contextOrQueryInterface.queryInterface || contextOrQueryInterface;
  if (await queryInterface.tableExists('ProductAnalyticsEvents')) {
    await queryInterface.dropTable('ProductAnalyticsEvents');
  }
};
