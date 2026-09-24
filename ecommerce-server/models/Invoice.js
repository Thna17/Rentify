// Remove financial fields - store only minimal invoice-specific data
const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const Invoice = sequelize.define("Invoice", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  invoiceNumber: {
    type: DataTypes.STRING,
  },
  websiteId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  storeId: { type: DataTypes.UUID, allowNull: true },
  orderId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: "Orders",
      key: "id",
    },
  },
  paymentId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: "Payments",
      key: "id",
    },
  },
  dueDate: DataTypes.DATEONLY,
  status: {
    type: DataTypes.ENUM("pending", "paid", "overdue", "sent"),
    defaultValue: "pending",
  },
  pdfUrl: DataTypes.STRING,
  notes: DataTypes.TEXT,
  version: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
  },
}, {
  indexes: [
    { fields: ["orderId"] },
    { fields: ["invoiceNumber"] },
  ],
  hooks: {
    beforeUpdate: (invoice) => {
      invoice.version = invoice.version + 1;
    },
    afterUpdate: async (invoice) => {
      const { recordInvoicePaidEvent } = require("../services/usageEventService");
      const previousStatus = invoice.previous("status");
      if (invoice.status === "paid" && previousStatus !== "paid") {
        await recordInvoicePaidEvent(invoice.id, invoice.updatedAt);
      }
    },
    afterCreate: async (invoice) => {
      const { recordInvoicePaidEvent } = require("../services/usageEventService");
      if (invoice.status === "paid") {
        await recordInvoicePaidEvent(invoice.id, invoice.createdAt);
      }
    },
  },
});

module.exports = Invoice;
