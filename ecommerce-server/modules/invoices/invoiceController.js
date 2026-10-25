// ecommerce-server/modules/invoices/invoiceController.js
// P3-INV-002 Slice 5: Controller for invoice queries, creation, fulfillment, cancellation, and updates.

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

exports.getInvoices = async (req, res) => {
  try {
    const { websiteId, storeId: paramStoreId } = req.params;
    const {
      page = 1,
      limit = 10,
      search,
      status,
      sortBy = "createdAt",
      sortOrder = "DESC",
      storeId: queryStoreId,
    } = req.query;

    const authorizedStoreId = req.store?.storeId || req.website?.storeId || paramStoreId;
    if (queryStoreId && authorizedStoreId && queryStoreId !== authorizedStoreId) {
      return res.status(403).json({ error: "Store access denied" });
    }

    const conditions = [];
    if (websiteId) conditions.push({ websiteId });
    if (authorizedStoreId) conditions.push({ storeId: authorizedStoreId });

    const where = conditions.length > 1
      ? { [Op.or]: conditions }
      : (conditions[0] || (websiteId ? { websiteId } : {}));

    if (status && status !== "all") {
      where.status = status;
    }

    if (search) {
      where[Op.or] = [
        { customerName: { [Op.iLike]: `%${search}%` } },
        { invoiceNumber: { [Op.iLike]: `%${search}%` } },
      ];
    }

    let order = [[sortBy, sortOrder.toUpperCase()]];
    if (sortBy === "customerName") {
      order = [["customerName", sortOrder.toUpperCase()]];
    }

    const invoices = await Invoice.findAndCountAll({
      where,
      limit: parseInt(limit, 10),
      offset: (page - 1) * limit,
      order,
      include: [
        {
          model: Order,
          include: [
            { model: OrderItem, include: [Product] },
            { model: Payment },
            { model: ShippingDetail, as: "shippingDetail" },
          ],
        },
      ],
    });

    res.json({
      totalItems: invoices.count,
      totalPages: Math.ceil(invoices.count / limit),
      currentPage: parseInt(page, 10),
      invoices: invoices.rows,
    });
  } catch (error) {
    console.error("Get Invoices Error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

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
            { model: ShippingDetail, as: "shippingDetail" },
          ],
        },
      ],
    });

    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    const authorizedStoreId = req.store?.storeId || req.website?.storeId;
    if (authorizedStoreId && invoice.storeId && invoice.storeId !== authorizedStoreId) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    res.json(invoice);
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

exports.getInvoicePdf = async (req, res) => {
  try {
    const invoice = await Invoice.findByPk(req.params.invoiceId);
    if (!invoice) return res.status(404).json({ error: "Invoice not found" });
    res.json({ pdfUrl: invoice.pdfUrl });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

exports.createInvoice = async (req, res) => {
  try {
    const rawWebsiteId = req.params.websiteId || req.body?.websiteId || null;
    const invoiceData = req.body.body || req.body || {};

    let effectiveStoreId = req.params.storeId || req.store?.storeId || invoiceData.storeId || null;

    if (!effectiveStoreId && rawWebsiteId) {
      const website = await WebsiteData.findOne({
        where: { websiteId: rawWebsiteId },
        attributes: ['storeId', 'websiteId'],
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

    const idempotencyKey = req.headers['idempotency-key'] || req.body?.idempotencyKey || null;
    const correlationId = req.headers['x-correlation-id'] || null;

    const result = await invoiceFulfillmentService.createInvoiceOrder({
      storeId: effectiveStoreId,
      websiteId: rawWebsiteId,
      invoiceData,
      actor: req.user || { id: 'merchant', role: 'merchant' },
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
    const idempotencyKey = req.headers['idempotency-key'] || req.body?.idempotencyKey || null;
    const correlationId = req.headers['x-correlation-id'] || null;

    const result = await invoiceFulfillmentService.fulfillInvoice({
      invoiceId,
      storeId,
      actor: req.user || { id: 'merchant', role: 'merchant' },
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
    const idempotencyKey = req.headers['idempotency-key'] || req.body?.idempotencyKey || null;
    const correlationId = req.headers['x-correlation-id'] || null;
    const reason = req.body?.reason || 'Invoice cancelled';

    const result = await invoiceFulfillmentService.cancelInvoice({
      invoiceId,
      storeId,
      actor: req.user || { id: 'merchant', role: 'merchant' },
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
    const idempotencyKey = req.headers['idempotency-key'] || req.body?.idempotencyKey || null;
    const correlationId = req.headers['x-correlation-id'] || null;
    const updateData = req.body || {};

    const result = await invoiceFulfillmentService.updateInvoice({
      invoiceId,
      storeId,
      actor: req.user || { id: 'merchant', role: 'merchant' },
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
    const idempotencyKey = req.headers['idempotency-key'] || req.body?.idempotencyKey || null;
    const correlationId = req.headers['x-correlation-id'] || null;

    const result = await invoiceFulfillmentService.issueDraftInvoice({
      invoiceId,
      storeId,
      actor: req.user || { id: 'merchant', role: 'merchant' },
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
