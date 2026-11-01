const express = require("express");
const { verifyToken } = require("../../middlewares/authMiddleware");
const { requireOrderAccess, requirePaymentOrderAccess } = require("../../middlewares/requireWebsiteAccess");
const PaymentController = require("./PaymentController");

const router = express.Router();

// Storefront & marketplace payment methods
router.get("/payments/public-methods/:websiteId", PaymentController.getPublicPaymentMethods);
router.get("/payments/public-methods/store/:storeId", PaymentController.getStorePublicPaymentMethods);

// Payment status checks
router.get("/payments/:paymentId", PaymentController.getPaymentStatus);
router.get("/payments/:paymentId/check-status", PaymentController.checkPaymentStatus);

// Payment cancellation / void (e.g. POS cashier switches to cash)
router.post("/payments/:paymentId/void", verifyToken, requirePaymentOrderAccess, PaymentController.voidPayment);

// CutLuy Webhook for merchant store orders
router.post("/payments/cutluy/webhook", PaymentController.handleCutluyWebhook);

// Merchant/staff-only payment actions
router.post("/orders/:orderId/confirm-payment", verifyToken, requireOrderAccess, PaymentController.confirmPayment);
router.post("/orders/:orderId/link", verifyToken, requireOrderAccess, PaymentController.generatePaymentLink);

module.exports = router;
