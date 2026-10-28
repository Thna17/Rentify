// ecommerce-server/models/InventoryBalance.js
// P3-INV-001: SKU-level authoritative inventory balance with optimistic concurrency.
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const InventoryBalance = sequelize.define('InventoryBalance', {
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
  onHand: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: { min: 0 },
  },
  reserved: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: { min: 0 },
  },
  available: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: { min: 0 },
  },
  version: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
}, {
  indexes: [
    { unique: true, fields: ['storeId', 'skuId'], name: 'uq_inventory_balance_store_sku' },
    { fields: ['skuId'] },
    { fields: ['productId'] },
    { fields: ['storeId'] },
  ],
});

module.exports = InventoryBalance;
