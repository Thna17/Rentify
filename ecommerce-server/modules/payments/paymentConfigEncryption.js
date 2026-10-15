const crypto = require("crypto");

const SECRET_FIELDS = new Set([
  "bakongApiKey",
  "apiKey",
  "apiSecret",
  "secretKey",
  "webhookSecret",
  "privateKey",
]);

const getKey = () => {
  const key = Buffer.from(process.env.PAYMENT_CONFIG_ENCRYPTION_KEY || "", "base64");
  if (key.length !== 32) {
    const error = new Error("PAYMENT_CONFIG_ENCRYPTION_KEY must be a base64-encoded 32-byte key");
    error.code = "PAYMENT_CONFIG_ENCRYPTION_KEY_INVALID";
    throw error;
  }
  return key;
};

const encryptSecrets = (secrets) => {
  if (!Object.keys(secrets).length) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(secrets), "utf8"), cipher.final()]);
  return {
    version: 1,
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  };
};

const decryptSecrets = (encryptedSecrets) => {
  if (!encryptedSecrets) return {};
  const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), Buffer.from(encryptedSecrets.iv, "base64"));
  decipher.setAuthTag(Buffer.from(encryptedSecrets.tag, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(encryptedSecrets.ciphertext, "base64")),
    decipher.final(),
  ]);
  return JSON.parse(plaintext.toString("utf8"));
};

const splitConfig = (config = {}) => {
  const publicConfig = {};
  const secrets = {};
  for (const [key, value] of Object.entries(config)) {
    if (SECRET_FIELDS.has(key) && value) secrets[key] = value;
    else if (key !== "encryptedSecrets") publicConfig[key] = value;
  }
  return { publicConfig, secrets };
};

const sanitizeConfig = (config = {}) => {
  const { publicConfig } = splitConfig(config);
  return publicConfig;
};

module.exports = { encryptSecrets, decryptSecrets, splitConfig, sanitizeConfig };
