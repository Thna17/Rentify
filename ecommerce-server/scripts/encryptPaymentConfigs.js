require("dotenv").config();

const { PaymentGatewayConfig } = require("../models");
const { sequelize } = require("../config/db");
const { encryptSecrets, splitConfig } = require("../utils/paymentConfigEncryption");

const run = async () => {
  const records = await PaymentGatewayConfig.findAll();
  let migrated = 0;

  for (const record of records) {
    if (record.config?.encryptedSecrets) continue;
    const { publicConfig, secrets } = splitConfig(record.config || {});
    if (!Object.keys(secrets).length) continue;

    await record.update({
      config: { ...publicConfig, encryptedSecrets: encryptSecrets(secrets) },
    });
    migrated += 1;
  }

  console.log(`Encrypted payment configuration records: ${migrated}`);
};

run()
  .catch((error) => {
    console.error("Payment configuration encryption migration failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
  });
