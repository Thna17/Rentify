// ecommerce-server/modules/inventory/legacyWebsiteReconciliationService.js
// P3-INV-002: Reconciliation service for legacy Website orders and canonical inventory ledger.
// Audits mapped vs unmapped orders, ambiguous mappings, and fails safely on unexplained records.

const { Op } = require('sequelize');
const {
  Order,
  OrderItem,
  InventoryLedgerEntry,
  Product,
  ProductVariant,
} = require('../../models');
const { legacyWebsiteCompatibilityService } = require('../orders');
const {
  resolveWebsiteToStore,
  resolveLegacyItemToSku,
} = legacyWebsiteCompatibilityService;

/**
 * Reconciles all legacy Website orders against Store mappings, canonical SKUs,
 * and canonical InventoryLedgerEntry records.
 */
async function reconcileLegacyWebsiteStock({
  websiteId = null,
  storeId = null,
  limit = 1000,
  strict = false,
  OrderModel = Order,
  OrderItemModel = OrderItem,
  InventoryLedgerEntryModel = InventoryLedgerEntry,
  ProductModel = Product,
  ProductVariantModel = ProductVariant,
} = {}) {
  const orderWhere = {
    websiteId: { [Op.ne]: null },
  };

  if (websiteId) orderWhere.websiteId = websiteId;
  if (storeId) orderWhere.storeId = storeId;

  const orders = await OrderModel.findAll({
    where: orderWhere,
    include: [{ model: OrderItemModel, as: 'OrderItems' }],
    limit,
    order: [['createdAt', 'DESC']],
  });

  const mappedOrders = [];
  const unmappedOrders = [];
  const ambiguousOrders = [];
  const unmigratedOrders = [];
  const reconciledOrders = [];
  const unexplainedRecords = [];

  for (const order of orders) {
    let resolvedStore = null;
    let websiteStatus = 'MAPPED';
    let websiteError = null;

    try {
      resolvedStore = await resolveWebsiteToStore(order.websiteId);
    } catch (err) {
      if (err.name === 'AmbiguousWebsiteMappingError' || err.code === 'AMBIGUOUS_WEBSITE_STORE_MAPPING') {
        websiteStatus = 'AMBIGUOUS';
      } else if (err.name === 'UnresolvedWebsiteStoreError' || err.code === 'UNRESOLVED_WEBSITE_STORE') {
        websiteStatus = 'UNMAPPED';
      } else {
        websiteStatus = 'ERROR';
      }
      websiteError = err.message;
    }

    const itemsAudit = [];
    let hasAmbiguousSku = false;
    let hasUnmappedSku = false;
    let allItemsLedgerReconciled = true;

    for (const item of (order.OrderItems || [])) {
      let resolvedSku = null;
      let skuStatus = 'MAPPED';
      let skuError = null;

      try {
        resolvedSku = await resolveLegacyItemToSku({
          productId: item.productId,
          variantId: item.variantId,
          storeId: resolvedStore?.storeId || order.storeId,
        });
      } catch (err) {
        if (err.name === 'AmbiguousProductSkuMappingError' || err.code === 'AMBIGUOUS_PRODUCT_SKU_MAPPING') {
          skuStatus = 'AMBIGUOUS';
          hasAmbiguousSku = true;
        } else {
          skuStatus = 'UNMAPPED';
          hasUnmappedSku = true;
        }
        skuError = err.message;
      }

      // Check corresponding ledger entry if stock was deducted
      let ledgerEntry = null;
      if (order.stockDeducted && resolvedSku?.skuId) {
        ledgerEntry = await InventoryLedgerEntryModel.findOne({
          where: {
            sourceId: order.id,
            skuId: resolvedSku.skuId,
          },
        });

        if (!ledgerEntry) {
          allItemsLedgerReconciled = false;
        }
      }

      itemsAudit.push({
        itemId: item.id,
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        skuStatus,
        skuId: resolvedSku?.skuId || null,
        skuError,
        hasLedgerEntry: !!ledgerEntry,
      });
    }

    const orderReport = {
      orderId: order.id,
      orderNumber: order.orderNumber,
      websiteId: order.websiteId,
      orderStoreId: order.storeId,
      resolvedStoreId: resolvedStore?.storeId || null,
      websiteStatus,
      websiteError,
      status: order.status,
      stockDeducted: order.stockDeducted,
      items: itemsAudit,
    };

    if (websiteStatus === 'AMBIGUOUS' || hasAmbiguousSku) {
      ambiguousOrders.push(orderReport);
    } else if (websiteStatus === 'UNMAPPED' || hasUnmappedSku) {
      unmappedOrders.push(orderReport);
    } else {
      mappedOrders.push(orderReport);
      if (order.stockDeducted && !allItemsLedgerReconciled) {
        unmigratedOrders.push(orderReport);
      } else if (order.stockDeducted && allItemsLedgerReconciled) {
        reconciledOrders.push(orderReport);
      }
    }
  }

  // Detect Unexplained Records:
  // 1. Any InventoryLedgerEntry with sourceType='legacy_website_order' referencing non-existent Order
  const legacyLedgerEntries = await InventoryLedgerEntryModel.findAll({
    where: { sourceType: 'legacy_website_order' },
    limit: 2000,
  });

  for (const entry of legacyLedgerEntries) {
    const parentOrder = await OrderModel.findByPk(entry.sourceId);
    if (!parentOrder) {
      unexplainedRecords.push({
        type: 'ORPHANED_LEDGER_ENTRY',
        ledgerId: entry.id,
        sourceId: entry.sourceId,
        storeId: entry.storeId,
        skuId: entry.skuId,
        reasonCode: entry.reasonCode,
        changeOnHand: entry.changeOnHand,
        description: `Inventory ledger entry ${entry.id} references non-existent order ${entry.sourceId}`,
      });
    }

    // Verify SKU existence
    const variantExists = await ProductVariantModel.findByPk(entry.skuId);
    const productExists = variantExists ? null : await ProductModel.findByPk(entry.skuId);

    if (!variantExists && !productExists) {
      unexplainedRecords.push({
        type: 'DANGLING_SKU_REFERENCE',
        ledgerId: entry.id,
        skuId: entry.skuId,
        storeId: entry.storeId,
        description: `Inventory ledger entry ${entry.id} references unknown SKU ${entry.skuId}`,
      });
    }
  }

  let finalStatus = 'CLEAN';
  if (unexplainedRecords.length > 0) {
    finalStatus = 'UNEXPLAINED_RECORDS_DETECTED';
  } else if (ambiguousOrders.length > 0 || unmappedOrders.length > 0) {
    finalStatus = 'WARNING_DISCREPANCIES_FOUND';
  }

  return {
    timestamp: new Date().toISOString(),
    summary: {
      totalOrders: orders.length,
      mappedOrders: mappedOrders.length,
      unmappedOrders: unmappedOrders.length,
      ambiguousOrders: ambiguousOrders.length,
      reconciledLedgerOrders: reconciledOrders.length,
      unmigratedHistoricalOrders: unmigratedOrders.length,
      unexplainedRecordsCount: unexplainedRecords.length,
      status: finalStatus,
    },
    details: {
      mappedOrders,
      unmappedOrders,
      ambiguousOrders,
      unmigratedHistoricalOrders: unmigratedOrders,
      unexplainedRecords,
    },
  };
}

module.exports = {
  reconcileLegacyWebsiteStock,
};
