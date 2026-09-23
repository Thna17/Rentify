const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const ReminderLog = sequelize.define(
  "ReminderLog",
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
    invoiceId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    contractId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    orderId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    channel: {
      type: DataTypes.ENUM("telegram", "sms", "email"),
      allowNull: false,
      defaultValue: "telegram",
    },
    reminderType: {
      type: DataTypes.ENUM("first", "second", "overdue"),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("sent", "failed", "skipped"),
      allowNull: false,
    },
    sentAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    dueDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    customerContact: {
      type: DataTypes.JSON,
      defaultValue: {},
    },
    messagePreview: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {},
    },
  },
  {
    indexes: [
      { fields: ["websiteId"] },
      { fields: ["websiteId", "createdAt"] },
      { fields: ["invoiceId"] },
      { fields: ["invoiceId", "reminderType"] },
      { fields: ["status", "createdAt"] },
      {
        unique: true,
        fields: ["invoiceId", "reminderType", "contractId"],
        name: "uniq_invoice_reminder_contract",
      },
    ],
  }
);

module.exports = ReminderLog;
