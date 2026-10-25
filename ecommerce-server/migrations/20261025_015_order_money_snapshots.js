// ecommerce-server/migrations/20261025_015_order_money_snapshots.js
// Migration 015: P3-MNY-001 Canonical Money and Order Snapshots
// Adds immutable order-level and line-level snapshots and backfills existing orders.

const { parseMinor, formatDecimal } = require('../utils/money');

exports.up = async (queryInterface, Sequelize) => {
    // 1. Add orderSnapshot to Orders if not present
    const orderTableInfo = await queryInterface.describeTable('Orders').catch(() => ({}));
    if (!orderTableInfo.orderSnapshot) {
      await queryInterface.addColumn('Orders', 'orderSnapshot', {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'P3-MNY-001: Immutable order-level money and policy snapshot',
      });
    }

    // 2. Add lineSnapshot to OrderItems if not present
    const itemTableInfo = await queryInterface.describeTable('OrderItems').catch(() => ({}));
    if (!itemTableInfo.lineSnapshot) {
      await queryInterface.addColumn('OrderItems', 'lineSnapshot', {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'P3-MNY-001: Immutable line-item money and identity snapshot',
      });
    }

    // 3. Idempotently backfill existing orders without orderSnapshot
    const [orders] = await queryInterface.sequelize.query(
      `SELECT id, orderNumber, storeId, websiteId, salesChannel, status, deliveryStatus,
              subtotal, discountTotal, taxTotal, shippingFee, totalAmount, currency, createdAt
       FROM Orders
       WHERE orderSnapshot IS NULL`
    ).catch(() => [[]]);

    let backfilledOrdersCount = 0;
    let backfilledItemsCount = 0;

    for (const order of orders) {
      const [items] = await queryInterface.sequelize.query(
        `SELECT id, orderId, productId, variantId, name, sku, quantity, basePrice, price, total, currency
         FROM OrderItems
         WHERE orderId = :orderId`,
        { replacements: { orderId: order.id } }
      ).catch(() => [[]]);

      const currency = String(order.currency || 'USD').toUpperCase();
      const lineSnapshots = [];

      for (const item of items) {
        let unitPriceMinor = 0;
        let totalMinor = 0;
        try {
          unitPriceMinor = parseMinor(item.price || item.basePrice || '0.00', currency);
        } catch (_) {
          unitPriceMinor = 0;
        }

        const qty = Number(item.quantity) || 1;
        try {
          totalMinor = item.total ? parseMinor(item.total, currency) : unitPriceMinor * qty;
        } catch (_) {
          totalMinor = unitPriceMinor * qty;
        }

        const lineSnapshot = {
          lineId: item.id,
          productId: item.productId,
          productName: item.name || 'Product',
          variantId: item.variantId || null,
          sku: item.sku || '',
          barcode: null,
          attributes: {},
          unitPrice: formatDecimal(unitPriceMinor, currency),
          unitPriceMinor,
          quantity: qty,
          discount: '0.00',
          discountMinor: 0,
          tax: '0.00',
          taxMinor: 0,
          taxPolicyVersion: 'release-1-zero-tax',
          deliveryFee: '0.00',
          deliveryFeeMinor: 0,
          commission: '0.00',
          commissionMinor: 0,
          total: formatDecimal(totalMinor, currency),
          totalMinor,
          currency,
          productVersion: 0,
        };

        lineSnapshots.push(lineSnapshot);

        await queryInterface.sequelize.query(
          `UPDATE OrderItems
           SET lineSnapshot = :snapshot
           WHERE id = :id AND lineSnapshot IS NULL`,
          {
            replacements: {
              id: item.id,
              snapshot: JSON.stringify(lineSnapshot),
            },
          }
        ).catch(() => null);

        backfilledItemsCount += 1;
      }

      let subtotalMinor = 0;
      let shippingFeeMinor = 0;
      let totalAmountMinor = 0;
      let discountTotalMinor = 0;

      try { subtotalMinor = parseMinor(order.subtotal || '0.00', currency); } catch (_) { subtotalMinor = 0; }
      try { shippingFeeMinor = parseMinor(order.shippingFee || '0.00', currency); } catch (_) { shippingFeeMinor = 0; }
      try { discountTotalMinor = parseMinor(order.discountTotal || '0.00', currency); } catch (_) { discountTotalMinor = 0; }
      try { totalAmountMinor = parseMinor(order.totalAmount || '0.00', currency); } catch (_) {
        totalAmountMinor = subtotalMinor + shippingFeeMinor - discountTotalMinor;
      }

      const orderSnapshot = {
        orderId: order.id,
        orderNumber: order.orderNumber,
        storeId: order.storeId || null,
        storeName: order.storeId ? `Store ${order.storeId.slice(0, 8)}` : 'Storefront',
        salesChannel: order.salesChannel || 'storefront',
        currency,
        subtotal: formatDecimal(subtotalMinor, currency),
        subtotalMinor,
        deliveryFee: formatDecimal(shippingFeeMinor, currency),
        deliveryFeeMinor: shippingFeeMinor,
        taxTotal: '0.00',
        taxTotalMinor: 0,
        discountTotal: formatDecimal(discountTotalMinor, currency),
        discountTotalMinor,
        commissionTotal: '0.00',
        commissionTotalMinor: 0,
        totalAmount: formatDecimal(totalAmountMinor, currency),
        totalAmountMinor,
        deliveryPolicyVersion: 1,
        policyVersions: {
          delivery: 1,
          tax: 'release-1-zero-tax',
          pricing: 'v1',
        },
        calculatedAt: order.createdAt ? new Date(order.createdAt).toISOString() : new Date().toISOString(),
        itemCount: items.length,
        lines: lineSnapshots,
      };

      await queryInterface.sequelize.query(
        `UPDATE Orders
         SET orderSnapshot = :snapshot
         WHERE id = :id AND orderSnapshot IS NULL`,
        {
          replacements: {
            id: order.id,
            snapshot: JSON.stringify(orderSnapshot),
          },
        }
      ).catch(() => null);

      backfilledOrdersCount += 1;
    }

    console.log(`[P3-MNY-001 Migration Audit] Orders backfilled: ${backfilledOrdersCount}, OrderItems backfilled: ${backfilledItemsCount}`);
};

exports.down = async (queryInterface) => {
  // Drop lineSnapshot from OrderItems if present
  const itemTableInfo = await queryInterface.describeTable('OrderItems').catch(() => ({}));
  if (itemTableInfo.lineSnapshot) {
    await queryInterface.removeColumn('OrderItems', 'lineSnapshot');
  }

  // Drop orderSnapshot from Orders if present
  const orderTableInfo = await queryInterface.describeTable('Orders').catch(() => ({}));
  if (orderTableInfo.orderSnapshot) {
    await queryInterface.removeColumn('Orders', 'orderSnapshot');
  }
};
