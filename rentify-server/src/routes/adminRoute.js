const express = require("express");
const router = express.Router();
const { createTemplate, updateTemplate, deleteTemplate, getAllTemplates, getTemplateById, getAuditLogs } = require("../controllers/adminController");
const { verifyToken } = require("../middlewares/auth");
const { requireAdmin } = require("../middlewares/authorization");

router.use(verifyToken, requireAdmin);
router.post("/template", createTemplate);
router.put("/template/:id", updateTemplate);
router.delete("/template/:id", deleteTemplate);
router.get("/templates", getAllTemplates);
router.get("/template/:id", getTemplateById);

module.exports = router;
