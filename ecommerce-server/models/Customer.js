const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const Customer = sequelize.define(
  "Customer",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    storeId: {
      type: DataTypes.UUID,
      allowNull: false,
      // references: { model: "WebsiteData", key: "platformWebsiteId" },
    },
    // The existing storeId is a Website identifier in customer auth flows.
    // Keep it until buyer identity migration, and backfill the canonical Store
    // key separately.
    tenantStoreId: { type: DataTypes.UUID, allowNull: true },
    dateOfBirth: {
      type: DataTypes.DATE,
      allowNull: true,
    },
       status: {
      type: DataTypes.ENUM("active", "inactive", "banned"),
      defaultValue: "active",
    },
        loyaltyPoints: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
        acceptsMarketing: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
        sessionId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING,
      // unique: true,
      allowNull: true,
      validate: {
        isEmail: true,
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    isGuest: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    shippingAddress: DataTypes.JSON,
    resetPasswordToken: {
      type: DataTypes.STRING,
    },
    resetPasswordExpires: {
      type: DataTypes.DATE,
    },
    isVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    otp: {
      type: DataTypes.STRING,
    },
    otpExpires: {
      type: DataTypes.DATE,
    },
    googleId: {
      type: DataTypes.STRING,
    },
    facebookId: {
      type: DataTypes.STRING,
    },
    profileImage: {
      type: DataTypes.STRING,
      defaultValue: "default.jpg",
    },
    lockUntil: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    failedAttempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    refreshToken: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    refreshTokenExpires: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    phoneNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        is: /^\+?[1-9]\d{1,14}$/,
      },
    },
    telegramChatId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    telegramUserId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
     // Statistics
    totalOrders: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    totalSpent: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
    },
    lastOrderDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    indexes: [
      { unique: true, fields: ["storeId", "email"] },
      { fields: ["storeId"] },
    ],
  },

  { timestamps: true }
);

module.exports = Customer;
