// controllers/MerchantController.js
// P3-ORD-001: Enforces order and fulfillment state machines, inventory invariants, and tenant ownership.

const { Order, Payment, OrderItem, Product } = require("../../models");
const { sendStatusUpdateEmail } = require("../notifications").emailService;
const retryTransaction = require("../../utils/retryTransaction");
const {
  PAYMENT_METHODS,
  PAYMENT_STATUS,
} = require("../../utils/constants");
const { updateStock } = require("../inventory").stockService;
const {
  ORDER_STATES,
  FULFILLMENT_STATES,
  transitionOrder,
  transitionFulfillment,
  cancelOrder,
  processReturnDecision,
  receiveReturn,
  completeReturn,
} = require("./orderStateMachineService");

// Process Order action dispatcher
exports.processOrder = async (req, res) => {
  const { orderId } = req.params;
  const { action } = req.body;

  if (action === "confirm") return exports.confirmOrder(req, res);
  if (action === "cancel") return exports.cancelOrder(req, res);
  if (action === "complete") return exports.markAsComplete(req, res);

  if (action === "process") {
    try {
      const actor = req.user || { id: req.body?.actorId || 'merchant', role: 'merchant' };
      const idempotencyKey = req.headers['idempotency-key'] || req.body?.idempotencyKey || `process-${orderId}-${Date.now()}`;
      const correlationId = req.headers['x-correlation-id'] || null;

      await transitionOrder(orderId, {
        targetState: ORDER_STATES.PROCESSING,
        actor: {
          id: actor.id,
          role: actor.role || actor.type || 'merchant',
          storeId: req.store?.storeId || actor.storeId,
        },
        idempotencyKey,
        correlationId,
      });

      return res.json({ success: true });
    } catch (error) {
      const status = error.statusCode || 400;
      return res.status(status).json({ error: error.message, code: error.code });
    }
  }

  return res.status(400).json({ error: "Invalid order action" });
};

// Confirm Order
exports.confirmOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { adminNotes } = req.body;
    const actor = req.user || { id: req.body?.actorId || 'merchant', role: 'merchant' };
    const idempotencyKey = req.headers['idempotency-key'] || req.body?.idempotencyKey || `confirm-${orderId}-${Date.now()}`;
    const correlationId = req.headers['x-correlation-id'] || null;

    const result = await retryTransaction(async (t) => {
      const order = await Order.findByPk(orderId, {
        include: [{ model: Payment }, { model: OrderItem, include: [Product] }],
        lock: t.LOCK.UPDATE,
      });

      if (!order) {
        const err = new Error("Order not found");
        err.statusCode = 404;
        throw err;
      }
      if (req.store && order.storeId && order.storeId !== req.store.storeId) {
        const err = new Error("Order not found");
        err.statusCode = 404;
        throw err;
      }

      if (
        order.Payment &&
        order.Payment.paymentMethod !== "COD" &&
        order.Payment.status !== PAYMENT_STATUS.COMPLETED
      ) {
        throw new Error("Payment must be completed before confirming");
      }

      await transitionOrder(orderId, {
        targetState: ORDER_STATES.CONFIRMED,
        actor: {
          id: actor.id,
          role: actor.role || actor.type || 'merchant',
          storeId: req.store?.storeId || actor.storeId,
        },
        reason: adminNotes,
        idempotencyKey,
        correlationId,
        details: { adminNotes },
      }, { transaction: t });

      if (order.Payment?.paymentMethod === PAYMENT_METHODS.COD && !order.stockDeducted) {
        await updateStock(orderId, "deduct", t);
      }

      return await Order.findByPk(orderId, {
        include: [{ model: Payment }, { model: OrderItem }],
        transaction: t,
      });
    });

    await sendStatusUpdateEmail(result, "confirmed").catch(() => {});
    res.json(result);
  } catch (error) {
    const status = error.statusCode || 400;
    res.status(status).json({ error: error.message, code: error.code });
  }
};

// Cancel Order
exports.cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason, adminNotes } = req.body;
    const actor = req.user || { id: req.body?.actorId || 'merchant', role: 'merchant' };
    const idempotencyKey = req.headers['idempotency-key'] || req.body?.idempotencyKey || `cancel-merch-${orderId}-${Date.now()}`;
    const correlationId = req.headers['x-correlation-id'] || null;

    await cancelOrder(orderId, {
      actor: {
        id: actor.id,
        role: actor.role || actor.type || 'merchant',
        storeId: req.store?.storeId || actor.storeId,
      },
      reason: reason || adminNotes || 'Cancelled by merchant',
      idempotencyKey,
      correlationId,
      details: { adminNotes },
    });

    const result = await Order.findByPk(orderId, {
      include: [{ model: Payment }, { model: OrderItem }],
    });

    await sendStatusUpdateEmail(result, "cancelled").catch(() => {});
    res.json(result);
  } catch (error) {
    const status = error.statusCode || 400;
    res.status(status).json({ error: error.message, code: error.code });
  }
};

// Mark as Complete
exports.markAsComplete = async (req, res) => {
  try {
    const { orderId } = req.params;
    const actor = req.user || { id: req.body?.actorId || 'merchant', role: 'merchant' };
    const idempotencyKey = req.headers['idempotency-key'] || req.body?.idempotencyKey || `complete-${orderId}-${Date.now()}`;
    const correlationId = req.headers['x-correlation-id'] || null;

    const result = await retryTransaction(async (t) => {
      const order = await Order.findOne({
        where: { id: orderId },
        include: [{ model: Payment }],
        transaction: t,
      });
      if (!order) {
        const err = new Error("Order not found");
        err.statusCode = 404;
        throw err;
      }
      if (req.store && order.storeId && order.storeId !== req.store.storeId) {
        const err = new Error("Order not found");
        err.statusCode = 404;
        throw err;
      }

      await transitionOrder(orderId, {
        targetState: ORDER_STATES.COMPLETED,
        actor: {
          id: actor.id,
          role: actor.role || actor.type || 'merchant',
          storeId: req.store?.storeId || actor.storeId,
        },
        idempotencyKey,
        correlationId,
      }, { transaction: t });

      await order.update({
        fulfillmentStatus: FULFILLMENT_STATES.DELIVERED,
        deliveryStatus: 'delivered',
        deliveredAt: order.deliveredAt || new Date(),
      }, { transaction: t, byStateMachine: true });

      return await Order.findByPk(orderId, {
        include: [Payment],
        transaction: t,
      });
    });

    res.status(200).json(result);
  } catch (error) {
    const status = error.statusCode || 400;
    res.status(status).json({ error: error.message, code: error.code });
  }
};

// Update Fulfillment State
exports.updateFulfillment = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { targetFulfillment, trackingNumber, reason } = req.body;
    const actor = req.user || { id: req.body?.actorId || 'merchant', role: 'merchant' };
    const idempotencyKey = req.headers['idempotency-key'] || req.body?.idempotencyKey || `fulfill-${orderId}-${targetFulfillment}-${Date.now()}`;
    const correlationId = req.headers['x-correlation-id'] || null;

    const result = await transitionFulfillment(orderId, {
      targetFulfillment,
      actor: {
        id: actor.id,
        role: actor.role || actor.type || 'merchant',
        storeId: req.store?.storeId || actor.storeId,
      },
      trackingNumber,
      reason,
      idempotencyKey,
      correlationId,
    });

    res.json({
      success: true,
      fulfillmentStatus: result.order.fulfillmentStatus,
      deliveryStatus: result.order.deliveryStatus,
      order: result.order,
    });
  } catch (error) {
    const status = error.statusCode || 400;
    res.status(status).json({ error: error.message, code: error.code });
  }
};

// Handle Return Decision (approve / reject)
exports.handleReturnDecision = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { decision, reason } = req.body;
    const actor = req.user || { id: req.body?.actorId || 'merchant', role: 'merchant' };
    const idempotencyKey = req.headers['idempotency-key'] || req.body?.idempotencyKey || `return-dec-${orderId}-${decision}-${Date.now()}`;
    const correlationId = req.headers['x-correlation-id'] || null;

    const result = await processReturnDecision(orderId, {
      decision,
      actor: {
        id: actor.id,
        role: actor.role || actor.type || 'merchant',
        storeId: req.store?.storeId || actor.storeId,
      },
      reason,
      idempotencyKey,
      correlationId,
    });

    res.json({
      success: true,
      returnStatus: result.order.returnStatus,
      order: result.order,
    });
  } catch (error) {
    const status = error.statusCode || 400;
    res.status(status).json({ error: error.message, code: error.code });
  }
};

// Receive Returned Items (physical return receipt and restock)
exports.receiveReturnedItems = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { itemsToRestock, inspectionOutcome, reason, evidence } = req.body || {};
    const actor = req.user || { id: req.body?.actorId || 'merchant', role: 'merchant' };
    const idempotencyKey = req.headers['idempotency-key'] || req.body?.idempotencyKey || `return-rec-${orderId}-${Date.now()}`;
    const correlationId = req.headers['x-correlation-id'] || null;

    const result = await receiveReturn(orderId, {
      actor: {
        id: actor.id,
        role: actor.role || actor.type || 'merchant',
        storeId: req.store?.storeId || actor.storeId,
      },
      itemsToRestock,
      inspectionOutcome,
      reason,
      evidence,
      idempotencyKey,
      correlationId,
    });

    res.json({
      success: true,
      returnStatus: result.order.returnStatus,
      stockRestocked: result.order.stockRestocked,
      order: result.order,
      event: result.event,
    });
  } catch (error) {
    const status = error.statusCode || 400;
    res.status(status).json({ error: error.message, code: error.code });
  }
};

// Complete Return Process
exports.completeReturnProcess = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { refundTransactionId, reason } = req.body;
    const actor = req.user || { id: req.body?.actorId || 'merchant', role: 'merchant' };
    const idempotencyKey = req.headers['idempotency-key'] || req.body?.idempotencyKey || `return-comp-${orderId}-${Date.now()}`;
    const correlationId = req.headers['x-correlation-id'] || null;

    const result = await completeReturn(orderId, {
      actor: {
        id: actor.id,
        role: actor.role || actor.type || 'merchant',
        storeId: req.store?.storeId || actor.storeId,
      },
      refundTransactionId,
      reason,
      idempotencyKey,
      correlationId,
    });

    res.json({
      success: true,
      returnStatus: result.order.returnStatus,
      order: result.order,
    });
  } catch (error) {
    const status = error.statusCode || 400;
    res.status(status).json({ error: error.message, code: error.code });
  }
};
