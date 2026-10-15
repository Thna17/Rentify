const express = require("express");
const { opsAuth } = require("./opsAuth");
const {
  getReminderCandidates,
  sendInvoiceReminder,
  getInvoiceFacts,
} = require("./opsInvoiceController");

const router = express.Router();

router.get("/invoices/reminder-candidates", opsAuth, getReminderCandidates);
router.get("/invoices/facts", opsAuth, getInvoiceFacts);
router.post("/invoices/:invoiceId/send-reminder", opsAuth, sendInvoiceReminder);

module.exports = router;
