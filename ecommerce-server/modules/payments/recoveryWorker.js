const cron = require("node-cron");
const { Payment, Order } = require("../../models");
const { Op } = require("sequelize");
const PaymentVerificationService = require("./PaymentVerificationService");
const FulfillmentService = require("./FulfillmentService");

class RecoveryWorker {
    constructor() {
        this.isRunning = false;
    }

    start() {
        console.log("🛡️ Revenue Recovery Watchdog started...");

        // Run every 15 minutes
        cron.schedule("*/15 * * * *", async () => {
            await this.recoverLostPayments();
        });
    }

    async recoverLostPayments() {
        if (this.isRunning) return;
        this.isRunning = true;

        try {
            const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
            const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

            // Find pending payments that might be successful on Bakong
            const pendingPayments = await Payment.findAll({
                where: {
                    status: "pending",
                    createdAt: {
                        [Op.lte]: tenMinutesAgo,
                        [Op.gte]: fortyEightHoursAgo,
                    },
                    paymentMethod: "khqr",
                },
                include: [
                    {
                        model: Order,
                        where: { status: { [Op.not]: "cancelled" } }
                    }
                ],
                limit: 50, // Batch size
            });

            if (pendingPayments.length > 0) {
                console.log(`🛡️ Watchdog checking ${pendingPayments.length} pending payments...`);
            }

            for (const payment of pendingPayments) {
                try {
                    // Skip if no Hash (can't verify)
                    if (!payment.transactionData?.md5Hash) continue;

                    const verification = await PaymentVerificationService.verifyBakongTransaction(
                        payment.transactionData.md5Hash,
                        payment.amount
                    );

                    if (verification) {
                        console.log(`💰 RECOVERING PAYMENT: ${payment.id} ($${payment.amount})`);

                        await FulfillmentService.confirmOrderPayment(
                            payment.id,
                            verification,
                            true // isRecovery = true
                        );

                        console.log(`✅ RECOVERED: Order ${payment.orderId}`);
                    }
                } catch (err) {
                    console.error(`❌ Failed to recover payment ${payment.id}:`, err.message);
                }
            }
        } catch (error) {
            console.error("Watchdog error:", error);
        } finally {
            this.isRunning = false;
        }
    }
}

module.exports = new RecoveryWorker();
