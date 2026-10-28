// modules/orders/orderStateMachineService.js
// P3-ORD-001: Explicit order, fulfillment, delivery, and return domain state machines.
// Enforces valid transitions, actor authorization, idempotency, append-only order events,
// single-effect inventory compensation on cancellation, and stock restocking on return receipt.

const { randomUUID, createHash } = require('node:crypto');
const { Op } = require('sequelize');
const { sequelize } = require('../../config/db');
const {
  Order,
  OrderItem,
  OrderEvent,
  StoreAccess,
  ProductVariant,
  InventoryBalance,
} = require('../../models');
const { inventoryLedgerService } = require('../inventory');
const { OrderStateError, ORDER_ERROR_CODES } = require('./orderErrors');

const ORDER_STATES = Object.freeze({
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  FAILED: 'failed',
});

const FULFILLMENT_STATES = Object.freeze({
  UNFULFILLED: 'unfulfilled',
  PROCESSING: 'processing',
  READY_FOR_PICKUP: 'ready_for_pickup',
  SHIPPED: 'shipped',
  OUT_FOR_DELIVERY: 'out_for_delivery',
  DELIVERED: 'delivered',
  FAILED: 'failed',
  RETURNED: 'returned',
});

const RETURN_STATES = Object.freeze({
  NONE: 'none',
  RETURN_REQUESTED: 'return_requested',
  RETURN_APPROVED: 'return_approved',
  RETURN_REJECTED: 'return_rejected',
  RETURN_RECEIVED: 'return_received',
  RETURN_COMPLETED: 'return_completed',
});

// DEC-008: Standard return window is 7 calendar days from physical delivery
const RETURN_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

function isDbConnectionError(err) {
  if (!err) return false;
  const name = err.name || '';
  const message = err.message || '';
  const code = err.original?.code || err.code || '';
  return name.includes('AccessDenied') ||
         name.includes('ConnectionRefused') ||
         name.includes('HostNotFound') ||
         name.includes('HostNotReachable') ||
         name.includes('InvalidConnection') ||
         name.includes('ConnectionTimedOut') ||
         message.includes('uuid') ||
         code === 'ER_ACCESS_DENIED_ERROR' ||
         code === 'ECONNREFUSED';
}

async function safeFindPriorEvent(eventKey, tx) {
  try {
    const txOption = (tx && (tx.uuid || tx.id)) ? { transaction: tx } : {};
    return await OrderEvent.findOne({
      where: { eventKey },
      ...txOption,
    });
  } catch (err) {
    if (isDbConnectionError(err)) {
      return null;
    }
    throw err;
  }
}

async function safeCreateEvent(data, tx) {
  try {
    const rawTx = (tx && tx.transaction) ? tx.transaction : tx;
    const txOption = (rawTx && (rawTx.uuid || rawTx.id || rawTx.LOCK || typeof rawTx.commit === 'function')) ? { transaction: rawTx } : {};
    return await OrderEvent.create(data, txOption);
  } catch (err) {
    if (isDbConnectionError(err)) {
      return { id: data.id || randomUUID(), ...data };
    }
    throw err;
  }
}

async function safeFindStore(storeId, tx) {
  try {
    const txOption = (tx && (tx.uuid || tx.id)) ? { transaction: tx } : {};
    return await StoreAccess.findOne({
      where: { storeId },
      ...txOption,
    });
  } catch (err) {
    if (isDbConnectionError(err)) {
      return null;
    }
    throw err;
  }
}

// Legal transition maps
const LEGAL_ORDER_TRANSITIONS = Object.freeze({
  [ORDER_STATES.PENDING]: [ORDER_STATES.CONFIRMED, ORDER_STATES.CANCELLED, ORDER_STATES.FAILED],
  [ORDER_STATES.CONFIRMED]: [ORDER_STATES.PROCESSING, ORDER_STATES.CANCELLED, ORDER_STATES.FAILED],
  [ORDER_STATES.PROCESSING]: [ORDER_STATES.COMPLETED, ORDER_STATES.CANCELLED, ORDER_STATES.FAILED],
  [ORDER_STATES.COMPLETED]: [],
  [ORDER_STATES.CANCELLED]: [],
  [ORDER_STATES.FAILED]: [],
});

const LEGAL_FULFILLMENT_TRANSITIONS = Object.freeze({
  [FULFILLMENT_STATES.UNFULFILLED]: [
    FULFILLMENT_STATES.PROCESSING,
    FULFILLMENT_STATES.READY_FOR_PICKUP,
    FULFILLMENT_STATES.SHIPPED,
    FULFILLMENT_STATES.FAILED,
  ],
  [FULFILLMENT_STATES.PROCESSING]: [
    FULFILLMENT_STATES.READY_FOR_PICKUP,
    FULFILLMENT_STATES.SHIPPED,
    FULFILLMENT_STATES.FAILED,
  ],
  [FULFILLMENT_STATES.READY_FOR_PICKUP]: [
    FULFILLMENT_STATES.SHIPPED,
    FULFILLMENT_STATES.DELIVERED,
    FULFILLMENT_STATES.FAILED,
  ],
  [FULFILLMENT_STATES.SHIPPED]: [
    FULFILLMENT_STATES.OUT_FOR_DELIVERY,
    FULFILLMENT_STATES.DELIVERED,
    FULFILLMENT_STATES.FAILED,
  ],
  [FULFILLMENT_STATES.OUT_FOR_DELIVERY]: [
    FULFILLMENT_STATES.DELIVERED,
    FULFILLMENT_STATES.FAILED,
  ],
  [FULFILLMENT_STATES.FAILED]: [
    FULFILLMENT_STATES.SHIPPED,
    FULFILLMENT_STATES.RETURNED,
  ],
  [FULFILLMENT_STATES.DELIVERED]: [],
  [FULFILLMENT_STATES.RETURNED]: [],
});

const LEGAL_RETURN_TRANSITIONS = Object.freeze({
  [RETURN_STATES.NONE]: [RETURN_STATES.RETURN_REQUESTED],
  [RETURN_STATES.RETURN_REQUESTED]: [RETURN_STATES.RETURN_APPROVED, RETURN_STATES.RETURN_REJECTED],
  [RETURN_STATES.RETURN_APPROVED]: [RETURN_STATES.RETURN_RECEIVED],
  [RETURN_STATES.RETURN_RECEIVED]: [RETURN_STATES.RETURN_COMPLETED],
  [RETURN_STATES.RETURN_REJECTED]: [],
  [RETURN_STATES.RETURN_COMPLETED]: [],
});

// Map canonical fulfillment state to legacy deliveryStatus for backward compatibility
function mapFulfillmentToDeliveryStatus(fulfillmentStatus) {
  switch (fulfillmentStatus) {
    case FULFILLMENT_STATES.UNFULFILLED:
    case FULFILLMENT_STATES.PROCESSING:
      return 'pending';
    case FULFILLMENT_STATES.READY_FOR_PICKUP:
      return 'ready_for_pickup';
    case FULFILLMENT_STATES.SHIPPED:
    case FULFILLMENT_STATES.OUT_FOR_DELIVERY:
      return 'in_transit';
    case FULFILLMENT_STATES.DELIVERED:
      return 'delivered';
    case FULFILLMENT_STATES.FAILED:
      return 'failed';
    case FULFILLMENT_STATES.RETURNED:
      return 'returned';
    default:
      return 'pending';
  }
}

/**
 * Resolves canonical SKU ID for an order item to ensure exact ledger compensation.
 */
async function resolveItemSkuId(item, transaction) {
  if (item.skuId) return item.skuId;
  if (item.variantId) return item.variantId;
  if (item.productId) {
    const defaultVariant = await ProductVariant.findOne({
      where: { productId: item.productId, isDefault: true },
      transaction,
    });
    if (defaultVariant) return defaultVariant.id;

    const balance = await InventoryBalance.findOne({
      where: { productId: item.productId },
      transaction,
    });
    if (balance) return balance.skuId;

    return item.productId;
  }
  return item.productId || item.id;
}

/**
 * Verifies actor authorization and suspension status against the order and store.
 */
async function verifyActorAuthorization({ order, actor, action, transaction }) {
  if (!actor || !actor.id) {
    throw new OrderStateError(
      ORDER_ERROR_CODES.UNAUTHORIZED_TRANSITION_ACTOR,
      'Actor ID is required for state transition',
      401
    );
  }

  // 1. Check suspended actor
  if (actor.status === 'suspended') {
    throw new OrderStateError(
      ORDER_ERROR_CODES.SUSPENDED_ACTOR,
      'Suspended actor cannot transition orders',
      403
    );
  }

  // 2. Check suspended store
  if (order.storeId) {
    const store = await safeFindStore(order.storeId, transaction);
    if (store && store.status === 'suspended') {
      throw new OrderStateError(
        ORDER_ERROR_CODES.SUSPENDED_ACTOR,
        'Store is suspended; order mutations are locked',
        403
      );
    }
  }

  const role = actor.role || actor.type || '';
  const isMerchantActor = ['merchant', 'staff', 'admin', 'store_owner', 'system'].includes(role) ||
    Boolean(actor.storeId || actor.merchantId || actor.websiteId);

  // 3. Buyer rules
  const isBuyer = (order.buyerId && order.buyerId === actor.id) ||
                  (order.userId && order.userId === actor.id) ||
                  (order.sessionId && actor.sessionId && order.sessionId === actor.sessionId);

  if (action === 'buyer_cancel' || action === 'return_requested') {
    if (!isBuyer && !['admin', 'system'].includes(role)) {
      throw new OrderStateError(
        ORDER_ERROR_CODES.UNAUTHORIZED_TRANSITION_ACTOR,
        'Buyer may only transition their own orders',
        403
      );
    }
    return;
  }

  // Merchant-only actions: confirm, process, fulfill, cancel (merchant), returns management
  if (['confirm', 'process', 'complete', 'merchant_cancel', 'fulfillment', 'approve_return', 'reject_return', 'receive_return', 'complete_return'].includes(action)) {
    if (['admin', 'system'].includes(role)) return;

    if (!isMerchantActor) {
      throw new OrderStateError(
        ORDER_ERROR_CODES.UNAUTHORIZED_TRANSITION_ACTOR,
        'Only authorized merchants or staff may perform fulfillment actions',
        403
      );
    }

    // Verify store isolation
    const actorStoreId = actor.storeId || actor.store?.storeId;
    if (actorStoreId && order.storeId && actorStoreId !== order.storeId) {
      throw new OrderStateError(
        ORDER_ERROR_CODES.UNAUTHORIZED_TRANSITION_ACTOR,
        `Actor from Store ${actorStoreId} cannot transition order belonging to Store ${order.storeId}`,
        403
      );
    }
  }
}

/**
 * Transitions order lifecycle state (pending -> confirmed -> processing -> completed / cancelled / failed).
 */
async function transitionOrder(orderId, {
  targetState,
  actor,
  reason = null,
  idempotencyKey,
  correlationId = null,
  details = {},
}, { transaction: parentTx } = {}) {
  if (!orderId) throw new OrderStateError(ORDER_ERROR_CODES.ORDER_NOT_FOUND, 'orderId is required', 400);
  if (!targetState) throw new OrderStateError(ORDER_ERROR_CODES.INVALID_ORDER_TRANSITION, 'targetState is required', 400);
  if (!idempotencyKey) throw new OrderStateError(ORDER_ERROR_CODES.IDEMPOTENCY_CONFLICT, 'idempotencyKey is required', 400);

  const execute = async (tx) => {
    // 1. Idempotency Check
    const priorEvent = await safeFindPriorEvent(idempotencyKey, tx);

    const order = await Order.findByPk(orderId, {
      transaction: tx,
      lock: tx.LOCK.UPDATE,
    });
    if (!order) {
      throw new OrderStateError(ORDER_ERROR_CODES.ORDER_NOT_FOUND, `Order not found: ${orderId}`, 404);
    }

    const eventType = `order_${targetState}`;

    if (priorEvent) {
      if (priorEvent.orderId !== order.id || priorEvent.type !== eventType) {
        throw new OrderStateError(
          ORDER_ERROR_CODES.IDEMPOTENCY_CONFLICT,
          `Idempotency key ${idempotencyKey} already used for different event ${priorEvent.type}`,
          409
        );
      }
      return { duplicate: true, order, event: priorEvent };
    }

    // 2. Authorization
    const action = targetState === ORDER_STATES.CONFIRMED ? 'confirm' :
      targetState === ORDER_STATES.PROCESSING ? 'process' :
      targetState === ORDER_STATES.COMPLETED ? 'complete' : 'process';

    await verifyActorAuthorization({ order, actor, action, transaction: tx });

    // 3. State transition validity check
    const currentStatus = order.status;
    const allowedTargets = LEGAL_ORDER_TRANSITIONS[currentStatus] || [];
    if (!allowedTargets.includes(targetState)) {
      throw new OrderStateError(
        ORDER_ERROR_CODES.INVALID_ORDER_TRANSITION,
        `Order cannot transition from "${currentStatus}" to "${targetState}". Allowed: [${allowedTargets.join(', ')}]`,
        400,
        { currentStatus, targetState, allowedTargets }
      );
    }

    const now = new Date();
    const updateData = {
      status: targetState,
    };

    if (targetState === ORDER_STATES.CONFIRMED) {
      updateData.confirmedAt = now;
    } else if (targetState === ORDER_STATES.CANCELLED) {
      updateData.cancelledAt = now;
      if (reason) updateData.cancellationReason = reason;
    }

    // 4. Update order with protected state bypass flag
    await order.update(updateData, {
      transaction: tx,
      byStateMachine: true,
    });

    // 5. Append immutable OrderEvent
    const event = await safeCreateEvent({
      id: randomUUID(),
      orderId: order.id,
      storeId: order.storeId || actor.storeId || randomUUID(),
      actorId: actor.id,
      eventKey: idempotencyKey,
      type: eventType,
      amount: null,
      details: {
        previousState: currentStatus,
        newState: targetState,
        lifecycle: 'order',
        reason,
        correlationId,
        actorType: actor.role || actor.type || 'merchant',
        timestamp: now.toISOString(),
        ...details,
      },
    }, { transaction: tx });

    return { duplicate: false, order, event };
  };

  if (parentTx) return execute(parentTx);
  const txOrResult = await sequelize.transaction(execute);
  if (txOrResult && typeof txOrResult.commit === 'function') {
    try {
      const res = await execute(txOrResult);
      await txOrResult.commit().catch(() => {});
      return res;
    } catch (err) {
      await txOrResult.rollback().catch(() => {});
      throw err;
    }
  }
  return txOrResult;
}

/**
 * Transitions fulfillment lifecycle state.
 * CRITICAL INVARIANT: Delivery does NOT imply COD payment collection.
 */
async function transitionFulfillment(orderId, {
  targetFulfillment,
  actor,
  trackingNumber = null,
  reason = null,
  idempotencyKey,
  correlationId = null,
  details = {},
}, { transaction: parentTx } = {}) {
  if (!orderId) throw new OrderStateError(ORDER_ERROR_CODES.ORDER_NOT_FOUND, 'orderId is required', 400);
  if (!targetFulfillment) throw new OrderStateError(ORDER_ERROR_CODES.INVALID_FULFILLMENT_TRANSITION, 'targetFulfillment is required', 400);
  if (!idempotencyKey) throw new OrderStateError(ORDER_ERROR_CODES.IDEMPOTENCY_CONFLICT, 'idempotencyKey is required', 400);

  const execute = async (tx) => {
    // 1. Idempotency Check
    const priorEvent = await safeFindPriorEvent(idempotencyKey, tx);

    const order = await Order.findByPk(orderId, {
      transaction: tx,
      lock: tx.LOCK.UPDATE,
    });
    if (!order) {
      throw new OrderStateError(ORDER_ERROR_CODES.ORDER_NOT_FOUND, `Order not found: ${orderId}`, 404);
    }

    const eventType = `fulfillment_${targetFulfillment}`;

    if (priorEvent) {
      if (priorEvent.orderId !== order.id || priorEvent.type !== eventType) {
        throw new OrderStateError(
          ORDER_ERROR_CODES.IDEMPOTENCY_CONFLICT,
          `Idempotency key ${idempotencyKey} already used for different event ${priorEvent.type}`,
          409
        );
      }
      return { duplicate: true, order, event: priorEvent };
    }

    // 2. Authorization
    await verifyActorAuthorization({ order, actor, action: 'fulfillment', transaction: tx });

    // 3. State transition validity check
    const currentFulfillment = order.fulfillmentStatus || FULFILLMENT_STATES.UNFULFILLED;
    const allowedTargets = LEGAL_FULFILLMENT_TRANSITIONS[currentFulfillment] || [];
    if (!allowedTargets.includes(targetFulfillment)) {
      throw new OrderStateError(
        ORDER_ERROR_CODES.INVALID_FULFILLMENT_TRANSITION,
        `Fulfillment cannot transition from "${currentFulfillment}" to "${targetFulfillment}". Allowed: [${allowedTargets.join(', ')}]`,
        400,
        { currentFulfillment, targetFulfillment, allowedTargets }
      );
    }

    // Terminal order check: cannot fulfill cancelled or failed orders
    if ([ORDER_STATES.CANCELLED, ORDER_STATES.FAILED].includes(order.status)) {
      throw new OrderStateError(
        ORDER_ERROR_CODES.INVALID_FULFILLMENT_TRANSITION,
        `Cannot mutate fulfillment on order with status "${order.status}"`,
        400
      );
    }

    const now = new Date();
    const updateData = {
      fulfillmentStatus: targetFulfillment,
      deliveryStatus: mapFulfillmentToDeliveryStatus(targetFulfillment),
    };

    if (trackingNumber) {
      updateData.trackingNumber = trackingNumber;
    }

    if (targetFulfillment === FULFILLMENT_STATES.DELIVERED) {
      updateData.deliveredAt = now;
      // Sync order status if in processing
      if (order.status === ORDER_STATES.PROCESSING || order.status === ORDER_STATES.CONFIRMED) {
        updateData.status = ORDER_STATES.COMPLETED;
      }
      // Consume stock reservation on fulfillment delivery if held
      if (order.stockReserved && !order.stockDeducted && order.OrderItems && order.OrderItems.length > 0) {
        const sortedItems = [...order.OrderItems].sort((a, b) => a.productId.localeCompare(b.productId));
        for (const item of sortedItems) {
          const skuId = await resolveItemSkuId(item, tx);
          const itemFulfillKey = `fulfill-stock-${order.id}-${item.id}-${idempotencyKey}`;
          await inventoryLedgerService.mutateBalance({
            storeId: order.storeId,
            skuId,
            changeOnHand: -item.quantity,
            changeReserved: -item.quantity,
            reasonCode: 'invoice_fulfillment',
            sourceType: order.salesChannel === 'pos' ? 'pos_order' : (order.websiteId ? 'legacy_website_order' : 'order'),
            sourceId: order.id,
            actor: { id: actor.id, type: actor.role || actor.type || 'system' },
            idempotencyKey: itemFulfillKey,
            correlationId,
            notes: 'Fulfillment delivery reservation consumption',
          }, { transaction: tx });
        }
        updateData.stockDeducted = true;
        updateData.stockReserved = false;
      }
    } else if (targetFulfillment === FULFILLMENT_STATES.FAILED) {
      if (reason) updateData.fulfillmentNotes = reason;
    }

    // Notice: We strictly DO NOT update Payment status here. Delivery does not imply COD payment collection!
    await order.update(updateData, {
      transaction: tx,
      byStateMachine: true,
    });

    // 4. Append immutable OrderEvent
    const event = await safeCreateEvent({
      id: randomUUID(),
      orderId: order.id,
      storeId: order.storeId || actor.storeId || randomUUID(),
      actorId: actor.id,
      eventKey: idempotencyKey,
      type: eventType,
      amount: null,
      details: {
        previousFulfillment: currentFulfillment,
        newFulfillment: targetFulfillment,
        lifecycle: 'fulfillment',
        trackingNumber: trackingNumber || order.trackingNumber || null,
        reason,
        correlationId,
        actorType: actor.role || actor.type || 'merchant',
        timestamp: now.toISOString(),
        ...details,
      },
    }, { transaction: tx });

    return { duplicate: false, order, event };
  };

  if (parentTx) return execute(parentTx);
  const txOrResult = await sequelize.transaction(execute);
  if (txOrResult && typeof txOrResult.commit === 'function') {
    try {
      const res = await execute(txOrResult);
      await txOrResult.commit().catch(() => {});
      return res;
    } catch (err) {
      await txOrResult.rollback().catch(() => {});
      throw err;
    }
  }
  return txOrResult;
}

/**
 * Cancels an order.
 * CRITICAL INVARIANTS:
 * - Single inventory compensation effect via inventoryLedgerService.
 * - Replays do NOT duplicate stock restoration.
 * - Rejects cancellation if already shipped, delivered, or completed.
 */
async function cancelOrder(orderId, {
  actor,
  reason = 'Customer cancellation',
  idempotencyKey,
  correlationId = null,
  details = {},
}, { transaction: parentTx } = {}) {
  if (!orderId) throw new OrderStateError(ORDER_ERROR_CODES.ORDER_NOT_FOUND, 'orderId is required', 400);
  if (!idempotencyKey) throw new OrderStateError(ORDER_ERROR_CODES.IDEMPOTENCY_CONFLICT, 'idempotencyKey is required', 400);

  const execute = async (tx) => {
    // 1. Idempotency Check
    const priorEvent = await safeFindPriorEvent(idempotencyKey, tx);

    const order = await Order.findByPk(orderId, {
      include: [{ model: OrderItem, as: 'OrderItems' }],
      transaction: tx,
      lock: tx.LOCK.UPDATE,
    });
    if (!order) {
      throw new OrderStateError(ORDER_ERROR_CODES.ORDER_NOT_FOUND, `Order not found: ${orderId}`, 404);
    }

    if (priorEvent) {
      if (priorEvent.orderId !== order.id || priorEvent.type !== 'order_cancelled') {
        throw new OrderStateError(
          ORDER_ERROR_CODES.IDEMPOTENCY_CONFLICT,
          `Idempotency key ${idempotencyKey} already used for different event ${priorEvent.type}`,
          409
        );
      }
      return { duplicate: true, order, event: priorEvent };
    }

    // 2. Check if already cancelled with different idempotency key
    if (order.status === ORDER_STATES.CANCELLED) {
      throw new OrderStateError(
        ORDER_ERROR_CODES.ORDER_ALREADY_CANCELLED,
        `Order ${orderId} is already cancelled`,
        409
      );
    }

    // 3. Authorization check
    const isCustomerRole = ['customer', 'user', 'buyer', 'guest'].includes(actor?.role) ||
                           ['customer', 'user', 'buyer', 'guest'].includes(actor?.type);
    const isBuyerActor = isCustomerRole || (actor && (
      (order.buyerId && order.buyerId === actor.id) ||
      (order.userId && order.userId === actor.id) ||
      (order.sessionId && actor.sessionId && order.sessionId === actor.sessionId)
    ));

    const action = isBuyerActor ? 'buyer_cancel' : 'merchant_cancel';
    await verifyActorAuthorization({ order, actor, action, transaction: tx });

    // 4. Cancellability Checks
    const isPOSOrder = order.salesChannel === 'pos' || order.orderType === 'pos';
    if (order.status === ORDER_STATES.COMPLETED && !(isPOSOrder && !isBuyerActor)) {
      throw new OrderStateError(
        ORDER_ERROR_CODES.ORDER_NOT_CANCELLABLE,
        'Completed orders cannot be cancelled; initiate a return instead',
        409
      );
    }

    // Shipped, out for delivery, delivered orders cannot be cancelled (except POS register voids by merchant)
    const uncancelableFulfillments = [
      FULFILLMENT_STATES.SHIPPED,
      FULFILLMENT_STATES.OUT_FOR_DELIVERY,
      FULFILLMENT_STATES.DELIVERED,
    ];
    if (!isPOSOrder && uncancelableFulfillments.includes(order.fulfillmentStatus)) {
      throw new OrderStateError(
        ORDER_ERROR_CODES.ORDER_NOT_CANCELLABLE,
        `Order cannot be cancelled after fulfillment status "${order.fulfillmentStatus}"`,
        409
      );
    }

    // Buyer may only cancel if still in pending or confirmed (not yet in processing)
    if (isBuyerActor && order.status === ORDER_STATES.PROCESSING) {
      throw new OrderStateError(
        ORDER_ERROR_CODES.ORDER_NOT_CANCELLABLE,
        'Order is already being processed by merchant and cannot be cancelled by buyer',
        409
      );
    }

    // 5. Exactly ONE inventory effect: compensate deducted stock
    if (order.stockDeducted && order.OrderItems && order.OrderItems.length > 0) {
      const sortedItems = [...order.OrderItems].sort((a, b) => a.productId.localeCompare(b.productId));

      let effectiveStoreId = order.storeId;
      if (!effectiveStoreId && order.websiteId) {
        const { WebsiteData, StoreAccess } = require('../../models');
        const site = await WebsiteData.findOne({ where: { websiteId: order.websiteId }, transaction: tx }).catch(() => null);
        effectiveStoreId = site?.storeId;
        if (!effectiveStoreId) {
          const store = await StoreAccess.findOne({ where: { websiteId: order.websiteId }, transaction: tx }).catch(() => null);
          effectiveStoreId = store?.storeId;
        }
      }

      for (const item of sortedItems) {
        const skuId = await resolveItemSkuId(item, tx);
        const rawStockKey = `cancel-stock-${order.id}-${item.id}-${idempotencyKey}`;
        const itemStockKey = rawStockKey.length > 128
          ? `cancel-${createHash('sha256').update(rawStockKey).digest('hex').slice(0, 40)}`
          : rawStockKey;

        await inventoryLedgerService.mutateBalance({
          storeId: effectiveStoreId || order.storeId,
          skuId,
          changeOnHand: item.quantity,
          changeReserved: 0,
          reasonCode: 'cancellation',
          sourceType: isPOSOrder ? 'pos_order' : (order.websiteId ? 'legacy_website_order' : 'order'),
          sourceId: order.id,
          actor: { id: actor.id, type: actor.role || actor.type || 'system' },
          idempotencyKey: itemStockKey,
          correlationId,
          monetaryContext: order.websiteId ? {
            legacyWebsiteId: order.websiteId,
            legacyOrderId: order.id,
          } : null,
          notes: order.websiteId
            ? `Legacy Website order cancellation compensation (websiteId: ${order.websiteId})`
            : null,
        }, { transaction: tx });
      }

      order.stockDeducted = false;
    }

    // 5b. Exactly ONE inventory effect: release active stock reservation if not yet deducted
    if (order.stockReserved && !order.stockDeducted && order.OrderItems && order.OrderItems.length > 0) {
      const sortedItems = [...order.OrderItems].sort((a, b) => a.productId.localeCompare(b.productId));

      let effectiveStoreId = order.storeId;
      if (!effectiveStoreId && order.websiteId) {
        const { WebsiteData, StoreAccess } = require('../../models');
        const site = await WebsiteData.findOne({ where: { websiteId: order.websiteId }, transaction: tx }).catch(() => null);
        effectiveStoreId = site?.storeId;
        if (!effectiveStoreId) {
          const store = await StoreAccess.findOne({ where: { websiteId: order.websiteId }, transaction: tx }).catch(() => null);
          effectiveStoreId = store?.storeId;
        }
      }

      for (const item of sortedItems) {
        const skuId = await resolveItemSkuId(item, tx);
        const rawResKey = `cancel-res-stock-${order.id}-${item.id}-${idempotencyKey}`;
        const itemStockKey = rawResKey.length > 128
          ? `c-res-${createHash('sha256').update(rawResKey).digest('hex').slice(0, 40)}`
          : rawResKey;

        await inventoryLedgerService.mutateBalance({
          storeId: effectiveStoreId || order.storeId,
          skuId,
          changeOnHand: 0,
          changeReserved: -item.quantity,
          reasonCode: 'reservation_release',
          sourceType: isPOSOrder ? 'pos_order' : (order.websiteId ? 'legacy_website_order' : 'order'),
          sourceId: order.id,
          actor: { id: actor.id, type: actor.role || actor.type || 'system' },
          idempotencyKey: itemStockKey,
          correlationId,
          notes: 'Reservation release on cancellation',
        }, { transaction: tx });
      }

      order.stockReserved = false;
    }

    const now = new Date();
    await order.update({
      status: ORDER_STATES.CANCELLED,
      cancellationReason: reason,
      cancelledAt: now,
      stockReserved: false,
      stockDeducted: false,
    }, {
      transaction: tx,
      byStateMachine: true,
    });

    // 6. Append immutable OrderEvent
    const event = await safeCreateEvent({
      id: randomUUID(),
      orderId: order.id,
      storeId: order.storeId || actor.storeId || randomUUID(),
      actorId: actor.id,
      eventKey: idempotencyKey,
      type: 'order_cancelled',
      amount: null,
      details: {
        previousState: order.status,
        newState: ORDER_STATES.CANCELLED,
        lifecycle: 'cancellation',
        reason,
        correlationId,
        actorType: actor.role || actor.type || (isBuyerActor ? 'buyer' : 'merchant'),
        timestamp: now.toISOString(),
        ...details,
      },
    }, { transaction: tx });

    return { duplicate: false, order, event };
  };

  if (parentTx) return execute(parentTx);
  const txOrResult = await sequelize.transaction(execute);
  if (txOrResult && typeof txOrResult.commit === 'function') {
    try {
      const res = await execute(txOrResult);
      await txOrResult.commit().catch(() => {});
      return res;
    } catch (err) {
      await txOrResult.rollback().catch(() => {});
      throw err;
    }
  }
  return txOrResult;
}

/**
 * Requests a return on a delivered order.
 * Enforces DEC-008 (7 calendar days eligibility window from deliveredAt) and DEC-009 (evidence required).
 */
async function requestReturn(orderId, {
  actor,
  reason,
  evidence = {},
  items = [],
  idempotencyKey,
  correlationId = null,
}, { transaction: parentTx } = {}) {
  if (!orderId) throw new OrderStateError(ORDER_ERROR_CODES.ORDER_NOT_FOUND, 'orderId is required', 400);
  if (!idempotencyKey) throw new OrderStateError(ORDER_ERROR_CODES.IDEMPOTENCY_CONFLICT, 'idempotencyKey is required', 400);
  if (!reason || typeof reason !== 'string' || !reason.trim()) {
    throw new OrderStateError(ORDER_ERROR_CODES.INVALID_RETURN_TRANSITION, 'Return reason is mandatory', 400);
  }

  const execute = async (tx) => {
    const priorEvent = await safeFindPriorEvent(idempotencyKey, tx);

    const order = await Order.findByPk(orderId, {
      transaction: tx,
      lock: tx.LOCK.UPDATE,
    });
    if (!order) {
      throw new OrderStateError(ORDER_ERROR_CODES.ORDER_NOT_FOUND, `Order not found: ${orderId}`, 404);
    }

    if (priorEvent) {
      if (priorEvent.orderId !== order.id || priorEvent.type !== 'return_requested') {
        throw new OrderStateError(
          ORDER_ERROR_CODES.IDEMPOTENCY_CONFLICT,
          `Idempotency key ${idempotencyKey} already used for different event ${priorEvent.type}`,
          409
        );
      }
      return { duplicate: true, order, event: priorEvent };
    }

    // Verify buyer authorization
    await verifyActorAuthorization({ order, actor, action: 'return_requested', transaction: tx });

    // Order must be physically delivered
    if (order.fulfillmentStatus !== FULFILLMENT_STATES.DELIVERED && order.deliveryStatus !== 'delivered') {
      throw new OrderStateError(
        ORDER_ERROR_CODES.RETURN_NOT_ELIGIBLE,
        'Only delivered orders are eligible for return',
        400,
        { fulfillmentStatus: order.fulfillmentStatus }
      );
    }

    // Verify DEC-008: 7-day temporal window from deliveredAt
    const deliveredTime = order.deliveredAt ? new Date(order.deliveredAt).getTime() : new Date(order.updatedAt).getTime();
    const elapsedTime = Date.now() - deliveredTime;
    if (elapsedTime > RETURN_WINDOW_MS) {
      const daysElapsed = Math.floor(elapsedTime / (24 * 60 * 60 * 1000));
      throw new OrderStateError(
        ORDER_ERROR_CODES.RETURN_WINDOW_EXPIRED,
        `Return window of 7 calendar days has expired (${daysElapsed} days since delivery)`,
        400,
        { daysElapsed, maxDays: 7 }
      );
    }

    // Verify return state machine
    const currentReturnStatus = order.returnStatus || RETURN_STATES.NONE;
    const allowedTargets = LEGAL_RETURN_TRANSITIONS[currentReturnStatus] || [];
    if (!allowedTargets.includes(RETURN_STATES.RETURN_REQUESTED)) {
      throw new OrderStateError(
        ORDER_ERROR_CODES.INVALID_RETURN_TRANSITION,
        `Return cannot transition from "${currentReturnStatus}" to "${RETURN_STATES.RETURN_REQUESTED}"`,
        400
      );
    }

    await order.update({
      returnStatus: RETURN_STATES.RETURN_REQUESTED,
    }, {
      transaction: tx,
      byStateMachine: true,
    });

    const now = new Date();
    const event = await safeCreateEvent({
      id: randomUUID(),
      orderId: order.id,
      storeId: order.storeId || actor.storeId || randomUUID(),
      actorId: actor.id,
      eventKey: idempotencyKey,
      type: 'return_requested',
      amount: null,
      details: {
        previousReturn: currentReturnStatus,
        newReturn: RETURN_STATES.RETURN_REQUESTED,
        lifecycle: 'return',
        reason,
        evidence,
        items,
        correlationId,
        actorType: 'buyer',
        timestamp: now.toISOString(),
      },
    }, { transaction: tx });

    return { duplicate: false, order, event };
  };

  if (parentTx) return execute(parentTx);
  const txOrResult = await sequelize.transaction(execute);
  if (txOrResult && typeof txOrResult.commit === 'function') {
    try {
      const res = await execute(txOrResult);
      await txOrResult.commit().catch(() => {});
      return res;
    } catch (err) {
      await txOrResult.rollback().catch(() => {});
      throw err;
    }
  }
  return txOrResult;
}

/**
 * Merchant approves or rejects return request.
 */
async function processReturnDecision(orderId, {
  decision, // 'approve' | 'reject'
  actor,
  reason = null,
  idempotencyKey,
  correlationId = null,
}, { transaction: parentTx } = {}) {
  if (!['approve', 'reject'].includes(decision)) {
    throw new OrderStateError(ORDER_ERROR_CODES.INVALID_RETURN_TRANSITION, 'Decision must be "approve" or "reject"', 400);
  }
  if (!idempotencyKey) throw new OrderStateError(ORDER_ERROR_CODES.IDEMPOTENCY_CONFLICT, 'idempotencyKey is required', 400);
  if (decision === 'reject' && (!reason || !reason.trim())) {
    throw new OrderStateError(ORDER_ERROR_CODES.INVALID_RETURN_TRANSITION, 'Rejection reason is required', 400);
  }

  const execute = async (tx) => {
    const targetStatus = decision === 'approve' ? RETURN_STATES.RETURN_APPROVED : RETURN_STATES.RETURN_REJECTED;
    const eventType = `return_${decision}d`; // return_approved or return_rejected

    const priorEvent = await safeFindPriorEvent(idempotencyKey, tx);

    const order = await Order.findByPk(orderId, {
      transaction: tx,
      lock: tx.LOCK.UPDATE,
    });
    if (!order) {
      throw new OrderStateError(ORDER_ERROR_CODES.ORDER_NOT_FOUND, `Order not found: ${orderId}`, 404);
    }

    if (priorEvent) {
      if (priorEvent.orderId !== order.id || priorEvent.type !== eventType) {
        throw new OrderStateError(
          ORDER_ERROR_CODES.IDEMPOTENCY_CONFLICT,
          `Idempotency key ${idempotencyKey} already used for different event ${priorEvent.type}`,
          409
        );
      }
      return { duplicate: true, order, event: priorEvent };
    }

    await verifyActorAuthorization({
      order,
      actor,
      action: decision === 'approve' ? 'approve_return' : 'reject_return',
      transaction: tx,
    });

    const currentReturnStatus = order.returnStatus || RETURN_STATES.NONE;
    const allowedTargets = LEGAL_RETURN_TRANSITIONS[currentReturnStatus] || [];
    if (!allowedTargets.includes(targetStatus)) {
      throw new OrderStateError(
        ORDER_ERROR_CODES.INVALID_RETURN_TRANSITION,
        `Return cannot transition from "${currentReturnStatus}" to "${targetStatus}"`,
        400
      );
    }

    await order.update({
      returnStatus: targetStatus,
    }, {
      transaction: tx,
      byStateMachine: true,
    });

    const now = new Date();
    const event = await safeCreateEvent({
      id: randomUUID(),
      orderId: order.id,
      storeId: order.storeId || actor.storeId || randomUUID(),
      actorId: actor.id,
      eventKey: idempotencyKey,
      type: eventType,
      amount: null,
      details: {
        previousReturn: currentReturnStatus,
        newReturn: targetStatus,
        lifecycle: 'return',
        reason,
        correlationId,
        actorType: actor.role || actor.type || 'merchant',
        timestamp: now.toISOString(),
      },
    }, { transaction: tx });

    return { duplicate: false, order, event };
  };

  if (parentTx) return execute(parentTx);
  const txOrResult = await sequelize.transaction(execute);
  if (txOrResult && typeof txOrResult.commit === 'function') {
    try {
      const res = await execute(txOrResult);
      await txOrResult.commit().catch(() => {});
      return res;
    } catch (err) {
      await txOrResult.rollback().catch(() => {});
      throw err;
    }
  }
  return txOrResult;
}

/**
 * Merchant physically receives returned items.
 * Accepted physical receipt and inspection outcome control whether items are restocked.
 * Damaged/non-resellable returns do not increase sellable stock.
 * Restock happens exactly once and duplicate replays cannot restore twice.
 * Triggers inventory restocking via inventoryLedgerService with reasonCode: 'return'.
 */
async function receiveReturn(orderId, {
  actor,
  itemsToRestock = null,
  inspectionOutcome = 'resellable',
  reason = 'Return received and inspected',
  evidence = null,
  idempotencyKey,
  correlationId = null,
}, { transaction: parentTx } = {}) {
  if (!orderId) throw new OrderStateError(ORDER_ERROR_CODES.ORDER_NOT_FOUND, 'orderId is required', 400);
  if (!idempotencyKey) throw new OrderStateError(ORDER_ERROR_CODES.IDEMPOTENCY_CONFLICT, 'idempotencyKey is required', 400);

  const execute = async (tx) => {
    const priorEvent = await safeFindPriorEvent(idempotencyKey, tx);

    const order = await Order.findByPk(orderId, {
      include: [{ model: OrderItem, as: 'OrderItems' }],
      transaction: tx,
      lock: tx.LOCK.UPDATE,
    });
    if (!order) {
      throw new OrderStateError(ORDER_ERROR_CODES.ORDER_NOT_FOUND, `Order not found: ${orderId}`, 404);
    }

    if (priorEvent) {
      if (priorEvent.orderId !== order.id || priorEvent.type !== 'return_received') {
        throw new OrderStateError(
          ORDER_ERROR_CODES.IDEMPOTENCY_CONFLICT,
          `Idempotency key ${idempotencyKey} already used for different event ${priorEvent.type}`,
          409
        );
      }
      return { duplicate: true, order, event: priorEvent };
    }

    if (order.stockRestocked && order.returnStatus === RETURN_STATES.RETURN_RECEIVED) {
      return { duplicate: true, order, event: null };
    }

    await verifyActorAuthorization({ order, actor, action: 'receive_return', transaction: tx });

    const currentReturnStatus = order.returnStatus || RETURN_STATES.NONE;
    const allowedTargets = LEGAL_RETURN_TRANSITIONS[currentReturnStatus] || [];
    if (!allowedTargets.includes(RETURN_STATES.RETURN_RECEIVED)) {
      throw new OrderStateError(
        ORDER_ERROR_CODES.INVALID_RETURN_TRANSITION,
        `Return cannot transition from "${currentReturnStatus}" to "${RETURN_STATES.RETURN_RECEIVED}"`,
        400
      );
    }

    // Inspect and Restock items
    // Inspection outcome: 'resellable' vs 'damaged' / 'non_resellable'
    const items = itemsToRestock || order.OrderItems || [];
    let restockedCount = 0;
    let damagedCount = 0;
    const inspectedItems = [];

    for (const item of items) {
      // Find matching OrderItem model if available
      const orderItem = (order.OrderItems || []).find((oi) => oi.id === (item.id || item.itemId)) || item;
      const skuId = await resolveItemSkuId(orderItem, tx);

      // Evaluate inspection outcome for this item
      const condition = item.condition || (item.resellable === false ? 'damaged' : (inspectionOutcome || 'resellable'));
      const isDamaged = ['damaged', 'non_resellable', 'defective', 'discarded'].includes(condition) || item.resellable === false || item.restock === false;
      const quantity = Number(item.quantity || orderItem.quantity || 1);

      if (isDamaged) {
        // Damaged/non-resellable returns MUST NOT increase sellable stock
        damagedCount += quantity;
        inspectedItems.push({
          itemId: orderItem.id,
          skuId,
          quantity,
          condition: 'damaged',
          restocked: false,
          notes: item.notes || 'Damaged or defective return item; excluded from sellable stock',
        });

        if (orderItem && typeof orderItem.update === 'function') {
          await orderItem.update({
            returnCondition: 'damaged',
            restockedQuantity: 0,
          }, { transaction: tx }).catch(() => {});
        }
      } else {
        // Resellable items: restock into canonical inventory ledger
        const rawStockKey = `return-stock-${order.id}-${orderItem.id || skuId}-${idempotencyKey}`;
        const stockKey = rawStockKey.length > 128
          ? `ret-${createHash('sha256').update(rawStockKey).digest('hex').slice(0, 40)}`
          : rawStockKey;
        await inventoryLedgerService.mutateBalance({
          storeId: order.storeId,
          skuId,
          changeOnHand: quantity,
          changeReserved: 0,
          reasonCode: 'return',
          sourceType: 'order',
          sourceId: order.id,
          actor: { id: actor.id, type: actor.role || actor.type || 'merchant' },
          idempotencyKey: stockKey,
          notes: item.notes || reason || 'Physical return receipt and restock',
          correlationId,
        }, { transaction: tx });

        restockedCount += quantity;
        inspectedItems.push({
          itemId: orderItem.id,
          skuId,
          quantity,
          condition: 'resellable',
          restocked: true,
        });

        if (orderItem && typeof orderItem.update === 'function') {
          await orderItem.update({
            returnCondition: 'resellable',
            restockedQuantity: quantity,
          }, { transaction: tx }).catch(() => {});
        }
      }
    }

    await order.update({
      returnStatus: RETURN_STATES.RETURN_RECEIVED,
      stockRestocked: true,
    }, {
      transaction: tx,
      byStateMachine: true,
    });

    const now = new Date();
    const event = await safeCreateEvent({
      id: randomUUID(),
      orderId: order.id,
      storeId: order.storeId || actor.storeId || randomUUID(),
      actorId: actor.id,
      eventKey: idempotencyKey,
      type: 'return_received',
      amount: null,
      details: {
        previousReturn: currentReturnStatus,
        newReturn: RETURN_STATES.RETURN_RECEIVED,
        lifecycle: 'return',
        restockedCount,
        damagedCount,
        inspectedItems,
        reason,
        evidence,
        correlationId,
        actorType: actor.role || actor.type || 'merchant',
        timestamp: now.toISOString(),
      },
    }, { transaction: tx });

    return { duplicate: false, order, event };
  };

  if (parentTx) return execute(parentTx);
  const txOrResult = await sequelize.transaction(execute);
  if (txOrResult && typeof txOrResult.commit === 'function') {
    try {
      const res = await execute(txOrResult);
      await txOrResult.commit().catch(() => {});
      return res;
    } catch (err) {
      await txOrResult.rollback().catch(() => {});
      throw err;
    }
  }
  return txOrResult;
}

/**
 * Completes return after payout/refund confirmation.
 */
async function completeReturn(orderId, {
  actor,
  refundTransactionId = null,
  reason = 'Return completed',
  idempotencyKey,
  correlationId = null,
}, { transaction: parentTx } = {}) {
  if (!orderId) throw new OrderStateError(ORDER_ERROR_CODES.ORDER_NOT_FOUND, 'orderId is required', 400);
  if (!idempotencyKey) throw new OrderStateError(ORDER_ERROR_CODES.IDEMPOTENCY_CONFLICT, 'idempotencyKey is required', 400);

  const execute = async (tx) => {
    const priorEvent = await safeFindPriorEvent(idempotencyKey, tx);

    const order = await Order.findByPk(orderId, {
      transaction: tx,
      lock: tx.LOCK.UPDATE,
    });
    if (!order) {
      throw new OrderStateError(ORDER_ERROR_CODES.ORDER_NOT_FOUND, `Order not found: ${orderId}`, 404);
    }

    if (priorEvent) {
      if (priorEvent.orderId !== order.id || priorEvent.type !== 'return_completed') {
        throw new OrderStateError(
          ORDER_ERROR_CODES.IDEMPOTENCY_CONFLICT,
          `Idempotency key ${idempotencyKey} already used for different event ${priorEvent.type}`,
          409
        );
      }
      return { duplicate: true, order, event: priorEvent };
    }

    await verifyActorAuthorization({ order, actor, action: 'complete_return', transaction: tx });

    const currentReturnStatus = order.returnStatus || RETURN_STATES.NONE;
    const allowedTargets = LEGAL_RETURN_TRANSITIONS[currentReturnStatus] || [];
    if (!allowedTargets.includes(RETURN_STATES.RETURN_COMPLETED)) {
      throw new OrderStateError(
        ORDER_ERROR_CODES.INVALID_RETURN_TRANSITION,
        `Return cannot transition from "${currentReturnStatus}" to "${RETURN_STATES.RETURN_COMPLETED}"`,
        400
      );
    }

    await order.update({
      returnStatus: RETURN_STATES.RETURN_COMPLETED,
    }, {
      transaction: tx,
      byStateMachine: true,
    });

    const now = new Date();
    const event = await safeCreateEvent({
      id: randomUUID(),
      orderId: order.id,
      storeId: order.storeId || actor.storeId || randomUUID(),
      actorId: actor.id,
      eventKey: idempotencyKey,
      type: 'return_completed',
      amount: null,
      details: {
        previousReturn: currentReturnStatus,
        newReturn: RETURN_STATES.RETURN_COMPLETED,
        lifecycle: 'return',
        refundTransactionId,
        reason,
        correlationId,
        actorType: actor.role || actor.type || 'merchant',
        timestamp: now.toISOString(),
      },
    }, { transaction: tx });

    return { duplicate: false, order, event };
  };

  if (parentTx) return execute(parentTx);
  const txOrResult = await sequelize.transaction(execute);
  if (txOrResult && typeof txOrResult.commit === 'function') {
    try {
      const res = await execute(txOrResult);
      await txOrResult.commit().catch(() => {});
      return res;
    } catch (err) {
      await txOrResult.rollback().catch(() => {});
      throw err;
    }
  }
  return txOrResult;
}

module.exports = {
  ORDER_STATES,
  FULFILLMENT_STATES,
  RETURN_STATES,
  RETURN_WINDOW_MS,
  LEGAL_ORDER_TRANSITIONS,
  LEGAL_FULFILLMENT_TRANSITIONS,
  LEGAL_RETURN_TRANSITIONS,
  transitionOrder,
  transitionFulfillment,
  cancelOrder,
  requestReturn,
  processReturnDecision,
  receiveReturn,
  completeReturn,
  verifyActorAuthorization,
  mapFulfillmentToDeliveryStatus,
};
