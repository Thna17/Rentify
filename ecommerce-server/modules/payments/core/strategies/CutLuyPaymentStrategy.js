const axios = require("axios");
const { PAYMENT_STATUS } = require("../../../../utils/constants");
const PaymentStrategy = require("./PaymentStrategy");

class CutLuyPaymentStrategy extends PaymentStrategy {
  async process(order, merchantConfig, transaction, currency) {
    try {
      const apiKey = merchantConfig?.config?.apiKey || merchantConfig?.config?.cutluyApiKey;
      if (!apiKey) {
        throw new Error("CutLuy not configured for this store - missing API key");
      }

      const rawAmount = parseFloat(order.totalAmount);
      if (isNaN(rawAmount) || rawAmount <= 0) {
        throw new Error("Invalid payment amount");
      }

      const cutluyBaseUrl = (process.env.CUTLUY_API_BASE_URL || "https://cutluy.com").replace(/\/+$/, "");
      const referenceId = `ORDER-${order.id}`;

      const idempotencyKey = order.checkoutKey ? `pos-checkout-${order.checkoutKey}` : `pos-order-${order.id}`;
      let cutluyData = null;
      try {
        const response = await axios.post(
          `${cutluyBaseUrl}/v1/payments`,
          {
            amount: rawAmount,
            currency: currency || "USD",
            reference_id: referenceId,
          },
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
              "User-Agent": "Rentify/1.0 (axios)",
              "Idempotency-Key": idempotencyKey,
              "X-Idempotency-Key": idempotencyKey,
            },
            timeout: 10000,
          }
        );
        cutluyData = response.data;
      } catch (apiError) {
        console.error("CutLuy API payment call error:", apiError.response?.data || apiError.message);
        throw new Error(
          apiError.response?.data?.message ||
            apiError.response?.data?.error ||
            "CutLuy payment creation failed"
        );
      }

      const cutluyResult = cutluyData?.data || cutluyData;
      const providerPaymentId = cutluyResult?.id;
      if (!providerPaymentId) {
        throw new Error("CutLuy payment creation failed: provider returned no payment identifier");
      }
      const checkoutUrl = cutluyResult?.checkout_url || cutluyResult?.payment_url;
      const qrString = cutluyResult?.qr_string || cutluyResult?.raw_qr || cutluyResult?.qr || "";
      if (!checkoutUrl && !qrString) {
        throw new Error("CutLuy payment creation failed: provider returned no checkout URL or QR data");
      }

      return await this.models.Payment.create(
        {
          orderId: order.id,
          storeId: order.storeId,
          amount: rawAmount,
          paymentMethod: "cutluy",
          gateway: "cutluy",
          transactionId: providerPaymentId,
          status: PAYMENT_STATUS.PENDING,
          transactionData: {
            provider: "cutluy",
            providerPaymentId,
            checkoutUrl,
            rawQR: qrString,
            qrCodeUrl: checkoutUrl,
            referenceId,
          },
          currency: currency || "USD",
        },
        { transaction }
      );
    } catch (error) {
      console.error("CutLuy payment processing failed:", error.message);
      throw error;
    }
  }
}

module.exports = CutLuyPaymentStrategy;
