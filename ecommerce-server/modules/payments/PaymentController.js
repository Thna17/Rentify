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

              const cutluyStatus = String(response.data?.status || response.data?.data?.status || "").toLowerCase();
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



function verifyCutluySignature(req, secret) {
  if (!secret) return false;
  const signatureHeader = req.headers['x-cutluy-signature'] || req.headers['x-signature'];
  if (!signatureHeader) return false;

  const rawBody = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body);
  let signature = signatureHeader.trim();
  let timestamp = null;

  if (signatureHeader.includes('t=') && signatureHeader.includes('v1=')) {
    const parts = signatureHeader.split(',');
    for (const part of parts) {
      const [k, v] = part.split('=');
      if (k && k.trim() === 't') timestamp = parseInt(v.trim(), 10);
      if (k && k.trim() === 'v1') signature = v.trim();
    }
  }

  // Freshness check: reject requests older than 10 minutes if timestamp supplied
  if (timestamp && !isNaN(timestamp)) {
    const ageSeconds = Math.abs(Date.now() / 1000 - timestamp);
    if (ageSeconds > 600) {
      return false;
    }
  }

  const payloadToSign = timestamp ? `${timestamp}.${rawBody}` : rawBody;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payloadToSign)
    .digest('hex');

  try {
    const expectedBuf = Buffer.from(expectedSignature, 'utf8');
    const actualBuf = Buffer.from(signature, 'utf8');
    if (expectedBuf.length !== actualBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, actualBuf);
  } catch {
    return false;
  }
}


exports.handleCutluyWebhook = async (req, res) => {
  try {
    const body = req.body || {};
    // Extract payment details from data.payment (standard CutLuy shape) or fallback to data / top-level
    const paymentData = body.data?.payment || body.data || body;
    const rawStatus = String(paymentData.status || body.status || body.event || "").toLowerCase();
    const referenceId = String(paymentData.reference_id || body.reference_id || "").trim();
    const providerPaymentId = paymentData.id || body.id || body.payment_id;

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
      where: { [Op.or]: queryConditions },
      include: [{ model: Order }],
    });

    if (!payment) {
      return res.status(200).json({ received: true, note: "No payment found matching webhook reference" });
    }

    // Resolve merchant CutLuy signing secret for verification
    const { PaymentGatewayConfig } = require("../../models");
    const { decryptSecrets } = require("./paymentConfigEncryption");
    const order = payment.Order || (payment.orderId ? await Order.findByPk(payment.orderId) : null);
    const configWhere = [];
    if (order?.websiteId) configWhere.push({ websiteId: order.websiteId, gateway: "cutluy", enabled: true });
    if (payment.storeId) configWhere.push({ storeId: payment.storeId, gateway: "cutluy", enabled: true });

    let webhookSecret = process.env.CUTLUY_WEBHOOK_SECRET || null;
    if (configWhere.length > 0) {
      const cutluyConfig = await PaymentGatewayConfig.findOne({
        where: { [Op.or]: configWhere },
      });
      if (cutluyConfig) {
        const cfg = cutluyConfig.config || {};
        const decrypted = cfg.encryptedSecrets ? decryptSecrets(cfg.encryptedSecrets) : {};
        webhookSecret = decrypted.webhookSecret || decrypted.apiKey || cfg.webhookSecret || cfg.apiKey || webhookSecret;
      }
    }

    // Verify signature when header is present, or enforce in non-test environments if secret exists
    const signatureHeader = req.headers['x-cutluy-signature'] || req.headers['x-signature'];
    if (signatureHeader || (webhookSecret && process.env.NODE_ENV === 'production')) {
      const isValid = verifyCutluySignature(req, webhookSecret);
      if (!isValid) {
        return res.status(401).json({ error: "Invalid CutLuy webhook signature" });
      }
    }

    // Acknowledge non-payment events
    const isCompleted = rawStatus === "paid" || rawStatus === "completed" || rawStatus === "payment.completed";
    if (!isCompleted) {
      return res.status(200).json({ received: true, note: `Status "${rawStatus}" acknowledged without action` });
    }

    // Idempotency: order already paid
    if (payment.status === PAYMENT_STATUS.COMPLETED || payment.status === PAYMENT_STATUS.PAID) {
      return res.status(200).json({ received: true, alreadyCompleted: true });
    }

    // If order was already cancelled or expired, log for support and do not reopen or duplicate inventory actions
    if (order?.status === "cancelled" || payment.status === "expired") {
      console.warn(`[CutLuy Webhook] Late payment received for cancelled/expired order ${order?.id || payment.orderId} (payment ${payment.id})`);
      return res.status(200).json({
        received: true,
        latePayment: true,
        note: "Order was already cancelled or expired; payment logged for merchant support review",
      });
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

