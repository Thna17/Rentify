// ecommerce-server/models/InventoryLedgerEntry.js
// P3-INV-001: Append-only immutable inventory ledger entries with idempotency and source attribution.
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const InventoryLedgerEntry = sequelize.define('InventoryLedgerEntry', {
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
  },
  storeId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  skuId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  sku: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  productId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  idempotencyKey: {
    type: DataTypes.STRING(128),
    allowNull: false,
    unique: true,
  },
  changeOnHand: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  changeReserved: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  balanceOnHandAfter: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  balanceReservedAfter: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  balanceAvailableAfter: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  reasonCode: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  sourceType: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  sourceId: {
    type: DataTypes.STRING(128),
    allowNull: false,
  },
  actorType: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  actorId: {
    type: DataTypes.STRING(128),
    allowNull: false,
  },
  correlationId: {
    type: DataTypes.STRING(128),
    allowNull: true,
  },
  monetaryContext: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  indexes: [
    { unique: true, fields: ['idempotencyKey'], name: 'uq_inventory_ledger_idempotency' },
    { fields: ['storeId', 'skuId'] },
    { fields: ['skuId', 'createdAt'] },
    { fields: ['sourceType', 'sourceId'] },
    { fields: ['correlationId'] },
  ],
});

module.exports = InventoryLedgerEntry;
