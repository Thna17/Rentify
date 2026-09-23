// utils/constants.js
module.exports = {
  PAYMENT_METHODS: {
    KHQR: "KHQR",
    COD: "COD",
    CASH: "cash",
    CARD: "card",
    BANK_TRANSFER: "bank_transfer",
    DIGITAL_WALLET: "digital_wallet"
  },
  ORDER_STATUS: {
    PENDING: "pending",
    CONFIRMED: "confirmed",
    COMPLETED: "completed",
    FULFILLED: "fulfilled",
    PROCESSING: "processing",
    CANCELLED: "cancelled",
    PREPARING: "preparing",
    READY_FOR_PICKUP: "ready_for_pickup",
    OUT_FOR_DELIVERY: "out_for_delivery"
  },
  PAYMENT_STATUS: {
    PENDING: "pending",
    COMPLETED: "completed",  // Changed from "paid" to "completed" for consistency
    FAILED: "failed",
    REFUNDED: "refunded",
    PAID: "paid"
  },
  KHQR_CURRENCY_CODES: { KHR: "116", USD: "840" },
};