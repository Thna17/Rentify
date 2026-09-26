const { Invoice, Order, Payment, Customer } = require("../../models");
const telegramService = require("../notifications/telegramService");
const { Op } = require("sequelize");

const buildCandidate = (invoice, order, payment, customer) => {
  const paymentLink = payment?.transactionData?.qrCodeUrl || null;
  const customerInfo = order?.customerInfo || {};

  return {
    id: invoice.id,
    websiteId: invoice.websiteId,
    orderId: invoice.orderId,
    invoiceNumber: invoice.invoiceNumber,
    status: invoice.status,
    dueDate: invoice.dueDate,
    createdAt: invoice.createdAt,
    totalAmount: order?.totalAmount || null,
    currency: order?.currency || "USD",
    paymentLink,
    customer: {
      name: customer?.name || customerInfo.name || null,
      email: customer?.email || customerInfo.email || null,
      phoneNumber: customer?.phoneNumber || customerInfo.phone || null,
      telegramChatId: customer?.telegramChatId || null,
    },
  };
};

exports.getReminderCandidates = async (req, res) => {
  try {
    const { websiteIds } = req.query;
    const websiteIdList = websiteIds
      ? websiteIds.split(",").map((id) => id.trim())
      : [];

    const where = {
      status: { [Op.in]: ["pending", "sent", "overdue"] },
      dueDate: { [Op.ne]: null },
    };

    if (websiteIdList.length) {
      where.websiteId = { [Op.in]: websiteIdList };
    }

    const invoices = await Invoice.findAll({
      where,
      include: [
        {
          model: Order,
          include: [
            { model: Payment, as: "Payment" },
            { model: Customer },
          ],
        },
      ],
      order: [["dueDate", "ASC"]],
      limit: 1000,
    });

    const response = invoices.map((invoice) => {
      const order = invoice.Order;
      const payment = order?.Payment || null;
      const customer = order?.Customer || null;
      return buildCandidate(invoice, order, payment, customer);
    });

    res.json({ invoices: response });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch reminder candidates" });
  }
};

exports.sendInvoiceReminder = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const { message, reminderType, channel = "telegram" } = req.body;

    const invoice = await Invoice.findByPk(invoiceId, {
      include: [
        {
          model: Order,
          include: [{ model: Customer }],
        },
      ],
    });

    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    const customer = invoice.Order?.Customer;
    const customerInfo = invoice.Order?.customerInfo || {};
    const telegramChatId = customer?.telegramChatId || null;

    if (channel !== "telegram") {
      return res
        .status(400)
        .json({ error: "Only telegram channel supported in MVP" });
    }

    if (!telegramChatId) {
      return res.json({
        status: "skipped",
        reason: "customer_missing_telegram",
        reminderType,
        contact: {
          name: customer?.name || customerInfo.name || null,
          phoneNumber: customer?.phoneNumber || customerInfo.phone || null,
          email: customer?.email || customerInfo.email || null,
        },
      });
    }

    await telegramService.sendDirectMessage(telegramChatId, message);
    res.json({ status: "sent", reminderType });
  } catch (error) {
    res.status(500).json({ error: "Failed to send reminder" });
  }
};

exports.getInvoiceFacts = async (req, res) => {
  try {
    const { websiteId, from, to } = req.query;
    if (!websiteId) {
      return res.status(400).json({ error: "websiteId is required" });
    }

    const where = { websiteId };
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt[Op.gte] = new Date(from);
      if (to) where.createdAt[Op.lte] = new Date(to);
    }

    const invoices = await Invoice.findAll({
      where,
      include: [
        {
          model: Order,
          include: [{ model: Payment, as: "Payment" }, { model: Customer }],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: 5000,
    });

    const response = invoices.map((invoice) => {
      const order = invoice.Order;
      const payment = order?.Payment || null;
      const isPaid =
        invoice.status === "paid" ||
        payment?.status === "completed" ||
        payment?.status === "paid";
      const paidAt = isPaid
        ? payment?.updatedAt || invoice.updatedAt || null
        : null;

      return {
        id: invoice.id,
        websiteId: invoice.websiteId,
        orderId: invoice.orderId,
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status,
        dueDate: invoice.dueDate,
        createdAt: invoice.createdAt,
        totalAmount: order?.totalAmount || null,
        currency: order?.currency || "USD",
        isPaid,
        paidAt,
        paymentLink: payment?.transactionData?.qrCodeUrl || null,
        customer: {
          name: order?.customerInfo?.name || null,
          email: order?.customerInfo?.email || null,
          phoneNumber: order?.customerInfo?.phone || null,
          telegramChatId: order?.Customer?.telegramChatId || null,
        },
      };
    });

    res.json({ invoices: response });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch invoice facts" });
  }
};
