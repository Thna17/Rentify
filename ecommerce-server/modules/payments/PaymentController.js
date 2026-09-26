// controllers/PaymentController.js
const { Product, Order, OrderItem, Payment, Invoice, WebsiteData } = require("../../models");
const { Op } = require("sequelize");
const retryTransaction = require("../../utils/retryTransaction");
const { sequelize } = require("../../config/db");
const { updateStock } = require("../inventory").stockService;
const { ORDER_STATUS, PAYMENT_STATUS } = require("../../utils/constants");
const FulfillmentService = require("./FulfillmentService");
const PaymentVerificationService = require("./PaymentVerificationService");
const axios = require("axios");
exports.getPaymentStatus = async (req, res) => {
  try {
    const { paymentId } = req.params;
    console.log(paymentId);

    const payment = await Payment.findByPk(paymentId, {
      include: [
        {
          model: Order,
          attributes: ["id", "status", "totalAmount"],
        },
      ],
    });

    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }

    res.json({
      paymentId: payment.id,
      amount: payment.amount,
      status: payment.status,
      paymentMethod: payment.paymentMethod,
      orderDetails: payment.Order, // match alias here too
      md5: payment.transactionData.md5Hash,
      rawQR: payment.transactionData.rawQR,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.confirmPayment = async (req, res) => {
  const { orderId } = req.params;

  try {
    const payment = await Payment.findOne({ where: { orderId } });
    if (!payment) return res.status(404).json({ error: "Payment not found" });

    const result = await FulfillmentService.confirmOrderPayment(payment.id);
    res.json(result);
  } catch (error) {
    console.error("Confirm payment error:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
};

exports.checkPaymentStatus = async (req, res) => {
  try {
    const { paymentId } = req.params;
    let payment = await Payment.findByPk(paymentId, {
      include: [Order],
    });

    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }

    // Handle expired payments
    if (payment.status === "pending" && new Date() > payment.expiresAt) {
      await payment.update({ status: "expired" });
      return res.json(payment);
    }

    // Verify with Bakong if still pending
    if (payment.status === "pending") {
      const verification = await PaymentVerificationService.verifyBakongTransaction(
        payment.transactionData.md5Hash,
        payment.amount
      );

      if (verification) {
        // Proceed with confirmation
        await FulfillmentService.confirmOrderPayment(paymentId, verification);

        // Fetch updated status
        payment = await Payment.findByPk(paymentId);
      }
    }

    res.json(payment);
  } catch (error) {
    console.error("Status check error:", error);
    res.status(500).json({ error: "Status check failed" });
  }
};

exports.generatePaymentLink = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findOne({
      where: { id: orderId },
      include: [{ model: WebsiteData, attributes: ['domain'] }]
    });

    if (!order) return res.status(404).json({ error: "Order not found" });

    // Fallback if no custom domain
    const baseUrl = order.WebsiteData?.domain
      ? `https://${order.WebsiteData.domain}`
      : `https://store.rentify.com`;

    const link = `${baseUrl}/confirmation/${order.id}`;

    res.json({
      success: true,
      link,
      message: "Share this link with the customer to collect payment."
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
