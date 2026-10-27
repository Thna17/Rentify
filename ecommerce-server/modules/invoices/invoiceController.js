// ecommerce-server/modules/invoices/invoiceController.js
// P3-INV-002 / P4-INV-001: Omnichannel invoice, quote, and payment lifecycle controller.

const {
  Invoice,
  Product,
  Order,
  OrderItem,
  Payment,
  ShippingDetail,
  WebsiteData,
  StoreAccess,
} = require("../../models");
const { Op } = require("sequelize");
const invoiceFulfillmentService = require("./invoiceFulfillmentService");
const { INVOICE_ERROR_CODES } = require("./invoiceErrors");
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

    if (status && status !== "all") {
      where.status = status;
    }

    // Add search filter (search by invoiceNumber or customerName)
    if (search) {
      where[Op.or] = [
        { customerName: { [Op.like]: `%${search}%` } },
        { invoiceNumber: { [Op.like]: `%${search}%` } },
      ];
    }

    // Handle sorting
    const validSortFields = ["createdAt", "updatedAt", "dueDate", "status", "invoiceNumber", "customerName"];
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

    const authorizedStoreId = req.store?.storeId || req.website?.storeId;
    if (authorizedStoreId && invoice.storeId && invoice.storeId !== authorizedStoreId) {
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
 * Creates an authoritative invoice for a store (omnichannel).
 */
exports.createStoreInvoice = async (req, res) => {
  try {
    const storeId = req.params.storeId || req.store?.storeId || req.website?.storeId;
    const websiteId = req.params.websiteId || req.body.websiteId || req.website?.websiteId;
    const invoiceData = req.body;

    const result = await invoiceLifecycle.createInvoice({
      storeId,
      websiteId,
      invoiceData,
      actor: req.user,
    });

    res.status(201).json(result);
  } catch (error) {
    console.error("Create Store Invoice Error:", error);
    const status = error.statusCode || error.status || 400;
    res.status(status).json({ error: error.message, code: error.code });
  }
};

/**
 * Creates a non-binding Quote (zero stock reserved / deducted).
 */
exports.createStoreQuote = async (req, res) => {
  try {
    const storeId = req.params.storeId || req.store?.storeId || req.website?.storeId;
    const websiteId = req.params.websiteId || req.body.websiteId || req.website?.websiteId;
    const quoteData = req.body;

    const result = await invoiceLifecycle.createQuote({
      storeId,
      websiteId,
      quoteData,
      actor: req.user,
    });

    res.status(201).json(result);
  } catch (error) {
    console.error("Create Store Quote Error:", error);
    const status = error.statusCode || error.status || 400;
    res.status(status).json({ error: error.message, code: error.code });
  }
};

/**
 * Converts a non-binding Quote into a formal Invoice.
 */
exports.convertQuoteToInvoice = async (req, res) => {
  try {
    const storeId = req.params.storeId || req.store?.storeId;
    const { quoteId, dueDate } = req.body;

    const result = await invoiceLifecycle.convertQuoteToInvoice({
      quoteId,
      storeId,
      dueDate,
      actor: req.user,
    });

    res.status(200).json(result);
  } catch (error) {
    console.error("Convert Quote Error:", error);
    const status = error.statusCode || error.status || 400;
    res.status(status).json({ error: error.message, code: error.code });
  }
};

/**
 * Records payment against an invoice (deducts stock if not pre-deducted).
 */
exports.recordInvoicePayment = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const storeId = req.store?.storeId || req.params.storeId;
    const { amount, method, transactionId, notes } = req.body;

    const result = await invoiceLifecycle.recordPayment({
      invoiceId,
      storeId,
      paymentData: { amount, method, transactionId, notes },
      actor: req.user,
    });

    res.status(200).json(result);
  } catch (error) {
    console.error("Record Invoice Payment Error:", error);
    const status = error.statusCode || error.status || 400;
    res.status(status).json({ error: error.message, code: error.code });
  }
};

/**
 * Cancels an invoice (checks status machine).
 */
exports.cancelStoreInvoice = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const storeId = req.store?.storeId || req.params.storeId;
    const { reason } = req.body;

    const result = await invoiceLifecycle.cancelInvoice({
      invoiceId,
      storeId,
      reason,
      actor: req.user,
    });

    res.status(200).json(result);
  } catch (error) {
    console.error("Cancel Store Invoice Error:", error);
    const status = error.statusCode || error.status || 400;
    res.status(status).json({ error: error.message, code: error.code });
  }
};

/**
 * Refunds an invoice and restores catalog stock.
 */
exports.refundStoreInvoice = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const storeId = req.store?.storeId || req.params.storeId;
    const { reason, amount } = req.body;

    const result = await invoiceLifecycle.refundInvoice({
      invoiceId,
      storeId,
      reason,
      amount,
      actor: req.user,
    });

    res.status(200).json(result);
  } catch (error) {
    console.error("Refund Store Invoice Error:", error);
    const status = error.statusCode || error.status || 400;
    res.status(status).json({ error: error.message, code: error.code });
  }
};

/**
 * Public invoice lookup by invoiceNumber.
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

// --- P3 Legacy & Compatibility Endpoints (invoiceFulfillmentService) ---

exports.createInvoice = async (req, res) => {
  try {
    const rawWebsiteId = req.params.websiteId || req.body?.websiteId || null;
    const invoiceData = req.body.body || req.body || {};

    let effectiveStoreId = req.params.storeId || req.store?.storeId || invoiceData.storeId || null;

    if (!effectiveStoreId && rawWebsiteId) {
      const website = await WebsiteData.findOne({
        where: { websiteId: rawWebsiteId },
        attributes: ["storeId", "websiteId"],
      });
      if (website?.storeId) {
        effectiveStoreId = website.storeId;
      }
    }

    if (!effectiveStoreId) {
      return res.status(400).json({ error: "storeId is required" });
    }

    // Body parameter override protection
    const bodyStoreId = req.body?.storeId || invoiceData.storeId;
    if (bodyStoreId && effectiveStoreId && bodyStoreId !== effectiveStoreId) {
      return res.status(403).json({ error: "Cross-store body selection prohibited" });
    }

    const idempotencyKey = req.headers["idempotency-key"] || req.body?.idempotencyKey || null;
    const correlationId = req.headers["x-correlation-id"] || null;

    const result = await invoiceFulfillmentService.createInvoiceOrder({
      storeId: effectiveStoreId,
      websiteId: rawWebsiteId,
      invoiceData,
      actor: req.user || { id: "merchant", role: "merchant" },
      idempotencyKey,
      correlationId,
    });

    const status = result.replayed ? 200 : 201;
    res.status(status).json(result);
  } catch (error) {
    console.error("Create Invoice Error:", error);
    const status = error.statusCode || error.status || 400;
    res.status(status).json({ error: error.message, code: error.code });
  }
};

exports.fulfillInvoice = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const storeId = req.store?.storeId || req.params.storeId || req.website?.storeId || null;
    const idempotencyKey = req.headers["idempotency-key"] || req.body?.idempotencyKey || null;
    const correlationId = req.headers["x-correlation-id"] || null;

    const result = await invoiceFulfillmentService.fulfillInvoice({
      invoiceId,
      storeId,
      actor: req.user || { id: "merchant", role: "merchant" },
      idempotencyKey,
      correlationId,
    });

    res.status(200).json(result);
  } catch (error) {
    console.error("Fulfill Invoice Error:", error);
    const status = error.statusCode || error.status || 400;
    res.status(status).json({ error: error.message, code: error.code });
  }
};

exports.cancelInvoice = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const storeId = req.store?.storeId || req.params.storeId || req.website?.storeId || null;
    const idempotencyKey = req.headers["idempotency-key"] || req.body?.idempotencyKey || null;
    const correlationId = req.headers["x-correlation-id"] || null;
    const reason = req.body?.reason || "Invoice cancelled";

    const result = await invoiceFulfillmentService.cancelInvoice({
      invoiceId,
      storeId,
      actor: req.user || { id: "merchant", role: "merchant" },
      reason,
      idempotencyKey,
      correlationId,
    });

    res.status(200).json(result);
  } catch (error) {
    console.error("Cancel Invoice Error:", error);
    const status = error.statusCode || error.status || 400;
    res.status(status).json({ error: error.message, code: error.code });
  }
};

exports.updateInvoice = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const storeId = req.store?.storeId || req.params.storeId || req.website?.storeId || null;
    const idempotencyKey = req.headers["idempotency-key"] || req.body?.idempotencyKey || null;
    const correlationId = req.headers["x-correlation-id"] || null;
    const updateData = req.body || {};

    const result = await invoiceFulfillmentService.updateInvoice({
      invoiceId,
      storeId,
      actor: req.user || { id: "merchant", role: "merchant" },
      updateData,
      idempotencyKey,
      correlationId,
    });

    res.status(200).json(result);
  } catch (error) {
    console.error("Update Invoice Error:", error);
    const status = error.statusCode || error.status || 400;
    res.status(status).json({ error: error.message, code: error.code });
  }
};

exports.issueDraftInvoice = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const storeId = req.store?.storeId || req.params.storeId || req.website?.storeId || null;
    const idempotencyKey = req.headers["idempotency-key"] || req.body?.idempotencyKey || null;
    const correlationId = req.headers["x-correlation-id"] || null;

    const result = await invoiceFulfillmentService.issueDraftInvoice({
      invoiceId,
      storeId,
      actor: req.user || { id: "merchant", role: "merchant" },
      idempotencyKey,
      correlationId,
    });

    res.status(200).json(result);
  } catch (error) {
    console.error("Issue Draft Invoice Error:", error);
    const status = error.statusCode || error.status || 400;
    res.status(status).json({ error: error.message, code: error.code });
  }
};
