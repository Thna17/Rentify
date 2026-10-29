const test = require("node:test");
const assert = require("node:assert/strict");

process.env.PAYMENT_CONFIG_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
const PaymentFactory = require("../../modules/payments/core/factory/PaymentFactory");
const CutLuyPaymentStrategy = require("../../modules/payments/core/strategies/CutLuyPaymentStrategy");
const { encryptSecrets, decryptSecrets, splitConfig, sanitizeConfig } = require("../../modules/payments/paymentConfigEncryption");

test("CutLuyPaymentStrategy is created by PaymentFactory for cutluy method", () => {
  const dummyModels = { Payment: {} };
  const strategy = PaymentFactory.createStrategy("cutluy", dummyModels);
  assert.equal(strategy instanceof CutLuyPaymentStrategy, true);
});

test("CutLuy merchant API key and webhookSecret are encrypted at rest and omitted from API public data", () => {
  const { publicConfig, secrets } = splitConfig({
    apiKey: "ck_live_secret_cutluy_key_12345",
    webhookSecret: "whsec_secret_hash_67890",
    businessName: "My Khmer Store",
  });

  const encryptedSecrets = encryptSecrets(secrets);
  const storedConfig = { ...publicConfig, encryptedSecrets };

  // Verification: secrets are never in plain JSON
  assert.equal(JSON.stringify(storedConfig).includes("ck_live_secret_cutluy_key_12345"), false);
  assert.equal(JSON.stringify(storedConfig).includes("whsec_secret_hash_67890"), false);

  // Decryption recovers exact credentials
  assert.deepEqual(decryptSecrets(encryptedSecrets), {
    apiKey: "ck_live_secret_cutluy_key_12345",
    webhookSecret: "whsec_secret_hash_67890",
  });

  // Public sanitized response preserves businessName without leaking keys
  assert.deepEqual(sanitizeConfig(storedConfig), {
    businessName: "My Khmer Store",
  });
});
