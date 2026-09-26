// controllers/MerchantController.js
const { Order, Payment, OrderItem, Product } = require("../../models");
const { sendStatusUpdateEmail } = require("../notifications/emailService");
const retryTransaction = require("../../utils/retryTransaction");
const {
  PAYMENT_METHODS,
  ORDER_STATUS,
  PAYMENT_STATUS,
} = require("../../utils/constants");
const { updateStock } = require("../inventory/stockService");

exports.processOrder = async (req, res) => {
  const { orderId } = req.params;
  const { action } = req.body;
  const statusMap = {
    confirm: ORDER_STATUS.CONFIRMED,
    complete: ORDER_STATUS.COMPLETED,
    cancel: ORDER_STATUS.CANCELLED,
  };

  try {
    await retryTransaction(async (t) => {
      const order = await Order.findByPk(orderId, {
        include: [Payment, OrderItem],
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!order) throw new Error("Order not found");
      if (!statusMap[action]) throw new Error("Invalid order action");
      const allowed = {
        confirm: [ORDER_STATUS.PENDING],
        complete: [ORDER_STATUS.CONFIRMED, ORDER_STATUS.PROCESSING],
        cancel: [ORDER_STATUS.PENDING, ORDER_STATUS.CONFIRMED, ORDER_STATUS.PROCESSING],
      };
      if (!allowed[action].includes(order.status)) {
        throw new Error(`Order cannot transition from ${order.status} using ${action}`);
      }

      if (
        action === "confirm" &&
        order.Payment?.paymentMethod === PAYMENT_METHODS.COD
      ) {
        await updateStock(orderId, "deduct", t);
      }

      if (action === "complete" && !order.stockDeducted) {
        await updateStock(orderId, "deduct", t);
      }

      if (action === "cancel" && order.stockDeducted) {
        await updateStock(orderId, "restore", t);
      }

      await order.update({ status: statusMap[action] }, { transaction: t });
      if (
        action === "complete" &&
        order.Payment?.status === PAYMENT_STATUS.PENDING
      ) {
        const [paymentUpdateCount] = await Payment.update(
          {
            status: PAYMENT_STATUS.COMPLETED,
            paidAt: new Date(),
            version: order.Payment.version + 1,
          },
          {
            where: {
              id: order.Payment.id,
              version: order.Payment.version,
            },
            transaction: t,
          }
        );

        if (paymentUpdateCount === 0) {
          throw new Error("Payment version conflict");
        }
      }
    });

    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Confirm Order
exports.confirmOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { adminNotes } = req.body;

    const result = await retryTransaction(async (t) => {
      const order = await Order.findByPk(orderId, {
        include: [{ model: Payment }, { model: OrderItem, include: [Product] }],
        lock: t.LOCK.UPDATE,
      });

      if (!order) throw new Error("Order not found");
      if (order.status !== "pending") {
        throw new Error(
          `Order cannot be confirmed from ${order.status} status`
        );
      }

      if (
        order.Payment.paymentMethod !== "COD" &&
        order.Payment.status !== PAYMENT_STATUS.COMPLETED
      ) {
        throw new Error("Payment must be completed before confirming");
      }

      // Confirm the order
      const [updateCount] = await Order.update(
        { status: "confirmed", adminNotes, confirmedAt: new Date() },
        {
          where: { id: orderId, version: order.version },
          transaction: t,
        }
      );
      if (updateCount === 0) throw new Error("Order version conflict");

      if (order.Payment?.paymentMethod === PAYMENT_METHODS.COD && !order.stockDeducted) {
        await updateStock(orderId, "deduct", t);
      }

      return await Order.findByPk(orderId, { transaction: t });
    });

    await sendStatusUpdateEmail(result, "confirmed");
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Cancel Order
exports.cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason, adminNotes } = req.body;

    const result = await retryTransaction(async (t) => {
      const order = await Order.findByPk(orderId, {
        include: [{ model: Payment }, { model: OrderItem, include: [Product] }],
        transaction: t,
      });

      if (!order) throw new Error("Order not found");
      if (!["pending", "confirmed", "processing"].includes(order.status)) {
        throw new Error(
          `Order cannot be cancelled from ${order.status} status`
        );
      }

      if (order.stockDeducted) await updateStock(orderId, "restore", t);

      // Update order with version check
      const [orderUpdateCount] = await Order.update(
        {
          status: "cancelled",
          cancellationReason: reason,
          adminNotes,
          cancelledAt: new Date(),
        },
        {
          where: { id: orderId, version: order.version },
          transaction: t,
        }
      );
      if (orderUpdateCount === 0) throw new Error("Order version conflict");

      // Update payment if exists
      if (order.Payment) {
        const paymentStatus =
          order.Payment.status === "completed" ? "refunded" : "unpaid";

        const [paymentUpdateCount] = await Payment.update(
          {
            status: paymentStatus,
            refundedAt: paymentStatus === "refunded" ? new Date() : null,
          },
          {
            where: { id: order.Payment.id, version: order.Payment.version },
            transaction: t,
          }
        );
        if (paymentUpdateCount === 0)
          throw new Error("Payment version conflict");
      }

      return await Order.findByPk(orderId, {
        include: [Payment],
        lock: t.LOCK.UPDATE,
      });
    });

    await sendStatusUpdateEmail(result, "cancelled");
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Mark as Complete
exports.markAsComplete = async (req, res) => {
  try {
    const { orderId } = req.params;

    const result = await retryTransaction(async (t) => {
      const order = await Order.findOne({
        where: { id: orderId },
        include: [{ model: Payment }],
        transaction: t,
      });
      if (!order) throw new Error("Order not found");
      if (!["confirmed", "processing"].includes(order.status)) throw new Error(`Order cannot be completed from ${order.status}`);

      // Update order with version check
      const [orderUpdateCount] = await Order.update(
        { status: "completed" },
        {
          where: { id: orderId, version: order.version },
          transaction: t,
        }
      );
      if (orderUpdateCount === 0) throw new Error("Order version conflict");

      // Update payment if exists
      if (order.Payment) {
        const [paymentUpdateCount] = await Payment.update(
          { status: "paid" },
          {
            where: { id: order.Payment.id, version: order.Payment.version },
            transaction: t,
          }
        );
        if (paymentUpdateCount === 0)
          throw new Error("Payment version conflict");
      }

      return await Order.findByPk(orderId, { transaction: t });
    });

    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

