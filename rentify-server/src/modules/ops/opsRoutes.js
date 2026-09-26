const express = require("express");
const {
  getReminderLogs,
  getOutcomeSummary,
  getAtRiskInvoices,
  pauseContract,
  resumeContract,
} = require("./opsController");
const { opsAccess } = require("./opsAccess");

const router = express.Router();

router.get("/reminders", opsAccess, getReminderLogs);
router.get("/outcomes/summary", opsAccess, getOutcomeSummary);
router.get("/invoices/at-risk", opsAccess, getAtRiskInvoices);
router.post("/contracts/:id/pause", opsAccess, pauseContract);
router.post("/contracts/:id/resume", opsAccess, resumeContract);

module.exports = router;
