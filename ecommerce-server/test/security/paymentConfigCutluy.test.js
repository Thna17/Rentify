const test = require("node:test");
const assert = require("node:assert/strict");

process.env.PAYMENT_CONFIG_ENCRYPTION_KEY = Buffer.alloc(32, 9).toString("base64");
const { sequelize } = require("../../config/db");
const PaymentGatewayConfig = require("../../models/PaymentGatewayConfig");
const {
  encryptSecrets,
  decryptSecrets,
  splitConfig,
  sanitizeConfig,
} = require("../../modules/payments/paymentConfigEncryption");

test.after(async () => {
  await sequelize.close().catch(() => {});
});

test("PaymentGatewayConfig model allows 'cutluy' gateway", () => {
  const gatewayValues = PaymentGatewayConfig.rawAttributes.gateway.values;
  assert.ok(Array.isArray(gatewayValues), "gateway should be an enum array");
  assert.ok(gatewayValues.includes("cutluy"), "gateway enum must include 'cutluy'");
  assert.ok(gatewayValues.includes("khqr"), "gateway enum must include 'khqr'");
  assert.ok(gatewayValues.includes("aba"), "gateway enum must include 'aba'");
  assert.ok(gatewayValues.includes("stripe"), "gateway enum must include 'stripe'");
});

test("CutLuy payment credentials encryption and sanitization", () => {
  const inputConfig = {
    businessName: "Elora Boutique",
    apiKey: "ck_live_test_api_key_12345",
    webhookSecret: "whsec_test_secret_67890",
  };

  const { publicConfig, secrets } = splitConfig(inputConfig);
  assert.deepEqual(publicConfig, { businessName: "Elora Boutique" });
  assert.deepEqual(secrets, {
    apiKey: "ck_live_test_api_key_12345",
    webhookSecret: "whsec_test_secret_67890",
  });

  const encryptedSecrets = encryptSecrets(secrets);
  const storedConfig = { ...publicConfig, encryptedSecrets };

  assert.equal(
    JSON.stringify(storedConfig).includes("ck_live_test_api_key_12345"),
    false,
    "Raw API key must not exist in serialized config"
  );
  assert.equal(
    JSON.stringify(storedConfig).includes("whsec_test_secret_67890"),
    false,
    "Raw webhook secret must not exist in serialized config"
  );

  const decrypted = decryptSecrets(encryptedSecrets);
  assert.deepEqual(decrypted, secrets);

  const sanitized = sanitizeConfig(storedConfig);
  assert.deepEqual(sanitized, { businessName: "Elora Boutique" });
});
