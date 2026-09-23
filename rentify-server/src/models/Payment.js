const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Payment = sequelize.define(
  "Payment",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: { type: DataTypes.UUID, allowNull: false },
    packageId: { type: DataTypes.UUID, allowNull: true }, // Linked package
    amount: { type: DataTypes.FLOAT, allowNull: false },
    currency: { type: DataTypes.STRING, defaultValue: "USD" },
    status: {
      type: DataTypes.ENUM("pending", "completed", "failed", "expired"),
      defaultValue: "pending",
    },
    paymentMethod: { type: DataTypes.STRING, allowNull: false },
    transactionData: { type: DataTypes.JSON },
    transactionId: { type: DataTypes.STRING },
    md5Hash: { type: DataTypes.STRING }, // Store for verification
    expiresAt: { type: DataTypes.DATE }, // Payment expiration time
  },
  { timestamps: true }
);

module.exports = Payment;
