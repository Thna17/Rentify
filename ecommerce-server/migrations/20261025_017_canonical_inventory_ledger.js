// ecommerce-server/migrations/20261025_017_canonical_inventory_ledger.js
// Migration 017: P3-INV-001 Canonical Inventory Ledger, Balances, Reservations, and Opening Balance Backfill.
const { DataTypes } = require('sequelize');
const { randomUUID } = require('node:crypto');

exports.up = async (contextOrQueryInterface, maybeSequelize) => {
  const queryInterface = contextOrQueryInterface.queryInterface || contextOrQueryInterface;
  const sequelize = contextOrQueryInterface.sequelize || maybeSequelize || queryInterface.sequelize;
  const existingTables = (await queryInterface.showAllTables()).map((t) => String(t).toLowerCase());

  // 1. Create InventoryBalances
  if (!existingTables.includes('inventorybalances')) {
    await queryInterface.createTable('InventoryBalances', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      storeId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      skuId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      sku: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      productId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      onHand: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      reserved: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      available: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      version: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    });

    await queryInterface.addIndex('InventoryBalances', ['storeId', 'skuId'], {
      unique: true,
      name: 'uq_inventory_balance_store_sku',
    }).catch(() => {});
    await queryInterface.addIndex('InventoryBalances', ['skuId']).catch(() => {});
    await queryInterface.addIndex('InventoryBalances', ['productId']).catch(() => {});
    await queryInterface.addIndex('InventoryBalances', ['storeId']).catch(() => {});
  }

  // 2. Create InventoryLedgerEntries
  if (!existingTables.includes('inventoryledgerentries')) {
    await queryInterface.createTable('InventoryLedgerEntries', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      storeId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      skuId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      sku: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      productId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      idempotencyKey: {
        type: DataTypes.STRING(128),
        allowNull: false,
        unique: true,
      },
      changeOnHand: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      changeReserved: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      balanceOnHandAfter: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      balanceReservedAfter: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      balanceAvailableAfter: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      reasonCode: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      sourceType: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      sourceId: {
        type: DataTypes.STRING(128),
        allowNull: false,
      },
      actorType: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      actorId: {
        type: DataTypes.STRING(128),
        allowNull: false,
      },
      correlationId: {
        type: DataTypes.STRING(128),
        allowNull: true,
      },
      monetaryContext: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    });

    await queryInterface.addIndex('InventoryLedgerEntries', ['idempotencyKey'], {
      unique: true,
      name: 'uq_inventory_ledger_idempotency',
    }).catch(() => {});
    await queryInterface.addIndex('InventoryLedgerEntries', ['storeId', 'skuId']).catch(() => {});
    await queryInterface.addIndex('InventoryLedgerEntries', ['skuId', 'createdAt']).catch(() => {});
    await queryInterface.addIndex('InventoryLedgerEntries', ['sourceType', 'sourceId']).catch(() => {});
    await queryInterface.addIndex('InventoryLedgerEntries', ['correlationId']).catch(() => {});
  }

  // 3. Create InventoryReservations
  if (!existingTables.includes('inventoryreservations')) {
    await queryInterface.createTable('InventoryReservations', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      storeId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      skuId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      sku: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      productId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM('active', 'released', 'fulfilled', 'expired'),
        allowNull: false,
        defaultValue: 'active',
      },
      sourceType: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      sourceId: {
        type: DataTypes.STRING(128),
        allowNull: false,
      },
      actorType: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      actorId: {
        type: DataTypes.STRING(128),
        allowNull: false,
      },
      correlationId: {
        type: DataTypes.STRING(128),
        allowNull: true,
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      releasedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      fulfilledAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    });

    await queryInterface.addIndex('InventoryReservations', ['storeId', 'skuId', 'status']).catch(() => {});
    await queryInterface.addIndex('InventoryReservations', ['status', 'expiresAt']).catch(() => {});
    await queryInterface.addIndex('InventoryReservations', ['sourceType', 'sourceId']).catch(() => {});
  }

  // 4. Idempotently Backfill Existing ProductVariants into Auditable Opening Balances
  const [variants] = await sequelize.query(`
    SELECT pv.id, pv.productId, pv.storeId, pv.sku, pv.stockQuantity, p.storeId AS productStoreId
    FROM ProductVariants pv
    LEFT JOIN Products p ON p.id = pv.productId
  `).catch(() => [[]]);

  let backfilledCount = 0;
  for (const variant of variants) {
    const effectiveStoreId = variant.storeId || variant.productStoreId;
    if (!effectiveStoreId) continue;

    const skuId = variant.id;
    const sku = variant.sku || `SKU-${skuId.slice(0, 8)}`;
    const stock = Math.max(0, Number(variant.stockQuantity) || 0);

    const [existingBalances] = await sequelize.query(
      'SELECT id FROM InventoryBalances WHERE storeId = :storeId AND skuId = :skuId LIMIT 1',
      { replacements: { storeId: effectiveStoreId, skuId } }
    ).catch(() => [[]]);

    if (!existingBalances.length) {
      const balanceId = randomUUID();
      const now = new Date();

      await sequelize.query(`
        INSERT INTO InventoryBalances
          (id, storeId, skuId, sku, productId, onHand, reserved, available, version, createdAt, updatedAt)
        VALUES
          (:id, :storeId, :skuId, :sku, :productId, :onHand, :reserved, :available, 1, :createdAt, :updatedAt)
      `, {
        replacements: {
          id: balanceId,
          storeId: effectiveStoreId,
          skuId,
          sku,
          productId: variant.productId,
          onHand: stock,
          reserved: 0,
          available: stock,
          createdAt: now,
          updatedAt: now,
        },
      });

      const ledgerId = randomUUID();
      const idempotencyKey = `opening-balance-${skuId}`;

      await sequelize.query(`
        INSERT INTO InventoryLedgerEntries
          (id, storeId, skuId, sku, productId, idempotencyKey, changeOnHand, changeReserved,
           balanceOnHandAfter, balanceReservedAfter, balanceAvailableAfter, reasonCode,
           sourceType, sourceId, actorType, actorId, correlationId, notes, createdAt, updatedAt)
        VALUES
          (:id, :storeId, :skuId, :sku, :productId, :idempotencyKey, :changeOnHand, :changeReserved,
           :balanceOnHandAfter, :balanceReservedAfter, :balanceAvailableAfter, :reasonCode,
           :sourceType, :sourceId, :actorType, :actorId, :correlationId, :notes, :createdAt, :updatedAt)
      `, {
        replacements: {
          id: ledgerId,
          storeId: effectiveStoreId,
          skuId,
          sku,
          productId: variant.productId,
          idempotencyKey,
          changeOnHand: stock,
          changeReserved: 0,
          balanceOnHandAfter: stock,
          balanceReservedAfter: 0,
          balanceAvailableAfter: stock,
          reasonCode: 'opening_balance',
          sourceType: 'migration_backfill',
          sourceId: 'migration-20261025_017',
          actorType: 'system',
          actorId: 'migration',
          correlationId: `migration-${skuId}`,
          notes: 'P3-INV-001: Initial opening balance backfill from ProductVariant',
          createdAt: now,
          updatedAt: now,
        },
      });

      backfilledCount++;
    }
  }

  if (backfilledCount > 0) {
    console.log(`[P3-INV-001 Migration Backfill] Backfilled ${backfilledCount} SKUs into canonical inventory ledger opening balances.`);
  }
};

exports.down = async (contextOrQueryInterface) => {
  const queryInterface = contextOrQueryInterface.queryInterface || contextOrQueryInterface;
  await queryInterface.dropTable('InventoryReservations').catch(() => {});
  await queryInterface.dropTable('InventoryLedgerEntries').catch(() => {});
  await queryInterface.dropTable('InventoryBalances').catch(() => {});
};
