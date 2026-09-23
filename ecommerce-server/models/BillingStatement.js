const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const BillingStatement = sequelize.define(
  "BillingStatement",
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
    month: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: "USD",
    },
    totalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    breakdown: {
      type: DataTypes.JSON,
      defaultValue: {},
    },
    status: {
      type: DataTypes.ENUM("pending", "paid"),
      allowNull: false,
      defaultValue: "pending",
    },
  },
  {
    indexes: [
      { fields: ["websiteId"] },
      { unique: true, fields: ["websiteId", "month"] },
    ],
  }
);

module.exports = BillingStatement;
