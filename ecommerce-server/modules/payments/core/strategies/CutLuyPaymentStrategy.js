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

      const providerPaymentId = cutluyData?.id || `cutluy_${order.id}`;
      const checkoutUrl = cutluyData?.checkout_url || `https://cutluy.com/pay/${providerPaymentId}`;
      const qrString = cutluyData?.qr_string || "";

      return await this.models.Payment.create(
        {
          orderId: order.id,
          amount: rawAmount,
          paymentMethod: "cutluy",
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
