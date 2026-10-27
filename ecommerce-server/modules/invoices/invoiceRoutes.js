// modules/invoices/invoiceRoutes.js
// P4-INV-001: Omnichannel Store- and Website-scoped invoice routes.

const express = require("express");
const {
  getInvoices,
  getInvoiceById,
  getInvoicePdf,
  createStoreInvoice,
  createStoreQuote,
  convertQuoteToInvoice,
  recordInvoicePayment,
  cancelStoreInvoice,
  refundStoreInvoice,
  getPublicInvoice,
} = require("./invoiceController");
const { verifyToken } = require("../../middlewares/authMiddleware");
const { createRequireStoreAccess } = require("../../middlewares/requireStoreAccess");
const {
  requireWebsitePermission,
  requireInvoiceAccess,
} = require("../../middlewares/requireWebsiteAccess");

const router = express.Router();

// --- Website-scoped routes ---
router.get(
  "/websites/:websiteId/invoices",
  verifyToken,
  requireWebsitePermission(["invoice", "invoices"]),
  getInvoices
);
router.post(
  "/websites/:websiteId/invoices",
  verifyToken,
  requireWebsitePermission(["invoice", "invoices"]),
  createStoreInvoice
);

// --- Store-scoped routes (Marketplace-only and Omnichannel Stores) ---
const requireStoreInvoiceAccess = createRequireStoreAccess({
  permissions: ["invoice", "invoices", "manage_invoices"],
});

router.get(
  "/stores/:storeId/invoices",
  verifyToken,
  requireStoreInvoiceAccess,
  getInvoices
);
router.post(
  "/stores/:storeId/invoices",
  verifyToken,
  requireStoreInvoiceAccess,
  createStoreInvoice
);
router.post(
  "/stores/:storeId/quotes",
  verifyToken,
  requireStoreInvoiceAccess,
  createStoreQuote
);
router.post(
  "/stores/:storeId/quotes/convert",
  verifyToken,
  requireStoreInvoiceAccess,
  convertQuoteToInvoice
);

// --- Individual Invoice Operations ---
router.get("/invoices/:invoiceId", verifyToken, requireInvoiceAccess, getInvoiceById);
router.get("/invoices/:invoiceId/pdf", verifyToken, requireInvoiceAccess, getInvoicePdf);
router.post("/invoices/:invoiceId/pay", verifyToken, requireInvoiceAccess, recordInvoicePayment);
router.post("/invoices/:invoiceId/cancel", verifyToken, requireInvoiceAccess, cancelStoreInvoice);
router.post("/invoices/:invoiceId/refund", verifyToken, requireInvoiceAccess, refundStoreInvoice);

// --- Public Customer Invoice Lookup ---
router.get("/invoices/public/:invoiceNumber", getPublicInvoice);

module.exports = router;
