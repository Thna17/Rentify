const { PaymentGatewayConfig } = require("../../models");
const axios = require("axios");
const { encryptSecrets, decryptSecrets, splitConfig, sanitizeConfig } = require("./paymentConfigEncryption");

const sanitizeRecord = (record) => ({
  ...record.toJSON(),
  config: sanitizeConfig(record.config),
});

exports.getPaymentConfig = async (req, res) => {
  try {
    const { websiteId } = req.params;
    const configs = await PaymentGatewayConfig.findAll({ where: { websiteId } });

    if (!configs || configs.length === 0) {
      return res.status(404).json({ error: "No payment gateway config found" });
    }

    res.json(configs.map(sanitizeRecord));
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch payment configs" });
  }
};

exports.updatePaymentConfig = async (req, res) => {
  try {
    const { websiteId } = req.params;
    const { paymentGateways } = req.body;

    if (!paymentGateways || typeof paymentGateways !== "object") {
      return res.status(400).json({ error: "paymentGateways is required" });
    }

    for (const [gateway, data] of Object.entries(paymentGateways)) {
      if (!["khqr", "aba", "stripe"].includes(gateway) || !data || typeof data !== "object") {
        return res.status(400).json({ error: "Invalid payment gateway configuration" });
      }

      const existing = await PaymentGatewayConfig.findOne({ where: { websiteId, gateway } });
      const { publicConfig, secrets: submittedSecrets } = splitConfig(data);
      const existingConfig = existing?.config || {};
      const { publicConfig: existingPublicConfig, secrets: legacySecrets } = splitConfig(existingConfig);
      const existingSecrets = existingConfig.encryptedSecrets
        ? decryptSecrets(existingConfig.encryptedSecrets)
        : legacySecrets;
      const secrets = { ...existingSecrets, ...submittedSecrets };
      const runtimeConfig = { ...existingPublicConfig, ...publicConfig, ...secrets };

      // KHQR Validation
      if (gateway === "khqr" && runtimeConfig.bakongAccount && submittedSecrets.bakongApiKey) {
        const response = await axios.post(
          `${process.env.BAKONG_API_URL}/v1/check_bakong_account`,
          { accountId: runtimeConfig.bakongAccount },
          {
            headers: {
              Authorization: `Bearer ${runtimeConfig.bakongApiKey}`,
              "Content-Type": "application/json",
            },
          }
        );
        if (response.data.responseCode !== 0) {
          return res.status(400).json({ error: "Invalid Bakong account" });
        }
      }

      // ABA Validation
      if (gateway === "aba" && runtimeConfig.merchantId && submittedSecrets.apiKey) {
        const response = await axios.post(
          `${process.env.ABA_API_URL}/v1/merchant/validate`,
          { merchantId: runtimeConfig.merchantId },
          {
            headers: {
              Authorization: `Bearer ${runtimeConfig.apiKey}`,
              "Content-Type": "application/json",
            },
          }
        );
        if (!response.data.success) {
          return res.status(400).json({ error: "Invalid ABA merchant ID" });
        }
      }

      // Stripe Validation
      if (gateway === "stripe" && submittedSecrets.secretKey) {
        const stripe = require("stripe")(runtimeConfig.secretKey);
        await stripe.balance.retrieve(); // Test API key
      }

      await PaymentGatewayConfig.upsert(
        {
          websiteId,
          gateway,
          enabled: Boolean(data.enabled),
          config: {
            ...existingPublicConfig,
            ...publicConfig,
            ...(Object.keys(secrets).length ? { encryptedSecrets: encryptSecrets(secrets) } : {}),
          },
        },
        { conflictFields: ["websiteId", "gateway"] }
      );
    }

    const updatedConfigs = await PaymentGatewayConfig.findAll({ where: { websiteId } });
    res.json(updatedConfigs.map(sanitizeRecord));
  } catch (error) {
    if (error.code === "PAYMENT_CONFIG_ENCRYPTION_KEY_INVALID") {
      return res.status(503).json({ error: "Payment configuration encryption is not configured" });
    }
    res.status(500).json({ error: "Failed to update payment configs" });
  }
};
