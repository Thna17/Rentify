const express = require("express");

const {
  getInvoices,
  getInvoicePdf,
  createInvoice,
  fulfillInvoice,
  cancelInvoice,
  updateInvoice,
  issueDraftInvoice,
} = require("./invoiceController");
const { verifyToken } = require('../../middlewares/authMiddleware');
const { requireWebsitePermission, requireInvoiceAccess } = require('../../middlewares/requireWebsiteAccess');

const router = express.Router();

// Website-keyed invoice routes
router.get("/websites/:websiteId/invoices", verifyToken, requireWebsitePermission(['invoice', 'invoices', 'manage_invoices']), getInvoices);
router.post("/websites/:websiteId/invoices", verifyToken, requireWebsitePermission(['invoice', 'invoices', 'manage_invoices']), createInvoice);

// Invoice-keyed routes
router.get("/invoices/:invoiceId/pdf", verifyToken, requireInvoiceAccess, getInvoicePdf);
router.post("/invoices/:invoiceId/fulfill", verifyToken, requireInvoiceAccess, fulfillInvoice);
router.post("/invoices/:invoiceId/cancel", verifyToken, requireInvoiceAccess, cancelInvoice);
router.patch("/invoices/:invoiceId", verifyToken, requireInvoiceAccess, updateInvoice);
router.post("/invoices/:invoiceId/issue", verifyToken, requireInvoiceAccess, issueDraftInvoice);

module.exports = router;
