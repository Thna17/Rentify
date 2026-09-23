const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const PaymentGatewayConfig = sequelize.define(
  "PaymentGatewayConfig",
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
    gateway: {
      type: DataTypes.ENUM("khqr", "aba", "stripe"),
      allowNull: false,
    },
    enabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    config: {
      type: DataTypes.JSON,
      allowNull: true,
    },
  },
  {
    indexes: [{ fields: ["websiteId", "gateway"], unique: true }],
    timestamps: true,
  }
);

module.exports = PaymentGatewayConfig;