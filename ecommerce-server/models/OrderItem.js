// models/OrderItem.js - ENHANCED
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const OrderItem = sequelize.define('OrderItem', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  orderId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Orders',
      key: 'id'
    }
  },
  productId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  variantId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: "ProductVariants",
      key: "id",
    },
  },
  variantName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  name: DataTypes.STRING,
  sku: DataTypes.STRING,
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  basePrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  total: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  baseCurrency: {
    type: DataTypes.STRING(3),
    defaultValue: 'USD',
  },
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'USD',
  },
  // Enhanced variant and option support
  selectedOptions: {
    type: DataTypes.JSON,
    defaultValue: {},
  },
  // Customizations with niche-specific structure
  customizations: {
    type: DataTypes.JSON,
    defaultValue: {},
  },
  // Niche-specific item metadata
  itemMetadata: {
    type: DataTypes.JSON,
    defaultValue: {}
  },
  // Fulfillment
  fulfilled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  fulfilledQuantity: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  // Preparation status (for restaurants/cafe)
  preparationStatus: {
    type: DataTypes.ENUM('not_started', 'preparing', 'ready', 'served'),
    defaultValue: 'not_started'
  },
  // Special instructions
  specialInstructions: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  indexes: [
    { fields: ["orderId"] },
    { fields: ["productId"] },
    { fields: ["variantId"] },
    { fields: ["preparationStatus"] }
  ]
});

module.exports = OrderItem;