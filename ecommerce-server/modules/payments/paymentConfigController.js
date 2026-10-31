const { PaymentGatewayConfig, StoreAccess } = require("../../models");
const axios = require("axios");
const { Op } = require("sequelize");
const { encryptSecrets, decryptSecrets, splitConfig, sanitizeConfig } = require("./paymentConfigEncryption");

const sanitizeRecord = (record) => {
  const json = typeof record.toJSON === "function" ? record.toJSON() : record;
  const rawConfig = record.config || {};
  return {
    ...json,
    hasApiKey: Boolean(rawConfig.encryptedSecrets || rawConfig.apiKey),
    config: sanitizeConfig(rawConfig),
  };
};

exports.getPublicPaymentMethods = async (req, res) => {
  try {
    const { websiteId } = req.params;
    if (!websiteId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(websiteId)) {
      return res.status(400).json({ error: "Invalid websiteId" });
    }

    const configs = await PaymentGatewayConfig.findAll({
      where: { websiteId, enabled: true },
      attributes: ["gateway", "enabled", "config"],
      order: [["updatedAt", "DESC"]],
    });

    const paymentMethods = ["COD"];
    const hasKhqr = configs.some((c) => (c.gateway === "cutluy" || c.gateway === "khqr") && c.enabled);
    if (hasKhqr) {
      paymentMethods.push("KHQR");
    }

    const cutluyConfig = configs.find((c) => c.gateway === "cutluy");
    return res.json({
      paymentMethods,
      cutluyEnabled: Boolean(cutluyConfig?.enabled),
      businessName: cutluyConfig?.config?.businessName || "",
    });
  } catch (error) {
    console.error("Failed to fetch public payment methods:", error);
    return res.status(500).json({ error: "Failed to fetch public payment methods" });
  }
};

exports.getPaymentConfig = async (req, res) => {
  try {
    const { websiteId } = req.params;
    const configs = await PaymentGatewayConfig.findAll({
      where: { websiteId },
      order: [["updatedAt", "DESC"]],
    });

    if (!configs || configs.length === 0) {
      return res.status(404).json({ error: "No payment gateway config found" });
    }

    const seen = new Set();
    const uniqueConfigs = configs.filter((c) => {
      if (seen.has(c.gateway)) return false;
      seen.add(c.gateway);
      return true;
    });

    res.json(uniqueConfigs.map(sanitizeRecord));
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

    let storeId = null;
    if (StoreAccess) {
      const store = await StoreAccess.findOne({ where: { websiteId } });
      storeId = store?.storeId || null;
    }

    for (const [gateway, data] of Object.entries(paymentGateways)) {
      if (!["khqr", "aba", "stripe", "cutluy"].includes(gateway) || !data || typeof data !== "object") {
        return res.status(400).json({ error: "Invalid payment gateway configuration" });
      }

      const existing = await PaymentGatewayConfig.findOne({
        where: { websiteId, gateway },
        order: [["updatedAt", "DESC"]],
      });
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

      // CutLuy Validation
      if (gateway === "cutluy" && (submittedSecrets.apiKey || runtimeConfig.apiKey)) {
        const keyToTest = submittedSecrets.apiKey || runtimeConfig.apiKey;
        try {
          const cutluyBaseUrl = (process.env.CUTLUY_API_BASE_URL || "https://cutluy.com").replace(/\/+$/, "");
          await axios.get(`${cutluyBaseUrl}/v1/payments?limit=1`, {
            headers: {
              Authorization: `Bearer ${keyToTest}`,
              "User-Agent": "Rentify/1.0 (axios)",
            },
            timeout: 8000,
          });
        } catch (err) {
          if (err.response && (err.response.status === 401 || err.response.status === 403)) {
            return res.status(400).json({ error: "Invalid CutLuy API Key. Please verify your credentials at cutluy.com" });
          }
        }
      }

      const configPayload = {
        ...existingPublicConfig,
        ...publicConfig,
        ...(Object.keys(secrets).length ? { encryptedSecrets: encryptSecrets(secrets) } : {}),
      };

      if (existing) {
        await existing.update({
          enabled: Boolean(data.enabled),
          config: configPayload,
          ...(storeId ? { storeId } : {}),
        });
        await PaymentGatewayConfig.destroy({
          where: {
            websiteId,
            gateway,
            id: { [Op.ne]: existing.id },
          },
        });
      } else {
        await PaymentGatewayConfig.create({
          websiteId,
          storeId,
          gateway,
          enabled: Boolean(data.enabled),
          config: configPayload,
        });
      }
    }

    const updatedConfigs = await PaymentGatewayConfig.findAll({
      where: { websiteId },
      order: [["updatedAt", "DESC"]],
    });
    const seen = new Set();
    const uniqueUpdated = updatedConfigs.filter((c) => {
      if (seen.has(c.gateway)) return false;
      seen.add(c.gateway);
      return true;
    });
    res.json(uniqueUpdated.map(sanitizeRecord));
  } catch (error) {
    if (error.code === "PAYMENT_CONFIG_ENCRYPTION_KEY_INVALID") {
      return res.status(503).json({ error: "Payment configuration encryption is not configured" });
    }
    console.error("Failed to update payment configs:", error);
    res.status(500).json({ error: "Failed to update payment configs" });
  }
};
