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
  },
  { timestamps: true }
);

module.exports = User;
