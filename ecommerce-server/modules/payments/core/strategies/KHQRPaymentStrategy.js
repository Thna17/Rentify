const axios = require("axios");
const { BakongKHQR, IndividualInfo } = require("bakong-khqr");
const { PAYMENT_STATUS, KHQR_CURRENCY_CODES, PAYMENT_METHODS } = require("../../../../utils/constants");
const PaymentStrategy = require("./PaymentStrategy");

class KHQRPaymentStrategy extends PaymentStrategy {
 async process(order, merchantConfig, transaction, currency) { 
  try {
    if (!merchantConfig?.config?.bakongApiKey) {
      throw new Error("KHQR not configured for this store - missing API key");
    }

    // Validate merchant configuration
    if (!merchantConfig.config.bakongAccount || !merchantConfig.config.businessName) {
      throw new Error("Merchant configuration incomplete. Missing bakongAccount or businessName");
    }

    const qrData = await this.generateKHQRString(
      merchantConfig,
      order.totalAmount,
      order.id,
      currency || 'USD'
    );

    let deeplink = null;
    try {
      const { data } = await axios.post(
        `${process.env.BAKONG_API_URL || 'https://api.bakong.nbc.gov.kh'}/v1/generate_deeplink_by_qr`,
        {
          qr: qrData.qrString,
          sourceInfo: {
            appIconUrl: process.env.APP_ICON_URL || "https://rentify.store/logo.png",
            appName: "Rentify",
            appDeepLinkCallback: process.env.PAYMENT_CALLBACK_URL || "https://rentify.store/api/payments/callback",
          },
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
          timeout: 5000,
        }
      );

      deeplink = data?.data?.shortLink || data?.shortLink || null;
    } catch (deeplinkErr) {
      console.warn("Bakong deeplink unavailable, continuing with raw KHQR:", deeplinkErr.message);
    }

    return await this.models.Payment.create(
      {
        orderId: order.id,
        amount: order.totalAmount,
        paymentMethod: PAYMENT_METHODS.KHQR,
        status: PAYMENT_STATUS.PENDING,
        transactionData: {
          md5Hash: qrData.md5Hash,
          rawQR: qrData.qrString,
          qrCodeUrl: deeplink,
          merchantAccount: merchantConfig.config.bakongAccount,
          merchantName: merchantConfig.config.businessName,
        },
        currency: currency || 'USD',
      },
      { transaction }
    );
  } catch (error) {
    console.error('KHQR payment processing failed');
    throw new Error("KHQR payment processing failed");
  }
}

async generateKHQRString(merchantConfig, amount, orderId, currency) {
  if (!merchantConfig?.config.bakongAccount || !merchantConfig?.config.businessName) {
    throw new Error("Merchant configuration incomplete");
  }
  if (isNaN(amount) || amount <= 0) {
    throw new Error("Invalid payment amount");
  }

  const individualInfo = new IndividualInfo(
    merchantConfig.config.bakongAccount,
    merchantConfig.config.businessName,
    merchantConfig.config.businessCity || "Phnom Penh"
  );

  const rawCurrency = (currency || merchantConfig?.config.currency || "USD").trim().toUpperCase();
  const normalizedCurrency = rawCurrency.trim().toUpperCase();

  individualInfo.amount = parseFloat(amount);
  individualInfo.currency = KHQR_CURRENCY_CODES[normalizedCurrency] || "840";
  
  // FIX: Use expirationTimestamp (future value) instead of timestamp
  individualInfo.expirationTimestamp = Date.now() + (15 * 60 * 1000); // Expires in 15 minutes
  

  const khqr = new BakongKHQR();
  const result = khqr.generateIndividual(individualInfo);
  
  if (!result?.data?.qr) {
    throw new Error(`Failed to generate KHQR: ${result?.message || 'Unknown error'}`);
  }

  return {
    qrString: result.data.qr,
    md5Hash: result.data.md5,
  };
}
}

module.exports = KHQRPaymentStrategy;
