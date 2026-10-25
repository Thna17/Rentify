// ecommerce-server/scripts/auditOrderSnapshots.js
// Audits order and line item snapshot coverage, mathematical integrity, and Release 1 currency policy.

const { sequelize } = require('../config/db');
const { parseMinor } = require('../utils/money');

async function audit(transaction = null) {
  const [orders] = await sequelize.query(
    `SELECT id, orderNumber, storeId, salesChannel, subtotal, shippingFee, taxTotal,
            discountTotal, totalAmount, currency, orderSnapshot
     FROM Orders`,
    { transaction }
  );

  const [items] = await sequelize.query(
    `SELECT id, orderId, productId, name, sku, quantity, price, total, currency, lineSnapshot
     FROM OrderItems`,
    { transaction }
  );

  const totalOrders = orders.length;
  const totalItems = items.length;

  let ordersWithSnapshot = 0;
  let ordersMissingSnapshot = 0;
  let itemsWithSnapshot = 0;
  let itemsMissingSnapshot = 0;

  let mathDefects = 0;
  let currencyDefects = 0;
  let negativeDefects = 0;

  for (const order of orders) {
    if (order.orderSnapshot) {
      ordersWithSnapshot += 1;
    } else {
      ordersMissingSnapshot += 1;
    }

    const currency = String(order.currency || 'USD').toUpperCase();
    if (order.salesChannel === 'marketplace' && currency !== 'USD') {
      currencyDefects += 1;
    }

    try {
      const subtotalMinor = parseMinor(order.subtotal || 0, currency, { allowNegative: true });
      const feeMinor = parseMinor(order.shippingFee || 0, currency, { allowNegative: true });
      const taxMinor = parseMinor(order.taxTotal || 0, currency, { allowNegative: true });
      const discountMinor = parseMinor(order.discountTotal || 0, currency, { allowNegative: true });
      const totalMinor = parseMinor(order.totalAmount || 0, currency, { allowNegative: true });

      if (totalMinor < 0 || subtotalMinor < 0 || feeMinor < 0) {
        negativeDefects += 1;
      }

      const calculatedTotal = subtotalMinor + feeMinor + taxMinor - discountMinor;
      if (calculatedTotal !== totalMinor) {
        mathDefects += 1;
      }
    } catch (_) {
      mathDefects += 1;
    }
  }

  for (const item of items) {
    if (item.lineSnapshot) {
      itemsWithSnapshot += 1;
    } else {
      itemsMissingSnapshot += 1;
    }
  }

  const defects = {
    ordersMissingSnapshot,
    itemsMissingSnapshot,
    mathDefects,
    currencyDefects,
    negativeDefects,
  };

  const defectCount = Object.values(defects).reduce((a, b) => a + b, 0);
  const compliant = defectCount === 0;

  return {
    totalOrders,
    ordersWithSnapshot,
    totalItems,
    itemsWithSnapshot,
    defects,
    compliant,
  };
}

async function run() {
  try {
    const report = await audit();
    console.log(JSON.stringify(report, null, 2));
    if (!report.compliant) {
      console.error('Audit failed: defects detected in order snapshots or monetary representation.');
      process.exitCode = 1;
    } else {
      console.log('P3-MNY-001 Order Snapshot & Money audit passed: 100% compliance.');
    }
  } catch (err) {
    console.error('Audit execution error:', err.message);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  run();
}

module.exports = { audit };
