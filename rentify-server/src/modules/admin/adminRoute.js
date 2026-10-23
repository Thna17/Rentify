const express = require("express");
const router = express.Router();
const { createTemplate, updateTemplate, deleteTemplate, getAllTemplates, getTemplateById } = require("./adminController");
const { verifyToken } = require("../../middlewares/auth");
const { requireAdmin } = require("../../middlewares/authorization");
const { requireRecentAuth } = require("../../middlewares/recentAuth");
const sellerReviewController = require('../stores').sellerReviewController;
const operations = require('./platformOperationsController');
const security = require('./adminSecurityController');
const safe = (handler) => (req, res, next) => Promise.resolve(handler(req, res)).catch(next);

router.use(verifyToken, requireAdmin);
router.get('/operations/overview', safe(operations.overview));
router.get('/operations/:resource', safe(operations.list));
router.patch('/operations/stores/:storeId', requireRecentAuth, safe(operations.updateStore));
router.post("/template", createTemplate);
router.put("/template/:id", updateTemplate);
router.delete("/template/:id", deleteTemplate);
router.get("/templates", getAllTemplates);
router.get("/template/:id", getTemplateById);
router.get('/stores/:storeId/seller-application', sellerReviewController.getForReview);
router.post('/stores/:storeId/seller-review', requireRecentAuth, sellerReviewController.review);

// Privileged Authentication & Session Controls (P2-SEC-001)
router.get('/mfa/status', safe(security.getMfaStatus));
router.post('/mfa/enroll', safe(security.enrollMfa));
router.post('/mfa/confirm', safe(security.confirmMfa));
router.post('/mfa/disable', requireRecentAuth, safe(security.disableMfa));
router.post('/mfa/recovery-codes/regenerate', requireRecentAuth, safe(security.regenerateRecoveryCodes));
router.post('/auth/step-up', safe(security.stepUpAuth));
router.get('/sessions', safe(security.listSessions));
router.delete('/sessions/:sessionId', safe(security.revokeSession));
router.post('/sessions/revoke-others', requireRecentAuth, safe(security.revokeAllOtherSessions));
router.post('/contact/change-request', requireRecentAuth, safe(security.requestContactChange));
router.post('/contact/verify', requireRecentAuth, safe(security.verifyContactChange));
router.patch('/users/:userId/role', requireRecentAuth, safe(security.updateUserRole));

module.exports = router;
