const express = require("express");

const {
  // createInvoice,
  getInvoices,
  getInvoicePdf,
 
} = require("./invoiceController");
const { verifyToken } = require('../../middlewares/authMiddleware');
const checkPermissions = require('../../middlewares/checkPermissions');
const { requireWebsitePermission, requireInvoiceAccess } = require('../../middlewares/requireWebsiteAccess');

const router = express.Router();

// router.post("/websites/:websiteId/invoices", verifyToken, checkPermissions(['invoice']),  createInvoice);
router.get("/websites/:websiteId/invoices", verifyToken, requireWebsitePermission(['invoice', 'invoices']), getInvoices);

router.get("/invoices/:invoiceId/pdf", verifyToken, requireInvoiceAccess, getInvoicePdf);

module.exports = router;
