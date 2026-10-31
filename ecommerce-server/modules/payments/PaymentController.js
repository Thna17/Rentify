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
const { getPublicPaymentMethods } = require("./paymentConfigController");
exports.getPublicPaymentMethods = getPublicPaymentMethods;
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
    if (payment.status === "pending" && payment.transactionData?.md5Hash) {
      const verification = await PaymentVerificationService.verifyBakongTransaction(
        payment.transactionData.md5Hash,
        payment.amount
      );

      if (verification) {
        // Proceed with confirmation
        await FulfillmentService.confirmOrderPayment(paymentId, verification);

        // Fetch updated status
        payment = await Payment.findByPk(paymentId, { include: [Order] });
      }
    }

    // Verify with CutLuy if pending
    if (payment.status === "pending" && (payment.gateway === "cutluy" || payment.transactionData?.provider === "cutluy")) {
      const { PaymentGatewayConfig } = require("../../models");
      const { decryptSecrets } = require("./paymentConfigEncryption");
      const order = payment.Order || (payment.orderId ? await Order.findByPk(payment.orderId) : null);
      const queryWhere = [];
      if (order?.websiteId) queryWhere.push({ websiteId: order.websiteId, gateway: "cutluy", enabled: true });
      if (payment.storeId) queryWhere.push({ storeId: payment.storeId, gateway: "cutluy", enabled: true });

      if (queryWhere.length > 0) {
        const cutluyConfig = await PaymentGatewayConfig.findOne({
          where: { [Op.or]: queryWhere },
        });

        if (cutluyConfig) {
          const cfg = cutluyConfig.config || {};
          const decrypted = cfg.encryptedSecrets ? decryptSecrets(cfg.encryptedSecrets) : {};
          const apiKey = decrypted.apiKey || cfg.apiKey;
          const providerPaymentId = payment.transactionData?.providerPaymentId || payment.transactionId;

          if (apiKey && providerPaymentId) {
            try {
              const cutluyBaseUrl = (process.env.CUTLUY_API_BASE_URL || "https://cutluy.com").replace(/\/+$/, "");
              const response = await axios.get(`${cutluyBaseUrl}/v1/payments/${providerPaymentId}`, {
                headers: {
                  Authorization: `Bearer ${apiKey}`,
                  "User-Agent": "Rentify/1.0 (axios)",
                },
                timeout: 6000,
              });

              const cutluyStatus = String(response.data?.status || "").toLowerCase();
              if (cutluyStatus === "paid" || cutluyStatus === "completed") {
                await FulfillmentService.confirmOrderPayment(paymentId, {
                  provider: "cutluy",
                  transactionId: providerPaymentId,
                  providerEvent: response.data,
                });
                payment = await Payment.findByPk(paymentId, { include: [Order] });
              }
            } catch (cutluyCheckErr) {
              console.error("CutLuy payment status poll error:", cutluyCheckErr.response?.data || cutluyCheckErr.message);
            }
          }
        }
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

exports.handleCutluyWebhook = async (req, res) => {
  try {
    const body = req.body || {};
    const rawStatus = String(body.status || body.data?.status || "").toLowerCase();
    const referenceId = String(body.reference_id || body.data?.reference_id || "").trim();
    const providerPaymentId = body.id || body.data?.id || body.payment_id;

    if (rawStatus !== "paid" && rawStatus !== "completed") {
      return res.status(200).json({ received: true, note: `Status "${rawStatus}" acknowledged without action` });
    }

    const orderId = referenceId.startsWith("ORDER-")
      ? referenceId.replace("ORDER-", "").trim()
      : referenceId;

    const queryConditions = [];
    if (orderId) queryConditions.push({ orderId });
    if (providerPaymentId) queryConditions.push({ transactionId: providerPaymentId });

    if (queryConditions.length === 0) {
      return res.status(400).json({ error: "Missing order or payment reference in webhook" });
    }

    const payment = await Payment.findOne({
      where: {
        [Op.or]: queryConditions,
        status: PAYMENT_STATUS.PENDING,
      },
    });

    if (!payment) {
      return res.status(200).json({ received: true, note: "No pending payment found matching webhook reference" });
    }

    const result = await FulfillmentService.confirmOrderPayment(payment.id, {
      provider: "cutluy",
      transactionId: providerPaymentId,
      providerEvent: body,
    });

    return res.status(200).json({ success: true, result });
  } catch (error) {
    console.error("CutLuy webhook handler error:", error);
    return res.status(500).json({ error: "CutLuy webhook processing failed" });
  }
};
