const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const UserSession = sequelize.define(
  "UserSession",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "Users",
        key: "id",
      },
    },
    tokenHash: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    userAgent: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    ipAddress: {
      type: DataTypes.STRING(45),
      allowNull: true,
    },
    clientType: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    lastActiveAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    revokedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    recentAuthAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    mfaVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    timestamps: true,
    indexes: [
      { fields: ["userId"] },
      { fields: ["tokenHash"] },
      { fields: ["revokedAt"] },
    ],
  }
);

module.exports = UserSession;
