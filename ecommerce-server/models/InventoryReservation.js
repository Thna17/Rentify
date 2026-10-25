// ecommerce-server/models/InventoryReservation.js
// P3-INV-001: Temporary stock reservations with TTL expiry, release, and fulfillment tracking.
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const InventoryReservation = sequelize.define('InventoryReservation', {
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
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 1 },
  },
  status: {
    type: DataTypes.ENUM('active', 'released', 'fulfilled', 'expired'),
    allowNull: false,
    defaultValue: 'active',
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
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  releasedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  fulfilledAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  indexes: [
    { fields: ['storeId', 'skuId', 'status'] },
    { fields: ['status', 'expiresAt'] },
    { fields: ['sourceType', 'sourceId'] },
  ],
});

module.exports = InventoryReservation;
