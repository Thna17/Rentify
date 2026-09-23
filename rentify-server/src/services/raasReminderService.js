const axios = require("axios");
const { Op } = require("sequelize");
const { OutcomeContract, ReminderLog, Website, User } = require("../models");
const telegramService = require("./telegramService");
const { logger } = require("../utils/logger");
const { ecommerceApiUrl } = require("../config/runtimeUrls");

const ECOMMERCE_API = ecommerceApiUrl;
const OPS_TOKEN = process.env.OPS_TOKEN || "";

const REMINDER_CHANNEL = "telegram";

const buildReminderMessage = ({ invoiceNumber, dueDate, amount, paymentLink }) => {
  const due = dueDate ? new Date(dueDate).toLocaleDateString() : "N/A";
  const linkLine = paymentLink ? `\nPay here: ${paymentLink}` : "";
  return `Invoice ${invoiceNumber || ""} is due on ${due}. Amount: $${amount}.${linkLine}`;
};

const buildOverdueMessage = ({ invoiceNumber, dueDate, amount, paymentLink }) => {
  const due = dueDate ? new Date(dueDate).toLocaleDateString() : "N/A";
  const linkLine = paymentLink ? `\nPay here: ${paymentLink}` : "";
  return `Overdue invoice ${invoiceNumber || ""}. Due date was ${due}. Amount: $${amount}.${linkLine}`;
};

const shouldSendReminder = (invoice, now) => {
  const createdAt = new Date(invoice.createdAt);
  const dueDate = invoice.dueDate ? new Date(invoice.dueDate) : null;
  const isOverdue = dueDate && now > dueDate;

  if (isOverdue) {
    return "overdue";
  }

  const hoursSinceCreated = (now - createdAt) / (1000 * 60 * 60);
  if (hoursSinceCreated >= 24 && dueDate && now < dueDate) {
    return "first";
  }

  if (dueDate) {
    const hoursUntilDue = (dueDate - now) / (1000 * 60 * 60);
    if (hoursUntilDue <= 24 && hoursUntilDue >= 0) {
      return "second";
    }
  }

  return null;
};

const getActiveContracts = async () => {
  return OutcomeContract.findAll({
    where: { status: "active", isActive: true, resultType: "on_time_invoice" },
    attributes: ["id", "websiteId"],
  });
};

const getReminderCandidates = async (websiteIds) => {
  const response = await axios.get(
    `${ECOMMERCE_API}/api/ops/invoices/reminder-candidates`,
    {
      headers: { "x-ops-token": OPS_TOKEN },
      params: { websiteIds: websiteIds.join(",") },
      timeout: 15000,
    }
  );
  return response.data?.invoices || [];
};

const sendCustomerReminder = async (invoice, reminderType) => {
  const message =
    reminderType === "overdue"
      ? buildOverdueMessage(invoice)
      : buildReminderMessage(invoice);

  const response = await axios.post(
    `${ECOMMERCE_API}/api/ops/invoices/${invoice.id}/send-reminder`,
    {
      channel: REMINDER_CHANNEL,
      message,
      reminderType,
    },
    {
      headers: { "x-ops-token": OPS_TOKEN },
      timeout: 15000,
    }
  );

  return { message, result: response.data };
};

const sendMerchantEscalation = async (websiteId, invoice) => {
  const website = await Website.findByPk(websiteId, {
    include: [{ model: User, attributes: ["telegramChatId", "name"] }],
  });

  if (!website?.User?.telegramChatId) {
    return { status: "skipped", reason: "merchant_missing_telegram" };
  }

  const message = `Overdue invoice alert: ${invoice.invoiceNumber || ""}. Amount: $${invoice.amount}.`;
  await telegramService.sendDirectMessage(website.User.telegramChatId, message);
  return { status: "sent" };
};

const logReminder = async ({
  invoice,
  reminderType,
  contractId,
  status,
  message,
  errorMessage,
  metadata,
}) => {
  const contact = invoice.customer || {};
  await ReminderLog.create({
    websiteId: invoice.websiteId,
    invoiceId: invoice.id,
    contractId,
    orderId: invoice.orderId,
    channel: REMINDER_CHANNEL,
    reminderType,
    status,
    sentAt: status === "sent" ? new Date() : null,
    dueDate: invoice.dueDate,
    customerContact: {
      name: contact.name,
      email: contact.email,
      phoneNumber: contact.phoneNumber,
      telegramChatId: contact.telegramChatId,
    },
    messagePreview: message,
    errorMessage,
    metadata: metadata || {},
  });
};

const hasRecentLog = async (invoiceId, reminderType, contractId, now) => {
  const cooldownWindow = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const existing = await ReminderLog.findOne({
    where: {
      invoiceId,
      reminderType,
      contractId,
      channel: REMINDER_CHANNEL,
      createdAt: { [Op.gte]: cooldownWindow },
    },
  });
  return !!existing;
};

const normalizeInvoice = (invoice) => ({
  id: invoice.id,
  websiteId: invoice.websiteId,
  orderId: invoice.orderId,
  createdAt: invoice.createdAt,
  dueDate: invoice.dueDate,
  status: invoice.status,
  invoiceNumber: invoice.invoiceNumber,
  amount: invoice.totalAmount || invoice.amount || invoice.total || 0,
  paymentLink: invoice.paymentLink,
  customer: invoice.customer || {},
});

const runReminderCycle = async () => {
  if (!OPS_TOKEN) {
    logger.warn("OPS_TOKEN not set - skipping reminder cycle");
    return;
  }

  const contracts = await getActiveContracts();
  if (!contracts.length) return;

  const websiteIds = contracts.map((c) => c.websiteId);
  const contractByWebsite = new Map(
    contracts.map((c) => [c.websiteId, c.id])
  );

  const now = new Date();
  const candidates = await getReminderCandidates(websiteIds);

  for (const rawInvoice of candidates) {
    const invoice = normalizeInvoice(rawInvoice);
    const reminderType = shouldSendReminder(invoice, now);
    if (!reminderType) continue;

    const contractId = contractByWebsite.get(invoice.websiteId) || null;
    const alreadySent = await hasRecentLog(
      invoice.id,
      reminderType,
      contractId,
      now
    );
    if (alreadySent) continue;

    try {
      const { message, result } = await sendCustomerReminder(
        invoice,
        reminderType
      );

      const status = result?.status || "sent";
      await logReminder({
        invoice,
        reminderType,
        contractId,
        status,
        message,
        metadata: { response: result },
      });

      if (reminderType === "overdue") {
        await sendMerchantEscalation(invoice.websiteId, invoice);
      }
    } catch (error) {
      await logReminder({
        invoice,
        reminderType,
        contractId,
        status: "failed",
        message: null,
        errorMessage: error.message,
      });
    }
  }
};

module.exports = {
  runReminderCycle,
};
