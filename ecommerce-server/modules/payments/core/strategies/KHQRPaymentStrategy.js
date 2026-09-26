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

    const { data } = await axios.post(
      `${process.env.BAKONG_API_URL || 'https://api.bakong.nbc.gov.kh'}/v1/generate_deeplink_by_qr`,
      {
        qr: qrData.qrString,
        sourceInfo: {
          appIconUrl: "https://yourdomain.com/path/to/real/icon.png",  // FIX: Use a valid public HTTPS URL to an image (e.g., upload to S3 or your server)
          appName: "Rentify",  // FIX: Use your actual app name
          appDeepLinkCallback: process.env.PAYMENT_CALLBACK_URL || "https://your-public-domain.com/api/payments/callback",  // FIX: Use public URL (e.g., ngrok for local dev)
        },
      },
      {
        headers: {
          // FIX: Remove Authorization header, as it's not required for this endpoint per docs
          "Content-Type": "application/json",
        },
        timeout: 10000,
      }
    );

    const deeplink = data?.data?.shortLink || data?.shortLink;

    if (!deeplink) {
      throw new Error("Failed to generate deeplink from Bakong API");
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
