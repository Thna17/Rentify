const { Payment, Order, Invoice } = require("../../models");
const { updateStock } = require("../inventory").stockService;
const { ORDER_STATUS, PAYMENT_STATUS } = require("../../utils/constants");
const retryTransaction = require("../../utils/retryTransaction");

class FulfillmentService {
    /**
     * Confirms payment and fulfills the order transactionally
     * @param {string} paymentId
     * @param {object} verificationData - External transaction data (e.g. from Bakong)
     * @param {boolean} isRecovery - Whether this was triggered by the recovery worker
     */
    async confirmOrderPayment(paymentId, verificationData = {}, isRecovery = false) {
        return retryTransaction(async (t) => {
            // 1. Lock payment and related data
            const payment = await Payment.findByPk(paymentId, {
                include: [{ model: Order }],
                transaction: t,
                lock: t.LOCK.UPDATE,
            });

            if (!payment) throw new Error("Payment not found");

            // Idempotency check
            if (payment.status === PAYMENT_STATUS.COMPLETED) {
                return { success: true, alreadyCompleted: true };
            }

            if (payment.status !== PAYMENT_STATUS.PENDING) {
                throw new Error("Cannot confirm a payment that is no longer pending");
            }

            let order = payment.Order;
            if (!order && payment.orderId) {
                order = await Order.findByPk(payment.orderId, { transaction: t, lock: t.LOCK.UPDATE });
            }

            if (order) {
                if (order.status === "cancelled") {
                    throw new Error("Cannot confirm cancelled order");
                }

                // 2. Update Order Status
                const orderType = order.orderType;
                const newStatus =
                    orderType === "pos" ? ORDER_STATUS.FULFILLED : ORDER_STATUS.PROCESSING;

                await order.update(
                    { status: newStatus, confirmedAt: new Date() },
                    { transaction: t, byStateMachine: true }
                );
            }

            // 3. Deduct Stock
            if (payment.orderId) {
                await updateStock(payment.orderId, "deduct", t);
            }

            // 4. Update Payment Status
            const updatePayload = {
                status: PAYMENT_STATUS.COMPLETED,
                paidAt: new Date(),
                collectedAmount: payment.amount,
                collectedAt: new Date(),
                transactionData: {
                    ...payment.transactionData,
                    verifiedAt: new Date(),
                    ...verificationData, // Merge external verification data
                },
            };

            if (isRecovery) {
                updatePayload.isRecovered = true;
            }

            if (verificationData.transactionId) {
                updatePayload.transactionId = verificationData.transactionId;
            }

            await payment.update(updatePayload, { transaction: t });

            // 5. Update Invoice
            if (payment.orderId) {
                const invoice = await Invoice.findOne({
                    where: { orderId: payment.orderId },
                    transaction: t,
                    lock: t.LOCK.UPDATE,
                });

                if (invoice) {
                    await invoice.update(
                        {
                            status: "paid",
                            paymentId: payment.id,
                        },
                        { transaction: t }
                    );
                }
            }

            return { success: true, orderId: payment.orderId };
        }, 3);
    }
}

module.exports = new FulfillmentService();
