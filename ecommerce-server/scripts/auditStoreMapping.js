const { sequelize } = require('../config/db');
const {
  StoreAccess, WebsiteData, Product, Category, Cart, Order, Invoice,
  Payment, UsageEvent, BillingStatement, PaymentGatewayConfig, Customer,
} = require('../models');

async function count(sql) {
  const [rows] = await sequelize.query(sql);
  return Number(rows[0].count);
}

async function audit() {
  const results = {};
  const storeTable = StoreAccess.getTableName();
  for (const model of [
    WebsiteData, Product, Category, Cart, Order, Invoice,
    UsageEvent, BillingStatement, PaymentGatewayConfig,
  ]) {
    const table = model.getTableName();
    results[table] = await count(`
      SELECT COUNT(*) AS count FROM \`${table}\` rowdata
      LEFT JOIN \`${storeTable}\` access ON access.websiteId = rowdata.websiteId
      WHERE rowdata.websiteId IS NOT NULL
        AND (access.storeId IS NULL OR rowdata.storeId IS NULL OR rowdata.storeId <> access.storeId)
    `);
  }
  results.Payments = await count(`
    SELECT COUNT(*) AS count FROM Payments payment
    JOIN Orders parentOrder ON parentOrder.id = payment.orderId
    WHERE parentOrder.storeId IS NULL OR payment.storeId IS NULL
      OR payment.storeId <> parentOrder.storeId
  `);
  results.Customers = await count(`
    SELECT COUNT(*) AS count FROM Customers customer
    LEFT JOIN \`${storeTable}\` access ON access.websiteId = customer.storeId
    WHERE customer.storeId IS NOT NULL
      AND (access.storeId IS NULL OR customer.tenantStoreId IS NULL
        OR customer.tenantStoreId <> access.storeId)
  `);
  results.unlinkedWebsiteStores = await count(`
    SELECT COUNT(*) AS count FROM \`${storeTable}\` access
    LEFT JOIN WebsiteData website ON website.websiteId = access.websiteId
    WHERE access.websiteId IS NOT NULL AND website.websiteId IS NULL
  `);
  const total = Object.values(results).reduce((sum, value) => sum + value, 0);
  console.log(JSON.stringify({ totalUnmappedOrConflicting: total, counts: results }, null, 2));
  if (total) process.exitCode = 1;
}

audit().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
}).finally(() => sequelize.close());
