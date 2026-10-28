// modules/inventory/inventoryLedgerService.js
// P3-INV-001: Canonical Inventory Ledger Domain Service
// Enforces SKU-level balances, reservation invariants, append-only ledger entries, and idempotent mutations.

const { randomUUID } = require('node:crypto');
const { Op } = require('sequelize');
const { sequelize } = require('../../config/db');
const {
  InventoryBalance,
  InventoryLedgerEntry,
  InventoryReservation,
  Product,
  ProductVariant,
} = require('../../models');
const { logger, getCorrelationId } = require('../../utils/logger');
const {
  InventoryError,
  InsufficientStockError,
  InvalidInventoryStateError,
  InventoryStoreMismatchError,
} = require('./inventoryErrors');

const ALLOWED_REASON_CODES = Object.freeze([
  'opening_balance',
  'sale',
  'cancellation',
  'return',
  'restock',
  'manual_adjustment',
  'pos_sale',
  'invoice_fulfillment',
  'reservation',
  'reservation_release',
  'reservation_expiry',
  'migration_backfill',
]);

const ALLOWED_REASON_SET = new Set(ALLOWED_REASON_CODES);

/**
 * Validates mutation parameters and attributes.
 */
function validateMutationParams({
  storeId,
  skuId,
  reasonCode,
  sourceType,
  sourceId,
  actor,
  idempotencyKey,
  changeOnHand = 0,
  changeReserved = 0,
}) {
  if (!storeId) throw new InventoryError('storeId is required for inventory mutation');
  if (!skuId) throw new InventoryError('skuId is required for inventory mutation');
  if (!idempotencyKey || typeof idempotencyKey !== 'string') {
    throw new InventoryError('idempotencyKey is required and must be a string');
  }
  if (!ALLOWED_REASON_SET.has(reasonCode)) {
    throw new InventoryError(`Invalid reasonCode: "${reasonCode}". Allowed: ${ALLOWED_REASON_CODES.join(', ')}`);
  }
  if (!sourceType || !sourceId) {
    throw new InventoryError('Every inventory mutation must link to its source (sourceType and sourceId)');
  }
  if (!actor || (!actor.id && !actor.actorId)) {
    throw new InventoryError('Every inventory mutation must be attributed to an actor (actor.id or actor.actorId)');
  }
  if (!Number.isSafeInteger(changeOnHand) || !Number.isSafeInteger(changeReserved)) {
    throw new InventoryError('changeOnHand and changeReserved must be safe integers');
  }
}

/**
 * Executes an authoritative mutation against an SKU inventory balance.
 * Appends an immutable ledger entry and maintains all balance invariants.
 */
async function mutateBalance({
  storeId,
  skuId,
  changeOnHand = 0,
  changeReserved = 0,
  reasonCode,
  sourceType,
  sourceId,
  actor,
  idempotencyKey,
  monetaryContext = null,
  notes = null,
  correlationId = null,
}, { transaction = null } = {}) {
  validateMutationParams({
    storeId,
    skuId,
    reasonCode,
    sourceType,
    sourceId,
    actor,
    idempotencyKey,
    changeOnHand,
    changeReserved,
  });

  const effectiveCorrelationId = correlationId || getCorrelationId() || randomUUID();
  const actorId = String(actor.id || actor.actorId || actor.userId || 'system');
  const actorType = String(actor.type || actor.actorType || 'user');

  const execute = async (tx) => {
    // 1. Idempotency Check: Replay cannot apply twice
    const existingEntry = await InventoryLedgerEntry.findOne({
      where: { idempotencyKey },
      transaction: tx,
    });

    if (existingEntry) {
      const currentBalance = await InventoryBalance.findOne({
        where: { storeId, skuId },
        transaction: tx,
      });

      logger.info(`[Inventory Idempotent Hit] Replay detected for key ${idempotencyKey}. Skipping mutation.`, {
        storeId,
        skuId,
        idempotencyKey,
        correlationId: effectiveCorrelationId,
      });

      return {
        duplicate: true,
        idempotent: true,
        ledgerEntry: existingEntry,
        balance: currentBalance,
      };
    }

    // 2. Lock and fetch current balance row
    let balance = await InventoryBalance.findOne({
      where: { storeId, skuId },
      transaction: tx,
      lock: tx.LOCK.UPDATE,
    });

    let product = null;
    let variant = null;

    if (!balance) {
      // Balance record doesn't exist yet; verify variant ownership
      variant = await ProductVariant.findByPk(skuId, { transaction: tx });
      if (!variant) {
        variant = await ProductVariant.findOne({ where: { productId: skuId, isDefault: true }, transaction: tx }) ||
                  await ProductVariant.findOne({ where: { productId: skuId }, transaction: tx });
      }

      if (variant) {
        product = await Product.findByPk(variant.productId, { transaction: tx });
      } else {
        product = await Product.findByPk(skuId, { transaction: tx });
      }

      if (!variant && !product) {
        throw new InventoryError(`ProductVariant (SKU) not found: ${skuId}`);
      }

      const effectiveStoreId = variant?.storeId || product?.storeId;

      if (effectiveStoreId !== storeId) {
        throw new InventoryStoreMismatchError(`SKU ${skuId} belongs to Store ${effectiveStoreId}, not ${storeId}`);
      }

      // Initial creation only allowed for opening balance, migration backfill, or initial restock
      if (!['opening_balance', 'migration_backfill', 'restock'].includes(reasonCode)) {
        throw new InventoryError(`Cannot mutate non-existent balance for SKU ${skuId} with reason "${reasonCode}"`);
      }

      const effectiveSku = variant?.sku || product?.sku || `SKU-${skuId.slice(0, 8)}`;
      const effectiveProductId = variant ? variant.productId : product.id;

      balance = await InventoryBalance.create({
        id: randomUUID(),
        storeId,
        skuId,
        sku: effectiveSku,
        productId: effectiveProductId,
        onHand: 0,
        reserved: 0,
        available: 0,
        version: 1,
      }, { transaction: tx });
    } else {
      // Verify store ownership
      if (balance.storeId !== storeId) {
        throw new InventoryStoreMismatchError(`Balance record for SKU ${skuId} belongs to Store ${balance.storeId}, not ${storeId}`);
      }
    }

    // 3. Invariant Checks
    const newOnHand = balance.onHand + changeOnHand;
    const newReserved = balance.reserved + changeReserved;
    const newAvailable = newOnHand - newReserved;

    // Invariant 1: Balance cannot become negative
    if (newOnHand < 0) {
      throw new InsufficientStockError(
        `Insufficient stock on hand for SKU "${balance.sku}": requested change ${changeOnHand}, available on hand was ${balance.onHand}`
      );
    }

    // Invariant 2: Reserved quantity cannot be negative
    if (newReserved < 0) {
      throw new InvalidInventoryStateError(
        `Reserved quantity cannot become negative for SKU "${balance.sku}": current reserved ${balance.reserved}, change ${changeReserved}`
      );
    }

    // Invariant 3: Reserved quantity cannot exceed on-hand balance (available >= 0)
    if (newReserved > newOnHand || newAvailable < 0) {
      throw new InsufficientStockError(
        `Reserved quantity (${newReserved}) cannot exceed on-hand stock (${newOnHand}) for SKU "${balance.sku}". Available: ${newAvailable}`
      );
    }

    // 4. Create Append-Only Ledger Entry
    const ledgerEntry = await InventoryLedgerEntry.create({
      id: randomUUID(),
      storeId,
      skuId,
      sku: balance.sku,
      productId: balance.productId,
      idempotencyKey,
      changeOnHand,
      changeReserved,
      balanceOnHandAfter: newOnHand,
      balanceReservedAfter: newReserved,
      balanceAvailableAfter: newAvailable,
      reasonCode,
      sourceType,
      sourceId,
      actorType,
      actorId,
      correlationId: effectiveCorrelationId,
      monetaryContext,
      notes,
    }, { transaction: tx });

    // 5. Update Balance with Optimistic Concurrency Version Increment
    await balance.update({
      onHand: newOnHand,
      reserved: newReserved,
      available: newAvailable,
      version: balance.version + 1,
    }, { transaction: tx });

    // 6. Compatibility Projections: maintain legacy stockQuantity fields
    try {
      if (!variant) {
        variant = await ProductVariant.findByPk(skuId, { transaction: tx }).catch(() => null);
      }

      if (variant) {
        const nextStatus = newOnHand === 0 && variant.status === 'active'
          ? 'out_of_stock'
          : (newOnHand > 0 && variant.status === 'out_of_stock' ? 'active' : variant.status);

        await ProductVariant.update({
          stockQuantity: newOnHand,
          status: nextStatus,
        }, {
          where: { id: skuId },
          transaction: tx,
        });

        if (variant.isDefault) {
          await Product.update({
            stockQuantity: newOnHand,
            status: nextStatus,
          }, {
            where: { id: balance.productId },
            transaction: tx,
          });
        }
      } else if (balance.productId) {
        const productRec = await Product.findByPk(balance.productId, { transaction: tx, attributes: ['id', 'status'] });
        if (productRec) {
          const nextStatus = newOnHand === 0 && productRec.status === 'active'
            ? 'out_of_stock'
            : (newOnHand > 0 && productRec.status === 'out_of_stock' ? 'active' : productRec.status);
          await Product.update({
            stockQuantity: newOnHand,
            status: nextStatus,
          }, {
            where: { id: balance.productId },
            transaction: tx,
          });
        }
      }
    } catch (projectionErr) {
      logger.warn(`Failed to update compatibility stock projection for SKU ${skuId}: ${projectionErr.message}`, {
        storeId,
        skuId,
        error: projectionErr.message,
      });
    }

    logger.info(`[Inventory Mutated] SKU ${balance.sku} (${skuId}) ${reasonCode}: onHand=${newOnHand}, reserved=${newReserved}, available=${newAvailable}`, {
      storeId,
      skuId,
      reasonCode,
      changeOnHand,
      changeReserved,
      correlationId: effectiveCorrelationId,
    });

    return {
      duplicate: false,
      idempotent: false,
      ledgerEntry,
      balance,
    };
  };

  if (transaction) {
    return execute(transaction);
  }
  return sequelize.transaction(execute);
}

/**
 * Creates an inventory reservation (locks stock temporarily for checkout/cart).
 */
async function createReservation({
  storeId,
  skuId,
  quantity,
  sourceType,
  sourceId,
  actor,
  idempotencyKey,
  ttlMinutes = 30,
  correlationId = null,
}, { transaction = null } = {}) {
  if (!Number.isSafeInteger(quantity) || quantity <= 0) {
    throw new InventoryError('Reservation quantity must be a positive integer');
  }

  const execute = async (tx) => {
    // 1. Mutate balance (changeReserved +quantity)
    const mutation = await mutateBalance({
      storeId,
      skuId,
      changeOnHand: 0,
      changeReserved: quantity,
      reasonCode: 'reservation',
      sourceType,
      sourceId,
      actor,
      idempotencyKey,
      correlationId,
    }, { transaction: tx });

    if (mutation.duplicate) {
      const existingRes = await InventoryReservation.findOne({
        where: { storeId, skuId, sourceType, sourceId },
        transaction: tx,
      });
      return {
        duplicate: true,
        reservation: existingRes,
        balance: mutation.balance,
      };
    }

    // 2. Create Reservation record
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
    const reservation = await InventoryReservation.create({
      id: randomUUID(),
      storeId,
      skuId,
      sku: mutation.balance.sku,
      productId: mutation.balance.productId,
      quantity,
      status: 'active',
      sourceType,
      sourceId,
      actorType: String(actor.type || actor.actorType || 'user'),
      actorId: String(actor.id || actor.actorId || actor.userId || 'system'),
      correlationId: correlationId || getCorrelationId(),
      expiresAt,
    }, { transaction: tx });

    return {
      duplicate: false,
      reservation,
      balance: mutation.balance,
    };
  };

  if (transaction) return execute(transaction);
  return sequelize.transaction(execute);
}

/**
 * Releases a stock reservation back to available inventory.
 */
async function releaseReservation({
  reservationId,
  storeId = null,
  actor,
  reasonCode = 'reservation_release',
  idempotencyKey,
  correlationId = null,
}, { transaction = null } = {}) {
  const execute = async (tx) => {
    const reservation = await InventoryReservation.findByPk(reservationId, {
      transaction: tx,
      lock: tx.LOCK.UPDATE,
    });

    if (!reservation) {
      throw new InventoryError(`Reservation not found: ${reservationId}`);
    }

    if (storeId && reservation.storeId !== storeId) {
      throw new InventoryStoreMismatchError(`Reservation belongs to Store ${reservation.storeId}, not ${storeId}`);
    }

    // If already released, expired, or fulfilled, release is a no-op (idempotent)
    if (reservation.status !== 'active') {
      const currentBalance = await InventoryBalance.findOne({
        where: { storeId: reservation.storeId, skuId: reservation.skuId },
        transaction: tx,
      });
      return {
        alreadyReleased: true,
        reservation,
        balance: currentBalance,
      };
    }

    const effectiveIdempotencyKey = idempotencyKey || `release-${reservationId}`;

    // Release reservation from balance (changeReserved -quantity)
    const mutation = await mutateBalance({
      storeId: reservation.storeId,
      skuId: reservation.skuId,
      changeOnHand: 0,
      changeReserved: -reservation.quantity,
      reasonCode,
      sourceType: reservation.sourceType,
      sourceId: reservation.sourceId,
      actor,
      idempotencyKey: effectiveIdempotencyKey,
      correlationId,
    }, { transaction: tx });

    await reservation.update({
      status: reasonCode === 'reservation_expiry' ? 'expired' : 'released',
      releasedAt: new Date(),
    }, { transaction: tx });

    return {
      released: true,
      reservation,
      balance: mutation.balance,
    };
  };

  if (transaction) return execute(transaction);
  return sequelize.transaction(execute);
}

/**
 * Fulfills an active reservation upon successful sale/payment.
 * Deducts onHand and reserved concurrently by the reserved quantity.
 */
async function fulfillReservation({
  reservationId,
  storeId = null,
  actor,
  sourceId,
  reasonCode = 'sale',
  idempotencyKey,
  monetaryContext = null,
  correlationId = null,
}, { transaction = null } = {}) {
  const execute = async (tx) => {
    const reservation = await InventoryReservation.findByPk(reservationId, {
      transaction: tx,
      lock: tx.LOCK.UPDATE,
    });

    if (!reservation) {
      throw new InventoryError(`Reservation not found: ${reservationId}`);
    }

    if (storeId && reservation.storeId !== storeId) {
      throw new InventoryStoreMismatchError(`Reservation belongs to Store ${reservation.storeId}, not ${storeId}`);
    }

    if (reservation.status === 'fulfilled') {
      const currentBalance = await InventoryBalance.findOne({
        where: { storeId: reservation.storeId, skuId: reservation.skuId },
        transaction: tx,
      });
      return {
        alreadyFulfilled: true,
        reservation,
        balance: currentBalance,
      };
    }

    if (reservation.status !== 'active') {
      throw new InvalidInventoryStateError(`Cannot fulfill reservation with status: ${reservation.status}`);
    }

    const effectiveIdempotencyKey = idempotencyKey || `fulfill-${reservationId}`;

    // Deducts both onHand and reserved; available remains unchanged
    const mutation = await mutateBalance({
      storeId: reservation.storeId,
      skuId: reservation.skuId,
      changeOnHand: -reservation.quantity,
      changeReserved: -reservation.quantity,
      reasonCode,
      sourceType: 'order',
      sourceId: sourceId || reservation.sourceId,
      actor,
      idempotencyKey: effectiveIdempotencyKey,
      monetaryContext,
      correlationId,
    }, { transaction: tx });

    await reservation.update({
      status: 'fulfilled',
      fulfilledAt: new Date(),
    }, { transaction: tx });

    return {
      fulfilled: true,
      reservation,
      balance: mutation.balance,
    };
  };

  if (transaction) return execute(transaction);
  return sequelize.transaction(execute);
}

/**
 * Finds and expires stale active reservations past their TTL.
 */
async function expireStaleReservations({ limit = 50, actor = { id: 'system', type: 'system' } } = {}) {
  const now = new Date();
  const stale = await InventoryReservation.findAll({
    where: {
      status: 'active',
      expiresAt: { [Op.lte]: now },
    },
    limit,
    order: [['expiresAt', 'ASC']],
  });

  const results = [];
  for (const res of stale) {
    try {
      const out = await releaseReservation({
        reservationId: res.id,
        actor,
        reasonCode: 'reservation_expiry',
        idempotencyKey: `auto-expire-${res.id}`,
      });
      results.push({ id: res.id, expired: true, ...out });
    } catch (err) {
      logger.error(`Failed to expire reservation ${res.id}: ${err.message}`);
      results.push({ id: res.id, expired: false, error: err.message });
    }
  }
  return results;
}

/**
 * Ensures an InventoryBalance record exists for the given storeId and skuId.
 * If not present, initializes it with reasonCode 'opening_balance' using current variant/product stock.
 */
async function ensureBalance({ storeId, skuId, variant = null, product = null }, { transaction = null } = {}) {
  if (!storeId || !skuId) throw new InventoryError('storeId and skuId are required');

  const execute = async (tx) => {
    let balance = await InventoryBalance.findOne({
      where: { storeId, skuId },
      transaction: tx,
      lock: tx.LOCK.UPDATE,
    });

    if (balance) return balance;

    // Fetch variant if not provided
    let effectiveVariant = variant;
    if (!effectiveVariant) {
      effectiveVariant = await ProductVariant.findByPk(skuId, { transaction: tx });
    }

    if (!effectiveVariant) {
      // If skuId might be productId for simple legacy product without variant
      const defaultVariant = await ProductVariant.findOne({
        where: { productId: skuId, isDefault: true },
        transaction: tx,
      }) || await ProductVariant.findOne({
        where: { productId: skuId },
        transaction: tx,
      });
      if (defaultVariant) {
        effectiveVariant = defaultVariant;
      }
    }

    let effectiveProduct = product;
    if (!effectiveProduct) {
      effectiveProduct = await Product.findByPk(effectiveVariant ? effectiveVariant.productId : skuId, { transaction: tx });
    }

    if (!effectiveVariant && !effectiveProduct) {
      throw new InventoryError(`ProductVariant (SKU) not found: ${skuId}`);
    }

    const effectiveStoreId = effectiveVariant?.storeId || effectiveProduct?.storeId;
    if (effectiveStoreId !== storeId) {
      throw new InventoryStoreMismatchError(`SKU ${skuId} belongs to Store ${effectiveStoreId}, not ${storeId}`);
    }

    const initialStock = Number.isInteger(effectiveVariant?.stockQuantity)
      ? effectiveVariant.stockQuantity
      : (Number.isInteger(effectiveProduct?.stockQuantity) ? effectiveProduct.stockQuantity : 0);

    const mutation = await mutateBalance({
      storeId,
      skuId,
      changeOnHand: initialStock,
      changeReserved: 0,
      reasonCode: 'opening_balance',
      sourceType: effectiveVariant ? 'product_variant' : 'product',
      sourceId: effectiveVariant ? effectiveVariant.id : effectiveProduct.id,
      actor: { id: storeId, type: 'system' },
      idempotencyKey: `init-balance-${storeId}-${skuId}`,
      notes: 'Initial opening balance',
    }, { transaction: tx });

    return mutation.balance;
  };

  if (transaction) return execute(transaction);
  return sequelize.transaction(execute);
}

/**
 * Appends a compensating manual adjustment or restock entry.
 */
async function adjustBalance({
  storeId,
  skuId,
  delta,
  reasonCode = 'manual_adjustment',
  sourceType = 'manual',
  sourceId = randomUUID(),
  actor,
  idempotencyKey,
  notes = null,
  monetaryContext = null,
  correlationId = null,
}, { transaction = null } = {}) {
  if (!Number.isSafeInteger(delta) || delta === 0) {
    throw new InventoryError('delta must be a non-zero safe integer');
  }

  return mutateBalance({
    storeId,
    skuId,
    changeOnHand: delta,
    changeReserved: 0,
    reasonCode,
    sourceType,
    sourceId,
    actor,
    idempotencyKey,
    notes,
    monetaryContext,
    correlationId,
  }, { transaction });
}

/**
 * Fetches current inventory balance for an SKU.
 */
async function getBalance({ storeId, skuId }) {
  if (!storeId || !skuId) throw new InventoryError('storeId and skuId are required');
  return InventoryBalance.findOne({ where: { storeId, skuId } });
}

/**
 * Reconstructs the expected balance by summing all ledger entries for an SKU.
 * Proves the mathematical invariant between append-only ledger and balance snapshot.
 */
async function reconstructBalance({ storeId, skuId }) {
  if (!storeId || !skuId) throw new InventoryError('storeId and skuId are required');

  const balance = await InventoryBalance.findOne({ where: { storeId, skuId } });
  const entries = await InventoryLedgerEntry.findAll({
    where: { storeId, skuId },
    order: [['createdAt', 'ASC']],
  });

  let calculatedOnHand = 0;
  let calculatedReserved = 0;

  for (const entry of entries) {
    calculatedOnHand += entry.changeOnHand;
    calculatedReserved += entry.changeReserved;
  }

  const calculatedAvailable = calculatedOnHand - calculatedReserved;

  const actualOnHand = balance ? balance.onHand : 0;
  const actualReserved = balance ? balance.reserved : 0;
  const actualAvailable = balance ? balance.available : 0;

  const match = (
    actualOnHand === calculatedOnHand &&
    actualReserved === calculatedReserved &&
    actualAvailable === calculatedAvailable
  );

  return {
    match,
    skuId,
    storeId,
    entriesCount: entries.length,
    calculated: {
      onHand: calculatedOnHand,
      reserved: calculatedReserved,
      available: calculatedAvailable,
    },
    actual: {
      onHand: actualOnHand,
      reserved: actualReserved,
      available: actualAvailable,
    },
  };
}

module.exports = {
  ALLOWED_REASON_CODES,
  mutateBalance,
  createReservation,
  releaseReservation,
  fulfillReservation,
  expireStaleReservations,
  adjustBalance,
  ensureBalance,
  getBalance,
  reconstructBalance,
};
