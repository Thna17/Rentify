// models/Order.js - ENHANCED
const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");
const { generateOrderNumber } = require('../utils/generateOrderNumber')

const Order = sequelize.define(
  "Order",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    orderNumber: {
      type: DataTypes.STRING,
      // unique: true,
    },
    websiteId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    sessionId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    // Niche-specific order type
    orderNiche: {
      type: DataTypes.ENUM('ecommerce', 'restaurant', 'fashion', 'skincare', 'cafe'),
      allowNull: false,
      defaultValue: 'ecommerce'
    },
    // Totals
    subtotal: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
    },
    discountTotal: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
    },
    taxTotal: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
    },
    shippingFee: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
    },
    totalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    // Order status
    status: {
      type: DataTypes.ENUM(
        "pending",
        "confirmed",
        "processing",
        "cancelled",
        "completed",
        "fulfilled",
        "refunded",
        "preparing", // For restaurants/cafe
        "ready_for_pickup", // For restaurants/cafe
        "out_for_delivery" // For restaurants/cafe
      ),
      defaultValue: "pending",
    },
    orderType: {
      type: DataTypes.ENUM("online", "pos", "manual", "delivery", "pickup"),
      defaultValue: "online",
    },
    // Staff information
    cashierId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    // Customer information
    customerInfo: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    // Niche-specific metadata
    nicheMetadata: {
      type: DataTypes.JSON,
      defaultValue: {}
    },
    // Shipping/Delivery information
    shippingInfo: {
      type: DataTypes.JSON,
      defaultValue: {}
    },
    // Timing information
    preparationTime: {
      type: DataTypes.INTEGER, // in minutes
      allowNull: true
    },
    estimatedDelivery: {
      type: DataTypes.DATE,
      allowNull: true
    },
    // Tracking
    trackingNumber: DataTypes.STRING,
    stockDeducted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    currency: {
      type: DataTypes.STRING(3),
      defaultValue: "USD",
    },
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {},
    },
    version: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
  },
  {
    indexes: [
      { fields: ["status"] },
      { fields: ["websiteId"] },
      { fields: ["userId"] },
      { fields: ["sessionId"] },
      { fields: ["orderNiche"] },
      { fields: ["orderType"] },
      { fields: ["createdAt"] }
    ],
    hooks: {
      beforeUpdate: (order) => {
        order.version = order.version + 1;
      },
      beforeCreate: async (order) => {
        let isUnique = false;
        let attempts = 0;
        while (!isUnique && attempts < 5) {
          const generated = generateOrderNumber();
          const existing = await Order.findOne({ where: { orderNumber: generated } });
          if (!existing) {
            order.orderNumber = generated;
            isUnique = true;
          } else {
            attempts++;
          }
        }
        if (!isUnique) {
          throw new Error("Failed to generate unique order number after multiple attempts");
        }
      },
    },
  }
);

module.exports = Order;