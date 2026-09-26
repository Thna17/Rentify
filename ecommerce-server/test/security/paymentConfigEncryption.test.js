const test = require("node:test");
const assert = require("node:assert/strict");

process.env.PAYMENT_CONFIG_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
const { encryptSecrets, decryptSecrets, splitConfig, sanitizeConfig } = require("../../modules/payments/paymentConfigEncryption");

test("payment-provider credentials are encrypted at rest and omitted from API data", () => {
  const { publicConfig, secrets } = splitConfig({
    bakongAccount: "merchant@example",
    bakongApiKey: "not-a-real-key",
  });
  const encryptedSecrets = encryptSecrets(secrets);
  const storedConfig = { ...publicConfig, encryptedSecrets };

  assert.equal(JSON.stringify(storedConfig).includes("not-a-real-key"), false);
  assert.deepEqual(decryptSecrets(encryptedSecrets), { bakongApiKey: "not-a-real-key" });
  assert.deepEqual(sanitizeConfig(storedConfig), { bakongAccount: "merchant@example" });
});
