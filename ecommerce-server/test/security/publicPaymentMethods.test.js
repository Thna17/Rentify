const test = require("node:test");
const assert = require("node:assert/strict");

const { orderView } = require("../../modules/checkout/marketplaceRules");

test("orderView includes payment id, paymentMethod, rawQR and qrCodeUrl", () => {
  const dummyOrder = {
    id: "ord-1",
    orderNumber: "ORD-0001",
    storeId: "store-1",
    websiteId: "web-1",
    buyerId: "buyer-1",
    status: "pending",
    deliveryStatus: "pending",
    fulfillmentStatus: "unfulfilled",
    returnStatus: "none",
    salesChannel: "storefront",
    subtotal: "10.00",
    shippingFee: "1.50",
    totalAmount: "11.50",
    currency: "USD",
    customerInfo: { name: "Test Buyer" },
    shippingInfo: { address: "Phnom Penh" },
    orderSnapshot: null,
  };

  const dummyPayment = {
    id: "pay-1",
    paymentMethod: "cutluy",
    status: "pending",
    amount: "11.50",
    collectedAmount: "0.00",
    refundedAmount: "0.00",
    transactionData: {
      provider: "cutluy",
      rawQR: "00020101021229...",
      checkoutUrl: "https://cutluy.com/pay/pay_123",
      qrCodeUrl: "https://cutluy.com/pay/pay_123",
    },
  };

  const view = orderView(dummyOrder, [], dummyPayment);
  assert.equal(view.payment.id, "pay-1");
  assert.equal(view.payment.paymentMethod, "KHQR");
  assert.equal(view.paymentMethod, "KHQR");
  assert.equal(view.payment.rawQR, "00020101021229...");
  assert.equal(view.payment.qrCodeUrl, "https://cutluy.com/pay/pay_123");
});

test("getPublicPaymentMethods rejects invalid websiteId", async () => {
  const { getPublicPaymentMethods } = require("../../modules/payments/paymentConfigController");
  let statusCode = null;
  let jsonResult = null;
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(obj) {
      jsonResult = obj;
      return this;
    },
  };

  await getPublicPaymentMethods({ params: { websiteId: "invalid-uuid" } }, res);
  assert.equal(statusCode, 400);
  assert.deepEqual(jsonResult, { error: "Invalid websiteId" });
});
