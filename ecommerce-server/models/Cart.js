// models/Cart.js (Updated)
const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const Cart = sequelize.define(
  "Cart",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    websiteId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    storeId: { type: DataTypes.UUID, allowNull: true },
    channel: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: 'marketplace',
      validate: {
        isIn: [['marketplace', 'storefront']],
      },
    },
    buyerId: { type: DataTypes.UUID, allowNull: true },
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    sessionId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    customerEmail: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isEmail: true
      }
    },
    // Cart totals (cached for performance)
    subtotal: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
    },
    taxTotal: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
    },
    discountTotal: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
    },
    total: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
    },
    // Currency
    currency: {
      type: DataTypes.STRING(3),
      defaultValue: 'USD',
    },
    // Cart metadata
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {},
    },
    // Abandoned cart tracking
    abandoned: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    lastActiveAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    version: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
  },
  {
    indexes: [
      { unique: true, fields: ["websiteId", "userId"] },
      { unique: true, fields: ["websiteId", "sessionId"] },
      { unique: true, fields: ["storeId", "buyerId", "channel"] },
      { fields: ["storeId", "sessionId", "channel"] },
      { fields: ["channel"] },
      { fields: ["websiteId", "channel"] },
      { fields: ["abandoned"] },
      { fields: ["lastActiveAt"] },
      { fields: ["version"] },
    ],
    hooks: {
      beforeValidate: (cart) => {
        if (cart.websiteId && (!cart.channel || cart.channel === 'marketplace')) {
          cart.channel = 'storefront';
        }
      },
      beforeUpdate: (cart) => {
        cart.lastActiveAt = new Date();
      }
    }
  }
);

module.exports = Cart;
