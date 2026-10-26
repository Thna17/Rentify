// modules/invoices/invoiceController.js
// P4-INV-001: Omnichannel invoice, quote, and payment lifecycle controller.

const {
  Invoice,
  Product,
  Order,
  OrderItem,
  Payment,
  ShippingDetail,
} = require("../../models");
const { Op } = require("sequelize");
const invoiceLifecycle = require("./invoiceLifecycleService");

/**
 * Lists invoices for a store or website.
 */
exports.getInvoices = async (req, res) => {
  try {
    const websiteId = req.params.websiteId || req.query.websiteId;
    const storeId = req.params.storeId || req.query.storeId || req.store?.storeId || req.website?.storeId;
    const {
      page = 1,
      limit = 10,
      search,
      status,
      sortBy = "createdAt",
      sortOrder = "DESC",
      storeId: queryStoreId,
    } = req.query;

    const authorizedStoreId = req.store?.storeId || req.website?.storeId;
    if (queryStoreId && authorizedStoreId && queryStoreId !== authorizedStoreId) {
      return res.status(403).json({ error: "Store access denied" });
    }

    const conditions = [];
    if (websiteId) conditions.push({ websiteId });
    if (storeId) conditions.push({ storeId });
    if (authorizedStoreId && !storeId) conditions.push({ storeId: authorizedStoreId });

    let where = {};
    if (conditions.length > 1) {
      where = { [Op.or]: conditions };
    } else if (conditions.length === 1) {
      where = conditions[0];
    }

    // Add status filter
    if (status && status !== "all") {
      where.status = status;
    }

    // Add search filter (search by invoiceNumber)
    if (search) {
      where.invoiceNumber = { [Op.like]: `%${search}%` };
    }

    // Handle sorting
    const validSortFields = ["createdAt", "updatedAt", "dueDate", "status", "invoiceNumber"];
    const sortField = validSortFields.includes(sortBy) ? sortBy : "createdAt";
    const order = [[sortField, sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC"]];

    const invoices = await Invoice.findAndCountAll({
      where,
      limit: parseInt(limit, 10),
      offset: (parseInt(page, 10) - 1) * parseInt(limit, 10),
      order,
      include: [
        {
          model: Order,
          include: [
            { model: OrderItem, include: [Product] },
            { model: Payment },
            { model: ShippingDetail, as: "ShippingDetail" },
          ],
        },
      ],
    });

    res.json({
      totalItems: invoices.count,
      totalPages: Math.ceil(invoices.count / limit),
      currentPage: parseInt(page, 10),
      invoices: invoices.rows.map((inv) => {
        const order = inv.Order;
        const payment = inv.Payment || order?.Payment;
        return invoiceLifecycle.buildInvoiceSnapshot(inv, order, payment);
      }),
    });
  } catch (error) {
    console.error("Error in getInvoices:", error);
    res.status(500).json({ error: "Server error", message: error.message });
  }
};

/**
 * Gets a specific invoice by ID with exact snapshot.
 */
exports.getInvoiceById = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const invoice = await Invoice.findByPk(invoiceId, {
      include: [
        {
          model: Order,
          include: [
            { model: OrderItem, include: [Product] },
            { model: Payment },
            { model: ShippingDetail, as: "ShippingDetail" },
          ],
        },
        { model: Payment },
      ],
    });

    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    const order = invoice.Order;
    const payment = invoice.Payment || order?.Payment;
    const snapshot = invoiceLifecycle.buildInvoiceSnapshot(invoice, order, payment);

    res.json(snapshot);
  } catch (error) {
    console.error("Error in getInvoiceById:", error);
    res.status(500).json({ error: "Server error", message: error.message });
  }
};

/**
 * Creates a formal commercial Invoice backed by a canonical Order.
 */
exports.createStoreInvoice = async (req, res) => {
  try {
    const storeId = req.params.storeId || req.store?.storeId || req.body.storeId;
    const websiteId = req.params.websiteId || req.body.websiteId;
    const {
      customerInfo = {},
      items = [],
      paymentMethod = "cash",
      isImmediatePayment = false,
      dueDate = null,
      currency = "USD",
      notes = "",
    } = req.body;

    const staffId = req.user?.id || null;

    const result = await invoiceLifecycle.createInvoice({
      storeId,
      websiteId,
      customerInfo,
      items,
      paymentMethod,
      isImmediatePayment,
      dueDate,
      currency,
      notes,
      staffId,
    });

    res.status(201).json(result);
  } catch (error) {
    console.error("Error in createStoreInvoice:", error);
    const statusCode = error.statusCode || (error.name === "SequelizeValidationError" ? 400 : 500);
    res.status(statusCode).json({ error: error.message });
  }
};

/**
 * Creates a non-binding Quote for customer review.
 * Invariant: Produces ZERO stock reservation and ZERO stock deduction.
 */
exports.createStoreQuote = async (req, res) => {
  try {
    const storeId = req.params.storeId || req.store?.storeId || req.body.storeId;
    const websiteId = req.params.websiteId || req.body.websiteId;
    const {
      customerInfo = {},
      items = [],
      currency = "USD",
      notes = "",
      expiryDays = 14,
    } = req.body;

    const staffId = req.user?.id || null;

    const quote = await invoiceLifecycle.createQuote({
      storeId,
      websiteId,
      customerInfo,
      items,
      currency,
      notes,
      expiryDays,
      staffId,
    });

    res.status(201).json({
      success: true,
      quote,
    });
  } catch (error) {
    console.error("Error in createStoreQuote:", error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ error: error.message });
  }
};

/**
 * Converts a non-binding Quote into a binding commercial Invoice.
 */
exports.convertQuoteToInvoice = async (req, res) => {
  try {
    const storeId = req.params.storeId || req.store?.storeId;
    const websiteId = req.params.websiteId;
    const { quote, paymentMethod = "cash", isImmediatePayment = false, dueDate = null } = req.body;

    const result = await invoiceLifecycle.convertQuoteToInvoice({
      quote,
      storeId,
      websiteId,
      paymentMethod,
      isImmediatePayment,
      dueDate,
      staffId: req.user?.id || null,
    });

    res.status(201).json(result);
  } catch (error) {
    console.error("Error in convertQuoteToInvoice:", error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ error: error.message });
  }
};

/**
 * Records payment against an invoice and guarantees the Non-Double-Deduction invariant.
 */
exports.recordInvoicePayment = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const storeId = req.params.storeId || req.store?.storeId;
    const {
      paymentMethod = "cash",
      transactionReference = "",
      amountPaid = null,
    } = req.body;

    const staffId = req.user?.id || "staff";

    const result = await invoiceLifecycle.recordPayment({
      invoiceId,
      storeId,
      paymentMethod,
      transactionReference,
      amountPaid,
      staffId,
    });

    res.json(result);
  } catch (error) {
    console.error("Error in recordInvoicePayment:", error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ error: error.message });
  }
};

/**
 * Cancels an unpaid invoice.
 * State machine: Paid invoices cannot be cancelled (must be refunded).
 */
exports.cancelStoreInvoice = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const storeId = req.params.storeId || req.store?.storeId;
    const { reason = "Cancelled by merchant" } = req.body;

    const result = await invoiceLifecycle.cancelInvoice({
      invoiceId,
      storeId,
      reason,
      staffId: req.user?.id || null,
    });

    res.json(result);
  } catch (error) {
    console.error("Error in cancelStoreInvoice:", error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ error: error.message });
  }
};

/**
 * Refunds a paid invoice and replenishes canonical catalog inventory.
 */
exports.refundStoreInvoice = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const storeId = req.params.storeId || req.store?.storeId;
    const { reason = "Customer return / refund", amount = null } = req.body;

    const result = await invoiceLifecycle.refundInvoice({
      invoiceId,
      storeId,
      reason,
      amount,
      staffId: req.user?.id || null,
    });

    res.json(result);
  } catch (error) {
    console.error("Error in refundStoreInvoice:", error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ error: error.message });
  }
};

/**
 * Public customer invoice lookup by invoiceNumber.
 * Omits internal merchant credentials while delivering accurate line items and totals.
 */
exports.getPublicInvoice = async (req, res) => {
  try {
    const { invoiceNumber } = req.params;
    const invoice = await Invoice.findOne({
      where: { invoiceNumber },
      include: [
        {
          model: Order,
          include: [
            { model: OrderItem, include: [Product] },
            { model: Payment },
            { model: ShippingDetail, as: "ShippingDetail" },
          ],
        },
        { model: Payment },
      ],
    });

    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    const order = invoice.Order;
    const payment = invoice.Payment || order?.Payment;
    const snapshot = invoiceLifecycle.buildInvoiceSnapshot(invoice, order, payment);

    res.json(snapshot);
  } catch (error) {
    console.error("Error in getPublicInvoice:", error);
    res.status(500).json({ error: "Server error", message: error.message });
  }
};

/**
 * Returns PDF URL for an invoice.
 */
exports.getInvoicePdf = async (req, res) => {
  try {
    const invoice = await Invoice.findByPk(req.params.invoiceId);
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });
    res.json({ pdfUrl: invoice.pdfUrl });
  } catch (error) {
    console.error("Error in getInvoicePdf:", error);
    res.status(500).json({ error: "Server error" });
  }
};
