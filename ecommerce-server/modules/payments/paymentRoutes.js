const express = require("express");
const { verifyToken } = require("../../middlewares/authMiddleware");
const { requireOrderAccess } = require("../../middlewares/requireWebsiteAccess");
const PaymentController = require("./PaymentController");

const router = express.Router();

// Storefront & marketplace payment methods
router.get("/payments/public-methods/:websiteId", PaymentController.getPublicPaymentMethods);
router.get("/public-methods/:websiteId", PaymentController.getPublicPaymentMethods);
router.get("/payments/public-methods/store/:storeId", PaymentController.getStorePublicPaymentMethods);
router.get("/public-methods/store/:storeId", PaymentController.getStorePublicPaymentMethods);

// Payment status checks (supports /payments/:id and root /:id)
router.get("/payments/:paymentId", PaymentController.getPaymentStatus);
router.get("/:paymentId", PaymentController.getPaymentStatus);
router.get("/payments/:paymentId/status", PaymentController.getPaymentStatus);
router.get("/:paymentId/status", PaymentController.getPaymentStatus);
router.get("/payments/:paymentId/check-status", PaymentController.checkPaymentStatus);
router.get("/:paymentId/check-status", PaymentController.checkPaymentStatus);

// Payment cancellation / void (e.g. POS cashier switches to cash)
router.post("/payments/:paymentId/void", PaymentController.voidPayment);
router.post("/:paymentId/void", PaymentController.voidPayment);
router.post("/payments/:paymentId/cancel", PaymentController.voidPayment);
router.post("/:paymentId/cancel", PaymentController.voidPayment);

// CutLuy Webhook for merchant store orders
router.post("/payments/cutluy/webhook", PaymentController.handleCutluyWebhook);
router.post("/cutluy/webhook", PaymentController.handleCutluyWebhook);

// Merchant/staff-only payment actions
router.post("/orders/:orderId/confirm-payment", verifyToken, requireOrderAccess, PaymentController.confirmPayment);
router.post("/orders/:orderId/link", verifyToken, requireOrderAccess, PaymentController.generatePaymentLink);

module.exports = router;
