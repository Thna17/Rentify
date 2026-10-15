const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const Payment = sequelize.define("Payment", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  orderId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Orders',
      key: 'id'
    }
  },
  storeId: { type: DataTypes.UUID, allowNull: true },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  paymentMethod: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM(
      "pending",
      "completed",
      "failed",
      "refunded",
      "paid"
    ),
    defaultValue: "pending",
  },
  transactionId: {
    type: DataTypes.STRING,
  },
  gateway: {
    type: DataTypes.STRING,
  },
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: "USD",
  },
  transactionData: DataTypes.JSON,
  paidAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  collectedAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  collectedAt: { type: DataTypes.DATE, allowNull: true },
  collectorId: { type: DataTypes.UUID, allowNull: true },
  refundedAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  isRecovered: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: "True if payment was recovered by background watchdog",
  },
  version: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
  },
}, {
  indexes: [
    { fields: ["status"] },
    { fields: ["orderId"] },
    { fields: ["createdAt"] },
  ],
  hooks: {
    beforeUpdate: (payment) => {
      payment.version = payment.version + 1;
    },
    afterUpdate: async (payment) => {
      const { recordOrderPaidEvent } = require("../modules/billing/usageEventService");
      const previousStatus = payment.previous("status");
      if (
        (payment.status === "completed" || payment.status === "paid") &&
        previousStatus !== payment.status
      ) {
        await recordOrderPaidEvent(payment.orderId, payment.paidAt || payment.updatedAt);
      }
    },
    afterCreate: async (payment) => {
      const { recordOrderPaidEvent } = require("../modules/billing/usageEventService");
      if (payment.status === "completed" || payment.status === "paid") {
        await recordOrderPaidEvent(payment.orderId, payment.paidAt || payment.createdAt);
      }
    },
  },
});

module.exports = Payment;
