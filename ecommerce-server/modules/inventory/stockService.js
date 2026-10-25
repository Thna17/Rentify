// ecommerce-server/modules/inventory/stockService.js
// P3-INV-002: Canonical compatibility adapter for legacy updateStock calls.
// Routes all stock deductions and restorations through inventoryLedgerService.

const { Order, OrderItem, Product, ProductVariant, WebsiteData } = require("../../models");
const inventoryLedgerService = require('./inventoryLedgerService');

function safeTxOption(tx) {
  if (tx && (tx.id || tx.uuid)) return { transaction: tx };
  return {};
}

exports.updateStock = async (orderId, action, transaction, options = {}) => {
  const txOption = safeTxOption(transaction);

  const order = await Order.findByPk(orderId, {
    include: [{ model: OrderItem, as: 'OrderItems' }],
    ...txOption,
    lock: transaction?.LOCK ? transaction.LOCK.UPDATE : undefined,
  });
  if (!order) throw new Error('Order not found');
  if (!['deduct', 'restore'].includes(action)) throw new Error('Invalid stock action');
  if ((action === 'deduct' && order.stockDeducted) || (action === 'restore' && !order.stockDeducted)) {
    return order;
  }

  let effectiveStoreId = order.storeId;
  if (!effectiveStoreId && order.websiteId && WebsiteData) {
    try {
      const site = await WebsiteData.findOne({ where: { websiteId: order.websiteId }, ...txOption });
      if (site) effectiveStoreId = site.storeId;
    } catch (err) {
      effectiveStoreId = null;
    }
  }

  const sortedItems = [...(order.OrderItems || [])].sort((a, b) =>
    a.productId.localeCompare(b.productId)
  );

  const baseKey = options.idempotencyKey || `stock-svc-${action}-${order.id}`;

  for (const item of sortedItems) {
    let skuId = item.variantId;
    let variant = null;
    let product = null;

    if (skuId) {
      variant = await ProductVariant.findByPk(skuId, txOption).catch(() => null);
    } else {
      variant = await ProductVariant.findOne({ where: { productId: item.productId, isDefault: true }, ...txOption }).catch(() => null) ||
                await ProductVariant.findOne({ where: { productId: item.productId }, ...txOption }).catch(() => null);
      if (variant) skuId = variant.id;
    }

    if (!variant) {
      product = await Product.findByPk(item.productId, txOption).catch(() => null);
      if (product?.defaultSkuId) {
        variant = await ProductVariant.findByPk(product.defaultSkuId, txOption).catch(() => null);
        if (variant) skuId = variant.id;
      }
    }

    if (!skuId) {
      skuId = item.productId;
    }

    const storeId = effectiveStoreId || variant?.storeId || product?.storeId || 'legacy-store';

    try {
      await inventoryLedgerService.ensureBalance(
        { storeId, skuId, variant, product },
        txOption
      );

      const changeOnHand = action === 'deduct' ? -item.quantity : item.quantity;
      const reasonCode = action === 'deduct'
        ? (order.orderType === 'pos' ? 'pos_sale' : 'sale')
        : 'cancellation';

      await inventoryLedgerService.mutateBalance({
        storeId,
        skuId,
        changeOnHand,
        changeReserved: 0,
        reasonCode,
        sourceType: 'legacy_website_order',
        sourceId: order.id,
        actor: options.actor || { id: storeId, type: 'system' },
        idempotencyKey: `${baseKey}-${item.id || item.productId}-${skuId}`,
        monetaryContext: {
          legacySource: 'stockService',
          legacyWebsiteId: order.websiteId,
          legacyOrderId: order.id,
          action,
        },
        notes: `Legacy stockService ${action} (orderId: ${order.id}, websiteId: ${order.websiteId || 'none'})`,
      }, txOption);
    } catch (invErr) {
      if (invErr.name === 'InsufficientStockError' || invErr.statusCode === 409 || invErr.code === 'INSUFFICIENT_STOCK') {
        throw invErr;
      }
    }
  }

  if (typeof order.update === 'function') {
    await order.update({ stockDeducted: action === 'deduct' }, { ...txOption, byStateMachine: true });
  } else {
    order.stockDeducted = action === 'deduct';
  }
  return order;
};
