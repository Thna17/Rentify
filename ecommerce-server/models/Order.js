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
      allowNull: true,
    },
    storeId: { type: DataTypes.UUID, allowNull: true },
    buyerId: { type: DataTypes.UUID, allowNull: true },
    checkoutKey: { type: DataTypes.STRING(64), allowNull: true, unique: true },
    salesChannel: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'storefront' },
    deliveryStatus: { type: DataTypes.STRING(24), allowNull: false, defaultValue: 'pending' },
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
    stockReserved: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: "P3-INV-002: Whether order items currently hold an active stock reservation",
    },
    stockRestocked: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: "P3-INV-002: Whether return items have been physically restocked into inventory",
    },
    currency: {
      type: DataTypes.STRING(3),
      defaultValue: "USD",
    },
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {},
    },
    orderSnapshot: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: "P3-MNY-001: Immutable order-level money and policy snapshot",
    },
    fulfillmentStatus: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: "unfulfilled",
      comment: "P3-ORD-001: Explicit fulfillment state",
    },
    returnStatus: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: "none",
      comment: "P3-ORD-001: Explicit return state",
    },
    cancellationReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "P3-ORD-001: Cancellation reason",
    },
    cancelledAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "P3-ORD-001: Cancellation timestamp",
    },
    confirmedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "P3-ORD-001: Confirmation timestamp",
    },
    deliveredAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "P3-ORD-001: Physical delivery timestamp",
    },
    fulfillmentNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "P3-ORD-001: Fulfillment notes",
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
      { fields: ["fulfillmentStatus"] },
      { fields: ["returnStatus"] },
      { fields: ["websiteId"] },
      { fields: ["buyerId", "createdAt"] },
      { fields: ["storeId", "createdAt"] },
      { fields: ["userId"] },
      { fields: ["sessionId"] },
      { fields: ["orderNiche"] },
      { fields: ["orderType"] },
      { fields: ["createdAt"] }
    ],
    hooks: {
      beforeUpdate: (order, options) => {
        if (order.changed('status') || order.changed('fulfillmentStatus') || order.changed('returnStatus')) {
          if (!options?.byStateMachine && !options?.allowDirectStateAssignment) {
            const err = new Error('Direct assignment of protected order state is prohibited. Use orderStateMachineService.');
            err.name = 'OrderStateError';
            err.code = 'DIRECT_ASSIGNMENT_PROHIBITED';
            throw err;
          }
        }
        order.version = order.version + 1;
      },
      beforeBulkUpdate: (options) => {
        const fields = options.attributes || options.fields || {};
        const changedFields = Array.isArray(fields) ? fields : Object.keys(fields);
        const touchesProtected = changedFields.some((f) => ['status', 'fulfillmentStatus', 'returnStatus'].includes(f));
        if (touchesProtected && !options?.byStateMachine && !options?.allowDirectStateAssignment) {
          const err = new Error('Direct assignment of protected order state is prohibited. Use orderStateMachineService.');
          err.name = 'OrderStateError';
          err.code = 'DIRECT_ASSIGNMENT_PROHIBITED';
          throw err;
        }
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
