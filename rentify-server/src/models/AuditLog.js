const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const AuditLog = sequelize.define(
  "AuditLog",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    correlationId: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    actorUserId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    actorRole: {
      type: DataTypes.STRING(32),
      allowNull: true,
    },
    action: {
      type: DataTypes.STRING(64),
      allowNull: false,
    },
    resource: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    resourceId: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    ipAddress: {
      type: DataTypes.STRING(45),
      allowNull: true,
    },
    userAgent: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING(16),
      defaultValue: "SUCCESS",
    },
    details: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    timestamps: true,
    indexes: [
      { fields: ["actorUserId"] },
      { fields: ["action"] },
      { fields: ["correlationId"] },
      { fields: ["createdAt"] },
    ],
  }
);

module.exports = AuditLog;
