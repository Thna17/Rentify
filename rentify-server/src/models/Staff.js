const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const User = require("./User");

const Staff = sequelize.define(
  "Staff",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    merchantId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: User,
        key: "id",
      },
    },
    websiteId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "Websites",
        key: "id",
      },
    },

    email: {
      type: DataTypes.STRING,
      allowNull: true,
      // unique: true,
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
    name: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    permissions: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
      validate: {
        isValidPermissions(value) {
          const validPermissions = [
            "manage_products",
            "manage_orders",
            "manage_invoices",
            "manage_pos",
            "manage_analytics",
            "manage_settings",
            "manage_staff",
          ];
          if (
            !Array.isArray(value) ||
            !value.every((p) => validPermissions.includes(p))
          ) {
            throw new Error("Invalid permissions specified");
          }
        },
      },
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    refreshToken: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    refreshTokenExpires: {
      type: DataTypes.DATE,
      allowNull: true,
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
    refreshToken: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    refreshTokenExpires: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    // Add to model definition
    invitationToken: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    invitationSentAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    invitationMethod: {
      type: DataTypes.ENUM("email", "phone"),
      allowNull: true,
    },
  },
  {
    timestamps: true,
    indexes: [
      { unique: true, fields: ["merchantId", "email"] },
      { unique: true, fields: ["merchantId", "phoneNumber"] },
    ],
  }
);

module.exports = Staff;
