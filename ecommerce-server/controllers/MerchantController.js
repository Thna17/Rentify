const { PaymentGatewayConfig } = require("../models");
const axios = require("axios");

// Get all payment gateway configs for a specific website
exports.getPaymentConfig = async (req, res) => {
  try {
    const { websiteId } = req.params;

    const configs = await PaymentGatewayConfig.findAll({ where: { websiteId } });

    if (!configs || configs.length === 0) {
      return res.status(404).json({ error: "No payment gateway config found for this website." });
    }

    res.json(configs);
  } catch (error) {
    console.error("Payment configuration fetch failed");
    res.status(500).json({ error: "Failed to fetch payment configs" });
  }
};

// Update or create payment gateway configs for a specific website
exports.updatePaymentConfig = async (req, res) => {
  try {
    const { websiteId } = req.params;
    
    const { paymentGateways } = req.body;

    for (const [gateway, data] of Object.entries(paymentGateways)) {
      if (!data.enabled) continue;

      // KHQR validation
      if (gateway === "khqr" && data.bakongAccount && data.bakongApiKey) {
        try {
          const response = await axios.post(
            `${process.env.BAKONG_API_URL}/v1/check_bakong_account`,
            { accountId: data.bakongAccount },
            {
              headers: {
                Authorization: `Bearer ${data.bakongApiKey}`,
                "Content-Type": "application/json",
              },
            }
          );
          
          if (response.data.responseCode !== 0) {
            return res.status(400).json({
              error: "Invalid Bakong account",
              details: "The provided Bakong account could not be verified",
            });
          }
        } catch (error) {
          console.error("Bakong payment configuration validation failed");
          return res.status(400).json({
            error: "Bakong account verification failed",
            details: error.response?.data?.responseMessage || "Could not verify account",
          });
        }
      }

      // ABA validation
      if (gateway === "aba" && data.merchantId && data.apiKey) {
        try {
          const response = await axios.post(
            `${process.env.ABA_API_URL}/v1/merchant/validate`, // Replace with your actual ABA endpoint
            { merchantId: data.merchantId },
            {
              headers: {
                Authorization: `Bearer ${data.apiKey}`,
                "Content-Type": "application/json",
              },
            }
          );

          if (!response.data.success) {
            return res.status(400).json({
              error: "Invalid ABA merchant ID",
              details: "The provided ABA merchant ID could not be verified",
            });
          }
        } catch (error) {
          console.error("ABA payment configuration validation failed");
          return res.status(400).json({
            error: "ABA merchant verification failed",
            details: error.response?.data?.message || "Could not verify merchant",
          });
        }
      }

      // Stripe validation
      if (gateway === "stripe" && data.secretKey) {
        try {
          const stripe = require("stripe")(data.secretKey);
          await stripe.balance.retrieve(); // Test API key by fetching balance
        } catch (error) {
          console.error("Stripe payment configuration validation failed");
          return res.status(400).json({
            error: "Invalid Stripe secret key",
            details: "Could not verify Stripe account",
          });
        }
      }

      // Upsert payment gateway config
      await PaymentGatewayConfig.upsert(
        {
          websiteId,
          gateway,
          enabled: data.enabled,
          config: data,
        },
        {
          conflictFields: ["websiteId", "gateway"],
        }
      );
    }

    const updatedConfigs = await PaymentGatewayConfig.findAll({ where: { websiteId } });
    res.json(updatedConfigs);
  } catch (error) {
    console.error("Payment configuration update failed");
    res.status(500).json({ error: "Failed to update payment configs" });
  }
};

exports.getBakongApiKey = async (req, res) => {
  // Provider credentials are server-only. This legacy endpoint is retained as
  // an explicit safe failure in case an old route is reintroduced.
  return res.status(410).json({ error: "Payment provider credentials are not available through the API" });
};
