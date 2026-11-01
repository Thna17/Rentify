const cron = require("node-cron");
const { Payment, Order, OrderEvent, PaymentGatewayConfig } = require("../../models");
const { Op } = require("sequelize");
const { sequelize } = require("../../config/db");
const PaymentVerificationService = require("./PaymentVerificationService");
const FulfillmentService = require("./FulfillmentService");
const { decryptSecrets } = require("./paymentConfigEncryption");
const axios = require("axios");

class RecoveryWorker {
  constructor() {
    this.isRunning = false;
  }

  start() {
    console.log("🛡️ Revenue Recovery Watchdog started...");

    // Run every 15 minutes (or configurable interval)
    cron.schedule("*/15 * * * *", async () => {
      await this.runCycle();
    });
  }

  async runCycle() {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      await this.recoverLostPayments();
      await this.processUnpaidKhqrTimeouts();
    } catch (error) {
      console.error("Watchdog cycle error:", error);
    } finally {
      this.isRunning = false;
    }
  }

  async recoverLostPayments() {
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
            where: { status: { [Op.not]: "cancelled" } },
          },
        ],
        limit: 50,
      });

      if (pendingPayments.length > 0) {
        console.log(`🛡️ Watchdog checking ${pendingPayments.length} pending Bakong payments...`);
      }

      for (const payment of pendingPayments) {
        try {
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
              true
            );

            console.log(`✅ RECOVERED: Order ${payment.orderId}`);
          }
        } catch (err) {
          console.error(`❌ Failed to recover Bakong payment ${payment.id}:`, err.message);
        }
      }
    } catch (error) {
      console.error("Bakong recovery error:", error);
    }
  }

  /**
   * DEC-029: Unpaid KHQR orders get a time limit.
   * Past the limit, query CutLuy one last time. If paid, confirm payment.
   * If still unpaid, cancel order with reason "Not paid in time", release stock, and expire payment.
   */
  async processUnpaidKhqrTimeouts() {
    try {
      const timeoutMinutes = parseInt(process.env.KHQR_UNPAID_ORDER_TIMEOUT_MINUTES || "15", 10);
      const timeoutThreshold = new Date(Date.now() - timeoutMinutes * 60 * 1000);

      const timedOutPayments = await Payment.findAll({
        where: {
          status: "pending",
          createdAt: { [Op.lte]: timeoutThreshold },
          [Op.or]: [
            { paymentMethod: "cutluy" },
            { paymentMethod: "khqr" },
            { gateway: "cutluy" },
          ],
        },
        include: [
          {
            model: Order,
            where: { status: { [Op.not]: "cancelled" } },
          },
        ],
        limit: 50,
      });

      if (timedOutPayments.length > 0) {
        console.log(`🛡️ Watchdog checking ${timedOutPayments.length} timed-out KHQR payments (limit: ${timeoutMinutes}m)...`);
      }

      for (const payment of timedOutPayments) {
        try {
          const order = payment.Order;
          if (!order || order.status === "cancelled") continue;

          // Resolve CutLuy gateway credentials for provider verification
          const queryWhere = [];
          if (order.websiteId) queryWhere.push({ websiteId: order.websiteId, gateway: "cutluy", enabled: true });
          if (payment.storeId) queryWhere.push({ storeId: payment.storeId, gateway: "cutluy", enabled: true });

          let cutluyConfig = null;
          if (queryWhere.length > 0) {
            cutluyConfig = await PaymentGatewayConfig.findOne({ where: { [Op.or]: queryWhere } });
          }

          if (!cutluyConfig) {
            console.warn(`[Watchdog] CutLuy config not found for payment ${payment.id} (order ${order.id}). Retaining for retry.`);
            continue;
          }

          const cfg = cutluyConfig.config || {};
          const decrypted = cfg.encryptedSecrets ? decryptSecrets(cfg.encryptedSecrets) : {};
          const apiKey = decrypted.apiKey || cfg.apiKey;
          const providerPaymentId = payment.transactionData?.providerPaymentId || payment.transactionId;

          if (!apiKey || !providerPaymentId) {
            console.warn(`[Watchdog] Missing apiKey or providerPaymentId for payment ${payment.id}. Retaining for retry/reconciliation.`);
            continue;
          }

          // Query CutLuy status BEFORE acquiring database locks (avoids holding locks during external HTTP calls)
          let providerStatus = null;
          let cutluyResponseData = null;
          try {
            const cutluyBaseUrl = (process.env.CUTLUY_API_BASE_URL || "https://cutluy.com").replace(/\/+$/, "");
            const response = await axios.get(`${cutluyBaseUrl}/v1/payments/${providerPaymentId}`, {
              headers: { Authorization: `Bearer ${apiKey}`, "User-Agent": "Rentify/1.0 (axios)" },
              timeout: 6000,
            });
            cutluyResponseData = response.data?.data || response.data;
            providerStatus = String(cutluyResponseData?.status || "").toLowerCase();
          } catch (err) {
            if (err.response && err.response.status === 404) {
              providerStatus = "not_found";
            } else {
              // Network timeout, 5xx, or provider unreachable: INCONCLUSIVE
              console.warn(`[Watchdog] CutLuy check failed for payment ${payment.id} (${err.message}). Retaining order for retry.`);
              continue; // Retain order: do not assume unpaid!
            }
          }

          // Case A: Buyer paid at provider -> recover order via confirmOrderPayment
          // Note: Called outside any outer transaction to prevent deadlock with confirmOrderPayment's internal transaction
          if (providerStatus === "paid" || providerStatus === "completed") {
            await FulfillmentService.confirmOrderPayment(
              payment.id,
              {
                provider: "cutluy",
                transactionId: providerPaymentId,
                providerEvent: cutluyResponseData,
              },
              true
            );
            console.log(`[Watchdog] Recovered paid order ${order.id} before cancellation`);
            continue;
          }

          // Case B: Explicitly confirmed as unpaid/pending/expired/not_found by provider -> safely cancel order
          const isExplicitlyUnpaid =
            providerStatus === "pending" ||
            providerStatus === "unpaid" ||
            providerStatus === "expired" ||
            providerStatus === "failed" ||
            providerStatus === "not_found";

          if (!isExplicitlyUnpaid) {
            console.warn(`[Watchdog] Inconclusive status "${providerStatus}" for payment ${payment.id}. Retaining order.`);
            continue;
          }

          // Atomic cancellation and stock restoration
          await sequelize.transaction(async (tx) => {
            const lockedPayment = await Payment.findByPk(payment.id, {
              include: [{ model: Order }],
              transaction: tx,
              lock: tx.LOCK.UPDATE,
            });

            if (!lockedPayment || lockedPayment.status !== "pending") return;
            const lockedOrder = lockedPayment.Order;
            if (!lockedOrder || lockedOrder.status === "cancelled") return;

            console.log(`[Watchdog] Cancelling unpaid order ${lockedOrder.id} (payment ${lockedPayment.id}) - timeout reached (${timeoutMinutes}m)`);
            const { updateStock } = require("../inventory").stockService;
            if (lockedOrder.stockDeducted) {
              await updateStock(lockedOrder.id, "restore", tx, {
                actor: { id: "system", type: "watchdog" },
                idempotencyKey: `watchdog-timeout-cancel-${lockedOrder.id}`,
              });
            }

            await lockedOrder.update(
              {
                status: "cancelled",
                cancellationReason: "Not paid in time",
                metadata: {
                  ...(lockedOrder.metadata || {}),
                  cancellationReason: "Not paid in time",
                  cancelledBy: "system",
                  cancelReasonCode: "unpaid_timeout",
                  providerStatusConfirmed: providerStatus,
                },
              },
              { transaction: tx, byStateMachine: true }
            );

            await lockedPayment.update(
              { status: "expired" },
              { transaction: tx }
            );

            if (OrderEvent) {
              await OrderEvent.create(
                {
                  orderId: lockedOrder.id,
                  storeId: lockedOrder.storeId,
                  type: "order_cancelled",
                  amount: null,
                  details: {
                    reason: "Not paid in time",
                    actor: "system",
                    resolution: "cancel",
                    timeoutMinutes,
                    providerStatus,
                  },
                },
                { transaction: tx }
              ).catch(() => null);
            }
          });
        } catch (itemErr) {
          console.error(`[Watchdog] Error processing timeout for payment ${payment.id}:`, itemErr.message);
        }
      }
    } catch (error) {
      console.error("Watchdog timeout processing error:", error);
    }
  }
}

module.exports = new RecoveryWorker();
