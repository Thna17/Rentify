// 1. Update User Model (models/User.js)
const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isEmail: true,
      },
    },
    phoneNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        is: /^\+?[0-9\s\-()]{8,20}$/,
      },
    },
    bio: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    website: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    telegramChatId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    telegramUserId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    role: {
      type: DataTypes.ENUM("user", "admin"),
      defaultValue: "user",
      allowNull: false,
    },
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
    mfaEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    mfaSecret: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    mfaRecoveryCodes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    mfaPendingSecret: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    mfaFailedAttempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    mfaLockUntil: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    mfaLastTimeStep: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    pendingContact: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  { timestamps: true }
);

module.exports = User;
