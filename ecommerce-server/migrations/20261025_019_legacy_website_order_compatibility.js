// ecommerce-server/migrations/20261025_019_legacy_website_order_compatibility.js
// Migration 019: P3-INV-002 Legacy Website Order Compatibility.
// Adds composite indexes for legacy order queries and safely backfills storeId for unambiguous website orders.

const { QueryTypes } = require('sequelize');

exports.up = async (contextOrQueryInterface, maybeSequelize) => {
  const queryInterface = contextOrQueryInterface.queryInterface || contextOrQueryInterface;
  const sequelize = contextOrQueryInterface.sequelize || maybeSequelize || queryInterface.sequelize;

  // 1. Add composite indexes to Orders idempotently
  try {
    await queryInterface.addIndex('Orders', ['websiteId', 'storeId'], {
      name: 'idx_orders_website_store',
    });
  } catch (err) {
    // Ignore if index already exists
  }

  try {
    await queryInterface.addIndex('Orders', ['websiteId', 'createdAt'], {
      name: 'idx_orders_website_created',
    });
  } catch (err) {
    // Ignore if index already exists
  }

  // 2. Safe Store backfill for historical Orders where websiteId is set but storeId is null
  try {
    const unmappedOrders = await sequelize.query(
      `SELECT DISTINCT websiteId FROM Orders WHERE websiteId IS NOT NULL AND (storeId IS NULL OR storeId = '')`,
      { type: QueryTypes.SELECT }
    );

    for (const row of unmappedOrders) {
      const websiteId = row.websiteId;
      if (!websiteId) continue;

      // Find store from WebsiteData
      const [websiteRows] = await sequelize.query(
        `SELECT storeId FROM WebsiteData WHERE websiteId = :websiteId LIMIT 1`,
        { replacements: { websiteId } }
      );
      const storeFromWebsite = websiteRows?.[0]?.storeId || null;

      // Find store from StoreAccess
      const [storeAccessRows] = await sequelize.query(
        `SELECT DISTINCT storeId FROM StoreAccess WHERE websiteId = :websiteId`,
        { replacements: { websiteId } }
      );

      const distinctAccessStoreIds = storeAccessRows.map((r) => r.storeId).filter(Boolean);

      // Check ambiguity: multiple stores in StoreAccess, or conflicting with WebsiteData
      if (distinctAccessStoreIds.length > 1) {
        console.warn(`[Migration 019] Ambiguous Store mapping for Website ${websiteId}. Skipping automatic backfill.`);
        continue;
      }

      const storeFromAccess = distinctAccessStoreIds[0] || null;

      if (storeFromWebsite && storeFromAccess && storeFromWebsite !== storeFromAccess) {
        console.warn(`[Migration 019] Conflicting Store mapping for Website ${websiteId}: WebsiteData=${storeFromWebsite}, StoreAccess=${storeFromAccess}. Skipping.`);
        continue;
      }

      const resolvedStoreId = storeFromWebsite || storeFromAccess;
      if (resolvedStoreId) {
        await sequelize.query(
          `UPDATE Orders SET storeId = :resolvedStoreId WHERE websiteId = :websiteId AND (storeId IS NULL OR storeId = '')`,
          { replacements: { resolvedStoreId, websiteId } }
        );
      }
    }
  } catch (backfillErr) {
    console.warn(`[Migration 019] Historical orders backfill advisory: ${backfillErr.message}`);
  }
};

exports.down = async (contextOrQueryInterface) => {
  const queryInterface = contextOrQueryInterface.queryInterface || contextOrQueryInterface;

  try {
    await queryInterface.removeIndex('Orders', 'idx_orders_website_store');
  } catch (err) {
    // Ignore if missing
  }

  try {
    await queryInterface.removeIndex('Orders', 'idx_orders_website_created');
  } catch (err) {
    // Ignore if missing
  }
};
