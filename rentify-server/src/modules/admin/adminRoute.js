const express = require("express");
const router = express.Router();
const { createTemplate, updateTemplate, deleteTemplate, getAllTemplates, getTemplateById } = require("./adminController");
const { verifyToken } = require("../../middlewares/auth");
const { requireAdmin } = require("../../middlewares/authorization");
const sellerReviewController = require('../stores').sellerReviewController;
const operations = require('./platformOperationsController');
const safe = (handler) => (req, res, next) => Promise.resolve(handler(req, res)).catch(next);

router.use(verifyToken, requireAdmin);
router.get('/operations/overview', safe(operations.overview));
router.get('/operations/:resource', safe(operations.list));
router.patch('/operations/stores/:storeId', safe(operations.updateStore));
router.post("/template", createTemplate);
router.put("/template/:id", updateTemplate);
router.delete("/template/:id", deleteTemplate);
router.get("/templates", getAllTemplates);
router.get("/template/:id", getTemplateById);
router.get('/stores/:storeId/seller-application', sellerReviewController.getForReview);
router.post('/stores/:storeId/seller-review', sellerReviewController.review);

module.exports = router;
