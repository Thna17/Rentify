const express = require("express");
const { verifyToken } = require("../../middlewares/authMiddleware");
const { requireOrderAccess } = require("../../middlewares/requireWebsiteAccess");
const PaymentController = require("./PaymentController");

const router = express.Router();

// Storefront payment-status reads. A payment id is an unguessable UUID and the
// response deliberately excludes provider credentials.
router.get("/payments/:paymentId", PaymentController.getPaymentStatus);
router.get("/payments/:paymentId/check-status", PaymentController.checkPaymentStatus);

// Merchant/staff-only payment actions.
router.post("/orders/:orderId/confirm-payment", verifyToken, requireOrderAccess, PaymentController.confirmPayment);
router.post("/orders/:orderId/link", verifyToken, requireOrderAccess, PaymentController.generatePaymentLink);

module.exports = router;
