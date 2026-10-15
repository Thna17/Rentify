const {
  Invoice,
  Product,
  Order,
  OrderItem,
  Payment,
  ShippingDetail,
} = require("../../models");
const { Op } = require("sequelize");

exports.getInvoices = async (req, res) => {
  try {
    const { websiteId } = req.params;
    const {
      page = 1,
      limit = 10,
      search,
      status,
      sortBy = "createdAt",
      sortOrder = "DESC",
    } = req.query;

    const where = { websiteId };

    // Add status filter
    if (status && status !== "all") {
      where.status = status;
    }

    // Add search filter
    if (search) {
      where[Op.or] = [
        { customerName: { [Op.iLike]: `%${search}%` } },
        { invoiceNumber: { [Op.iLike]: `%${search}%` } },
      ];
    }

    // Handle sorting
    let order = [[sortBy, sortOrder.toUpperCase()]];
    if (sortBy === "customerName") {
      order = [["customerName", sortOrder.toUpperCase()]];
    }

    const invoices = await Invoice.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: (page - 1) * limit,
      order,
      include: [
        {
          model: Order,
          include: [
            { model: OrderItem, include: [Product] },
            { model: Payment },
            { model: ShippingDetail, as: "shippingDetail" }, // ADD THIS
          ],
        },
      ],
    });

    res.json({
      totalItems: invoices.count,
      totalPages: Math.ceil(invoices.count / limit),
      currentPage: parseInt(page),
      invoices: invoices.rows,
    });
  } catch (error) {
    console.log(error);

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

// controllers/invoiceController.js
