const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const UsageEvent = sequelize.define(
  "UsageEvent",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    websiteId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    storeId: { type: DataTypes.UUID, allowNull: true },
    eventType: {
      type: DataTypes.ENUM("ORDER_PAID", "INVOICE_PAID", "STORE_VIEW"),
      allowNull: false,
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    occurredAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    pricePerUnit: {
      type: DataTypes.DECIMAL(10, 4),
      allowNull: false,
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: "USD",
    },
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {},
    },
    idempotencyKey: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
  },
  {
    indexes: [
      { fields: ["websiteId"] },
      { fields: ["eventType"] },
      { fields: ["occurredAt"] },
    ],
  }
);

module.exports = UsageEvent;
