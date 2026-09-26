const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const crypto = require("crypto");
const axios = require("axios");
const { BakongKHQR, IndividualInfo, MerchantInfo } = require("bakong-khqr");
const { Op } = require("sequelize");
const cron = require("node-cron");
const { Payment, Package } = require("../models");

const KHQR_CURRENCY_CODES = {
  USD: "840",
  KHR: "116",
};

// CRON job for payment expiration (runs every minute)
// cron.schedule("* * * * *", async () => {
//   try {
//     const payment = await Payment.update(
//       { status: "expired" },
//       {
//         where: {
//           status: "pending",
//           expiresAt: { [Op.lt]: new Date() },
//         },
//       }
//     );
//     // console.log(`Expired ${result[0]} payments`);
//     console.log(`Expired ${payment} payments`);
//   } catch (error) {
//     console.error("Payment expiration error:", error);
//   }
// });

// Initiate KHQR Payment
exports.initiateKHQRPayment = async (req, res) => {
  try {
    const userId = req.user.id;

    // The price always comes from the package, never from the browser
    const pkg = req.body.packageId ? await Package.findByPk(req.body.packageId) : null;
    const amount = Number(pkg?.price);
    if (!pkg || !(amount > 0)) {
      return res.status(400).json({ error: "Choose a paid plan to pay for" });
    }


    const merchantConfig = {
      bakongAccount: process.env.BAKONG_MERCHANT_ACCOUNT,
      businessName: process.env.BAKONG_BUSINESS_NAME,
      businessCity: process.env.BAKONG_BUSINESS_CITY || "Phnom Penh",
      currency: process.env.BAKONG_CURRENCY || "USD",
      bakongApiKey: process.env.BAKONG_API_KEY,
    };

    // Generate unique reference ID
    const referenceId = `RENTIFY-${Date.now()}-${crypto
      .randomBytes(4)
      .toString("hex")}`;
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiration

    // Create payment record
    const payment = await Payment.create({
      userId,
      amount,
      currency: merchantConfig.currency,
      paymentMethod: "khqr",
      status: "pending",
      expiresAt,
      packageId: pkg.id
    });

    // Generate KHQR
    const qrData = generateKHQRString(merchantConfig, amount, referenceId);

    // The bank-app deeplink is a convenience; the QR itself is enough to pay
    let deeplink = null;
    try {
      const { data } = await axios.post(
        `${process.env.BAKONG_API_URL}/v1/generate_deeplink_by_qr`,
        {
          qr: qrData.qrString,
          sourceInfo: {
            appIconUrl: "https://yourdomain.com/logo.png",
            appName: "Choulweb",
            appDeepLinkCallback:
              process.env.PAYMENT_CALLBACK_URL || "https://yourdomain.com/payment/callback",
          },
        },
        {
          headers: {
            Authorization: `Bearer ${merchantConfig.bakongApiKey}`,
            "Content-Type": "application/json",
          },
          timeout: 10000,
        }
      );

      deeplink = data?.data?.shortLink || null;
    } catch (linkError) {
      console.warn("Bakong deeplink unavailable:", linkError.message);
    }

    // Update payment with transaction data
    await payment.update({
      transactionData: {
        qrCodeUrl: deeplink,
        rawQR: qrData.qrString,
      },
      md5Hash: qrData.md5Hash,
    });

    res.json({
      paymentId: payment.id,
      qrCodeUrl: deeplink,
      rawQR: qrData.qrString,
      amount,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("KHQR initiation error:", error);
    res.status(500).json({ error: "Payment initiation failed" });
  }
};

// Check Payment Status
exports.checkPaymentStatus = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const payment = await Payment.findByPk(paymentId);

    // Only the payer may read or advance their payment
    if (!payment || payment.userId !== req.user.id) {
      return res.status(404).json({ error: "Payment not found" });
    }

    // Handle expired payments
    if (payment.status === "pending" && new Date() > payment.expiresAt) {
      await payment.update({ status: "expired" });
      return res.json(payment);
    }

    // If still pending, verify with Bakong API
    if (payment.status === "pending") {
      try {
        const verification = await axios.post(
          `https://api-bakong.nbc.gov.kh/v1/check_transaction_by_md5`,
          { md5: payment.md5Hash },
          { headers: { Authorization: `Bearer ${process.env.BAKONG_API_KEY}` } }
        );

        if (
          verification.data?.responseMessage === "Success" &&
          verification.data?.responseCode === 0
        ) {
          // Additional security checks

          if (verification.data.data.amount !== payment.amount) {
            console.warn(`Amount mismatch for payment ${paymentId}`);
            return res.json(payment);
          }

          await payment.update({
            status: "completed",
            transactionId: verification.data.transactionId,
          });

          // The subscription is created when onboarding creates the website
          // with this paymentId (websiteService.createWebsiteWithTrial).
        }
      } catch (error) {
        console.error("Bakong verification error:", error);
      }
    }

    res.json(payment);
  } catch (error) {
    console.error("Status check error:", error);
    res.status(500).json({ error: "Status check failed" });
  }
};

// Helper function to generate KHQR string
function generateKHQRString(merchantConfig, amount, referenceId, webhookUrl) {

  if (!merchantConfig.bakongAccount || !merchantConfig.businessName) {
    throw new Error("Merchant configuration incomplete");
  }

  if (isNaN(amount) || amount <= 0) {
    throw new Error("Invalid payment amount");
  }

  const individualInfo = new IndividualInfo(
    merchantConfig.bakongAccount,
    merchantConfig.businessName,
    merchantConfig.businessCity
  );

  individualInfo.amount = amount;
  individualInfo.timestamp = Date.now();
  const rawCurrency = merchantConfig?.currency || "USD";
  const normalizedCurrency = rawCurrency.trim().toUpperCase();
  individualInfo.currency = KHQR_CURRENCY_CODES[normalizedCurrency] || "840";
  individualInfo.expirationTimestamp = individualInfo.timestamp + 5 * 60 * 1000;
  individualInfo.additionalData = { webhookUrl, referenceId };

  const khqr = new BakongKHQR();
  const result = khqr.generateIndividual(individualInfo);

  if (!result?.data?.qr) {
    throw new Error("Failed to generate KHQR");
  }

  return {
    qrString: result.data.qr,
    md5Hash: result.data.md5,
  };
}
