const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const PricingRule = sequelize.define(
  "PricingRule",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    eventType: {
      type: DataTypes.ENUM("ORDER_PAID", "INVOICE_PAID", "STORE_VIEW"),
      allowNull: false,
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
    effectiveFrom: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    effectiveTo: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
  },
  {
    indexes: [{ fields: ["eventType"] }, { fields: ["effectiveFrom"] }],
  }
);

module.exports = PricingRule;
