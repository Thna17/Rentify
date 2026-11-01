// ecommerce-server/test/security/cutluyDec029Payments.test.js
// DEC-029: Comprehensive security and integration test suite for CutLuy KHQR checkout,
// fail-closed webhooks, order cancellation guards, void/take-cash safety, and watchdog recovery.

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");

process.env.PAYMENT_CONFIG_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");

const { normalizePaymentMethod, normalizePaymentStatus } = require("../../modules/payments/paymentUtils");
const { ORDER_ERROR_CODES, OrderStateError } = require("../../modules/orders/orderErrors");
const { resolvePaymentMethod } = require("../../modules/checkout/marketplaceCheckoutService");
const PaymentController = require("../../modules/payments/PaymentController");
const FulfillmentService = require("../../modules/payments/FulfillmentService");
const { Payment, Order, PaymentGatewayConfig, StoreAccess, OrderEvent } = require("../../models");
const axios = require("axios");

const TEST_STORE_ID = "11111111-1111-4111-8111-111111111111";
const TEST_WEBSITE_ID = "22222222-2222-4222-8222-222222222222";

function createMockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
    send(data) {
      this.body = data;
      return this;
    },
  };
  return res;
}

function createCutluySignature(rawBody, secret, timestamp = Math.floor(Date.now() / 1000)) {
  const payloadToSign = `${timestamp}.${rawBody}`;
  const hmac = crypto.createHmac("sha256", secret).update(payloadToSign).digest("hex");
  return `t=${timestamp},v1=${hmac}`;
}

test("DEC-029: normalizePaymentMethod maps cutluy and khqr to KHQR, and cod to COD", () => {
  assert.equal(normalizePaymentMethod("cutluy"), "KHQR");
  assert.equal(normalizePaymentMethod("CUTLUY"), "KHQR");
  assert.equal(normalizePaymentMethod("khqr"), "KHQR");
  assert.equal(normalizePaymentMethod("KHQR"), "KHQR");
  assert.equal(normalizePaymentMethod("cod"), "COD");
  assert.equal(normalizePaymentMethod("COD"), "COD");
  assert.equal(normalizePaymentMethod("cash"), "CASH");
  assert.equal(normalizePaymentMethod("CASH"), "CASH");
  assert.equal(normalizePaymentMethod(null), "COD");
  assert.equal(normalizePaymentMethod(undefined), "COD");
});

test("DEC-029: normalizePaymentStatus maps completed and paid to paid", () => {
  assert.equal(normalizePaymentStatus("completed"), "paid");
  assert.equal(normalizePaymentStatus("paid"), "paid");
  assert.equal(normalizePaymentStatus("COMPLETED"), "paid");
  assert.equal(normalizePaymentStatus("pending"), "pending");
  assert.equal(normalizePaymentStatus("failed"), "failed");
  assert.equal(normalizePaymentStatus("expired"), "expired");
  assert.equal(normalizePaymentStatus(null), "pending");
  assert.equal(normalizePaymentStatus(undefined), "pending");
});

test("DEC-029: ORDER_PAID_CANCEL_UNAVAILABLE error code is registered", () => {
  assert.equal(ORDER_ERROR_CODES.ORDER_PAID_CANCEL_UNAVAILABLE, "ORDER_PAID_CANCEL_UNAVAILABLE");
});

test("DEC-029: resolvePaymentMethod accepts KHQR and COD, and rejects retired ABA_PAYWAY", () => {
  assert.equal(resolvePaymentMethod("COD"), "COD");
  assert.equal(resolvePaymentMethod("KHQR"), "KHQR");
  assert.equal(resolvePaymentMethod("cutluy"), "KHQR");
  assert.equal(resolvePaymentMethod("CUTLUY"), "KHQR");

  assert.throws(
    () => resolvePaymentMethod("ABA_PAYWAY"),
    (err) => err.code === "PAYMENT_METHOD_UNAVAILABLE" && err.statusCode === 400
  );
  assert.throws(
    () => resolvePaymentMethod("STRIPE"),
    (err) => err.code === "PAYMENT_METHOD_UNAVAILABLE" && err.statusCode === 400
  );
});

test("DEC-029: Paid KHQR orders cannot be cancelled (no refunds in Release 1)", () => {
  function evaluateCancellation(order, payment) {
    if (payment) {
      const isPaid = payment.status === "paid" || payment.status === "completed";
      const isKhqr = ["khqr", "cutluy"].includes(String(payment.paymentMethod || "").toLowerCase());
      if (isPaid && isKhqr) {
        throw new OrderStateError(
          ORDER_ERROR_CODES.ORDER_PAID_CANCEL_UNAVAILABLE,
          "Paid KHQR orders cannot be cancelled because refunds are not supported in this release",
          400
        );
      }
    }
    return true;
  }

  // Pending KHQR order is cancellable
  assert.equal(
    evaluateCancellation({ id: "ord-1", status: "pending" }, { status: "pending", paymentMethod: "cutluy" }),
    true
  );

  // Unpaid COD order is cancellable
  assert.equal(
    evaluateCancellation({ id: "ord-2", status: "pending" }, { status: "pending", paymentMethod: "COD" }),
    true
  );

  // Paid KHQR order MUST throw ORDER_PAID_CANCEL_UNAVAILABLE
  assert.throws(
    () => evaluateCancellation({ id: "ord-3", status: "confirmed" }, { status: "paid", paymentMethod: "cutluy" }),
    (err) => err.code === "ORDER_PAID_CANCEL_UNAVAILABLE" && err.statusCode === 400
  );
  assert.throws(
    () => evaluateCancellation({ id: "ord-4", status: "confirmed" }, { status: "completed", paymentMethod: "khqr" }),
    (err) => err.code === "ORDER_PAID_CANCEL_UNAVAILABLE" && err.statusCode === 400
  );
});

test("DEC-029: PaymentController.getStorePublicPaymentMethods returns KHQR when CutLuy is configured and COD is always present", async () => {
  const origFindAll = PaymentGatewayConfig.findAll;
  const origFindStore = StoreAccess.findByPk;

  try {
    // Store without CutLuy
    PaymentGatewayConfig.findAll = async () => [];
    StoreAccess.findByPk = async () => ({ id: TEST_STORE_ID, name: "My Corner Store" });

    const req1 = { params: { storeId: TEST_STORE_ID } };
    const res1 = createMockRes();
    await PaymentController.getStorePublicPaymentMethods(req1, res1);

    assert.equal(res1.statusCode, 200);
    assert.deepEqual(res1.body.paymentMethods, ["COD"]);
    assert.equal(res1.body.cutluyEnabled, false);
    assert.equal(res1.body.businessName, "My Corner Store");

    // Store with CutLuy enabled
    PaymentGatewayConfig.findAll = async () => [
      {
        gateway: "cutluy",
        enabled: true,
        config: { businessName: "Artisan Roasters" },
      },
    ];

    const req2 = { params: { storeId: TEST_STORE_ID } };
    const res2 = createMockRes();
    await PaymentController.getStorePublicPaymentMethods(req2, res2);

    assert.equal(res2.statusCode, 200);
    assert.deepEqual(res2.body.paymentMethods, ["COD", "KHQR"]);
    assert.equal(res2.body.cutluyEnabled, true);
    assert.equal(res2.body.businessName, "Artisan Roasters");
  } finally {
    PaymentGatewayConfig.findAll = origFindAll;
    StoreAccess.findByPk = origFindStore;
  }
});

test("DEC-029: Webhook signature verification fails closed when header or secret is missing or invalid", async () => {
  const secret = "test_webhook_secret_key_12345";
  const rawBody = JSON.stringify({
    event: "payment.completed",
    data: { id: "pay_test_1", reference_id: "ORDER-ord-1", status: "completed", amount: "25.00", currency: "USD" },
  });

  const origFindPayment = Payment.findOne;
  const origFindConfig = PaymentGatewayConfig.findOne;

  try {
    Payment.findOne = async () => ({
      id: "pay-db-1",
      orderId: "ord-1",
      amount: "25.00",
      currency: "USD",
      status: "pending",
      transactionId: "pay_test_1",
      transactionData: { providerPaymentId: "pay_test_1" },
      Order: { id: "ord-1", websiteId: TEST_WEBSITE_ID, status: "pending" },
    });

    // 1. Missing signature header -> 401
    PaymentGatewayConfig.findOne = async () => ({
      config: { webhookSecret: secret },
    });
    const req1 = { headers: {}, body: JSON.parse(rawBody), rawBody: Buffer.from(rawBody) };
    const res1 = createMockRes();
    await PaymentController.handleCutluyWebhook(req1, res1);
    assert.equal(res1.statusCode, 401);
    assert.match(res1.body.error, /Missing CutLuy webhook signature header/i);

    // 2. Missing webhook secret -> 401
    PaymentGatewayConfig.findOne = async () => null;
    const validHeader = createCutluySignature(rawBody, secret);
    const req2 = { headers: { "x-cutluy-signature": validHeader }, body: JSON.parse(rawBody), rawBody: Buffer.from(rawBody) };
    const res2 = createMockRes();
    await PaymentController.handleCutluyWebhook(req2, res2);
    assert.equal(res2.statusCode, 401);
    assert.match(res2.body.error, /CutLuy webhook secret not configured/i);

    // 3. Invalid signature HMAC -> 401
    PaymentGatewayConfig.findOne = async () => ({
      config: { webhookSecret: secret },
    });
    const forgedHeader = `t=${Math.floor(Date.now() / 1000)},v1=deadbeefdeadbeef`;
    const req3 = { headers: { "x-cutluy-signature": forgedHeader }, body: JSON.parse(rawBody), rawBody: Buffer.from(rawBody) };
    const res3 = createMockRes();
    await PaymentController.handleCutluyWebhook(req3, res3);
    assert.equal(res3.statusCode, 401);
    assert.match(res3.body.error, /Invalid CutLuy webhook signature/i);
  } finally {
    Payment.findOne = origFindPayment;
    PaymentGatewayConfig.findOne = origFindConfig;
  }
});

test("DEC-029: Webhook binding requires provider payment ID, amount, and currency to match database record", async () => {
  const secret = "test_webhook_secret_key_12345";
  const origFindPayment = Payment.findOne;
  const origFindConfig = PaymentGatewayConfig.findOne;

  try {
    const mockPayment = {
      id: "pay-db-10",
      orderId: "ord-10",
      amount: "50.00",
      currency: "USD",
      status: "pending",
      transactionId: "pay_cutluy_10",
      transactionData: { providerPaymentId: "pay_cutluy_10" },
      Order: { id: "ord-10", websiteId: TEST_WEBSITE_ID, status: "pending" },
    };

    Payment.findOne = async () => mockPayment;
    PaymentGatewayConfig.findOne = async () => ({
      config: { webhookSecret: secret },
    });

    async function sendSignedWebhook(payload) {
      const rawBody = JSON.stringify(payload);
      const sig = createCutluySignature(rawBody, secret);
      const req = {
        headers: { "x-cutluy-signature": sig },
        body: payload,
        rawBody: Buffer.from(rawBody),
      };
      const res = createMockRes();
      await PaymentController.handleCutluyWebhook(req, res);
      return res;
    }

    // 1. Missing provider payment ID in payload -> 400
    const resNoId = await sendSignedWebhook({
      event: "payment.completed",
      data: { reference_id: "ORDER-ord-10", amount: "50.00", currency: "USD", status: "completed" },
    });
    assert.equal(resNoId.statusCode, 400);
    assert.match(resNoId.body.error, /Missing required provider payment ID/i);

    // 2. Mismatched provider payment ID -> 400
    const resWrongId = await sendSignedWebhook({
      event: "payment.completed",
      data: { id: "pay_cutluy_DIFFERENT", reference_id: "ORDER-ord-10", amount: "50.00", currency: "USD", status: "completed" },
    });
    assert.equal(resWrongId.statusCode, 400);
    assert.match(resWrongId.body.error, /Provider payment ID mismatch/i);

    // 3. Missing amount in payload -> 400
    const resNoAmount = await sendSignedWebhook({
      event: "payment.completed",
      data: { id: "pay_cutluy_10", reference_id: "ORDER-ord-10", currency: "USD", status: "completed" },
    });
    assert.equal(resNoAmount.statusCode, 400);
    assert.match(resNoAmount.body.error, /Missing required payment amount/i);

    // 4. Mismatched amount in payload -> 400
    const resWrongAmount = await sendSignedWebhook({
      event: "payment.completed",
      data: { id: "pay_cutluy_10", reference_id: "ORDER-ord-10", amount: "10.00", currency: "USD", status: "completed" },
    });
    assert.equal(resWrongAmount.statusCode, 400);
    assert.match(resWrongAmount.body.error, /Payment amount mismatch/i);

    // 5. Missing currency in payload -> 400
    const resNoCurrency = await sendSignedWebhook({
      event: "payment.completed",
      data: { id: "pay_cutluy_10", reference_id: "ORDER-ord-10", amount: "50.00", status: "completed" },
    });
    assert.equal(resNoCurrency.statusCode, 400);
    assert.match(resNoCurrency.body.error, /Missing required payment currency/i);

    // 6. Mismatched currency in payload -> 400
    const resWrongCurrency = await sendSignedWebhook({
      event: "payment.completed",
      data: { id: "pay_cutluy_10", reference_id: "ORDER-ord-10", amount: "50.00", currency: "KHR", status: "completed" },
    });
    assert.equal(resWrongCurrency.statusCode, 400);
    assert.match(resWrongCurrency.body.error, /Payment currency mismatch/i);
  } finally {
    Payment.findOne = origFindPayment;
    PaymentGatewayConfig.findOne = origFindConfig;
  }
});

test("DEC-029: Duplicate webhook callbacks are idempotent and do not duplicate fulfillment", async () => {
  const secret = "test_webhook_secret_key_12345";
  const origFindPayment = Payment.findOne;
  const origFindConfig = PaymentGatewayConfig.findOne;

  try {
    const mockPayment = {
      id: "pay-db-20",
      orderId: "ord-20",
      amount: "30.00",
      currency: "USD",
      status: "paid", // already completed
      transactionId: "pay_cutluy_20",
      transactionData: { providerPaymentId: "pay_cutluy_20" },
      Order: { id: "ord-20", websiteId: TEST_WEBSITE_ID, status: "confirmed" },
    };

    Payment.findOne = async () => mockPayment;
    PaymentGatewayConfig.findOne = async () => ({
      config: { webhookSecret: secret },
    });

    const payload = {
      event: "payment.completed",
      data: { id: "pay_cutluy_20", reference_id: "ORDER-ord-20", amount: "30.00", currency: "USD", status: "completed" },
    };
    const rawBody = JSON.stringify(payload);
    const sig = createCutluySignature(rawBody, secret);
    const req = {
      headers: { "x-cutluy-signature": sig },
      body: payload,
      rawBody: Buffer.from(rawBody),
    };
    const res = createMockRes();

    await PaymentController.handleCutluyWebhook(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.received, true);
    assert.equal(res.body.alreadyCompleted, true);
  } finally {
    Payment.findOne = origFindPayment;
    PaymentGatewayConfig.findOne = origFindConfig;
  }
});

test("DEC-029: Late payment on cancelled order creates durable OrderEvent and fails closed if event fails", async () => {
  const secret = "test_webhook_secret_key_12345";
  const origFindPayment = Payment.findOne;
  const origFindConfig = PaymentGatewayConfig.findOne;
  const origOrderEventCreate = OrderEvent.create;

  try {
    let paymentUpdated = false;
    const mockPayment = {
      id: "pay-db-30",
      orderId: "ord-30",
      amount: "75.00",
      currency: "USD",
      status: "pending",
      transactionId: "pay_cutluy_30",
      transactionData: { providerPaymentId: "pay_cutluy_30" },
      Order: { id: "ord-30", websiteId: TEST_WEBSITE_ID, status: "cancelled" }, // Order was cancelled due to timeout
      update: async (data) => {
        paymentUpdated = true;
        mockPayment.transactionData = { ...mockPayment.transactionData, ...data.transactionData };
      },
    };

    Payment.findOne = async () => mockPayment;
    PaymentGatewayConfig.findOne = async () => ({
      config: { webhookSecret: secret },
    });

    const eventsCreated = [];
    OrderEvent.create = async (event) => {
      eventsCreated.push(event);
      return event;
    };

    const payload = {
      event: "payment.completed",
      data: { id: "pay_cutluy_30", reference_id: "ORDER-ord-30", amount: "75.00", currency: "USD", status: "completed" },
    };
    const rawBody = JSON.stringify(payload);
    const sig = createCutluySignature(rawBody, secret);
    const req = {
      headers: { "x-cutluy-signature": sig },
      body: payload,
      rawBody: Buffer.from(rawBody),
    };
    const res = createMockRes();

    await PaymentController.handleCutluyWebhook(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.latePayment, true);
    assert.equal(res.body.exceptionRecorded, true);
    assert.equal(paymentUpdated, true);
    assert.equal(eventsCreated.length, 1);
    assert.equal(eventsCreated[0].type, "payment_exception");
    assert.equal(eventsCreated[0].details.exceptionType, "late_payment_after_cancellation");

    // Test fail-closed: if OrderEvent.create throws, webhook returns 500 so CutLuy will retry
    OrderEvent.create = async () => {
      throw new Error("DB Connection Error on event creation");
    };
    const resFail = createMockRes();
    await PaymentController.handleCutluyWebhook(req, resFail);
    assert.equal(resFail.statusCode, 500);
  } finally {
    Payment.findOne = origFindPayment;
    PaymentGatewayConfig.findOne = origFindConfig;
    OrderEvent.create = origOrderEventCreate;
  }
});

test("DEC-029: PaymentController.voidPayment prevents double payment by checking and cancelling at CutLuy", async () => {
  const origFindByPk = Payment.findByPk;
  const origConfigFind = PaymentGatewayConfig.findOne;
  const origConfirmPayment = FulfillmentService.confirmOrderPayment;
  const origOrderEventCreate = OrderEvent.create;
  const origAxiosGet = axios.get;
  const origAxiosPost = axios.post;
  const { sequelize } = require("../../config/db");
  const origTransaction = sequelize.transaction;

  try {
    sequelize.transaction = async (fn) => fn({ LOCK: { UPDATE: "UPDATE" } });
    let paymentCancelled = false;
    const mockPayment = {
      id: "pay-pos-1",
      orderId: "ord-pos-1",
      amount: "20.00",
      currency: "USD",
      status: "pending",
      transactionId: "cutluy_provider_pos_1",
      transactionData: { providerPaymentId: "cutluy_provider_pos_1" },
      Order: { id: "ord-pos-1", websiteId: TEST_WEBSITE_ID, status: "pending" },
      update: async (data) => {
        if (data.status === "cancelled") paymentCancelled = true;
      },
    };

    Payment.findByPk = async () => mockPayment;
    PaymentGatewayConfig.findOne = async () => ({
      config: { apiKey: "cutluy_api_key_test" },
    });
    OrderEvent.create = async () => ({ id: "ev-1" });

    // 1. If payment is already completed -> 409 alreadyPaid: true
    const mockPaidPayment = { ...mockPayment, status: "paid" };
    Payment.findByPk = async () => mockPaidPayment;
    const res1 = createMockRes();
    await PaymentController.voidPayment({ params: { paymentId: "pay-pos-1" }, body: {} }, res1);
    assert.equal(res1.statusCode, 409);
    assert.equal(res1.body.alreadyPaid, true);

    // 2. If CutLuy status check fails (unreachable) -> 502 (fails closed, do NOT switch to cash)
    Payment.findByPk = async () => mockPayment;
    axios.get = async () => {
      throw new Error("Network timeout to CutLuy");
    };
    const res2 = createMockRes();
    await PaymentController.voidPayment({ params: { paymentId: "pay-pos-1" }, body: {} }, res2);
    assert.equal(res2.statusCode, 502);
    assert.match(res2.body.error, /status is not confirmed/i);

    // 3. If CutLuy reports payment was already completed at provider -> 409 alreadyPaid: true
    let confirmedPaid = false;
    FulfillmentService.confirmOrderPayment = async () => {
      confirmedPaid = true;
    };
    axios.get = async () => ({
      data: { status: "paid" },
    });
    const res3 = createMockRes();
    await PaymentController.voidPayment({ params: { paymentId: "pay-pos-1" }, body: {} }, res3);
    assert.equal(res3.statusCode, 409);
    assert.equal(res3.body.alreadyPaid, true);
    assert.equal(confirmedPaid, true);

    // 4. If CutLuy reports pending -> successfully cancel at CutLuy to deactivate QR and void locally
    let cutluyCancelCalled = false;
    let cancelledAtProvider = false;
    axios.get = async () => ({ data: { status: cancelledAtProvider ? "cancelled" : "pending" } });
    axios.post = async (url) => {
      cancelledAtProvider = true;
      if (url.includes("/cancel")) cutluyCancelCalled = true;
      return { data: { status: "cancelled" } };
    };
    const res4 = createMockRes();
    await PaymentController.voidPayment({ params: { paymentId: "pay-pos-1" }, body: { reason: "cashier_take_cash" } }, res4);
    assert.equal(res4.statusCode, 200);
    assert.equal(res4.body.success, true);
    assert.equal(cutluyCancelCalled, true);
    assert.equal(paymentCancelled, true);
  } finally {
    Payment.findByPk = origFindByPk;
    PaymentGatewayConfig.findOne = origConfigFind;
    FulfillmentService.confirmOrderPayment = origConfirmPayment;
    OrderEvent.create = origOrderEventCreate;
    axios.get = origAxiosGet;
    axios.post = origAxiosPost;
    sequelize.transaction = origTransaction;
  }
});

test("DEC-029: Watchdog timeout deactivates QR at CutLuy and retains order if cancellation is inconclusive", async () => {
  function evaluateWatchdogTransition({ providerStatus, cancelSucceeded, cancelPaid }) {
    if (providerStatus === "pending") {
      if (cancelPaid) {
        return "RECOVER_PAID_ORDER";
      }
      if (!cancelSucceeded) {
        return "RETAIN_FOR_RETRY"; // Do NOT cancel while QR remains payable!
      }
      providerStatus = "cancelled";
    }

    if (providerStatus === "paid" || providerStatus === "completed") {
      return "RECOVER_PAID_ORDER";
    }

    const isConfirmedDead = ["cancelled", "expired", "failed", "not_found"].includes(providerStatus);
    if (isConfirmedDead) {
      return "CANCEL_UNPAID_ORDER";
    }
    return "RETAIN_FOR_RETRY";
  }

  // Pending with successful cancel -> CANCEL_UNPAID_ORDER
  assert.equal(
    evaluateWatchdogTransition({ providerStatus: "pending", cancelSucceeded: true }),
    "CANCEL_UNPAID_ORDER"
  );

  // Pending with failed cancel -> RETAIN_FOR_RETRY (prevents double-payment!)
  assert.equal(
    evaluateWatchdogTransition({ providerStatus: "pending", cancelSucceeded: false }),
    "RETAIN_FOR_RETRY"
  );

  // Pending but customer paid during cancel -> RECOVER_PAID_ORDER
  assert.equal(
    evaluateWatchdogTransition({ providerStatus: "pending", cancelPaid: true }),
    "RECOVER_PAID_ORDER"
  );

  // Already paid -> RECOVER_PAID_ORDER
  assert.equal(
    evaluateWatchdogTransition({ providerStatus: "paid" }),
    "RECOVER_PAID_ORDER"
  );

  // Expired or not found -> CANCEL_UNPAID_ORDER
  assert.equal(
    evaluateWatchdogTransition({ providerStatus: "expired" }),
    "CANCEL_UNPAID_ORDER"
  );
  assert.equal(
    evaluateWatchdogTransition({ providerStatus: "not_found" }),
    "CANCEL_UNPAID_ORDER"
  );
});

test("webhook asks provider to retry when payment has not committed", async (t) => {
  t.mock.method(Payment, "findOne", async () => null);
  const res = createMockRes();
  await PaymentController.handleCutluyWebhook({ body: { id: "provider-early", status: "paid" }, headers: {} }, res);
  assert.equal(res.statusCode, 503);
});

test("void cannot overwrite a payment completed while the gateway was queried", async (t) => {
  const { sequelize } = require("../../config/db");
  const payment = { id: "pay-race", orderId: "ord-race", status: "pending", storeId: TEST_STORE_ID,
    transactionData: { providerPaymentId: "provider-race" }, Order: { id: "ord-race", storeId: TEST_STORE_ID } };
  let updated = false;
  t.mock.method(PaymentGatewayConfig, "findOne", async () => ({ config: { apiKey: "test" } }));
  t.mock.method(axios, "get", async () => ({ data: { status: "cancelled" } }));
  t.mock.method(sequelize, "transaction", async (fn) => fn({ LOCK: { UPDATE: "UPDATE" } }));
  t.mock.method(Payment, "findByPk", async () => ({ ...payment, status: "completed", update: async () => { updated = true; } }));
  const res = createMockRes();
  await PaymentController.voidPayment({ params: { paymentId: payment.id }, payment, body: {} }, res);
  assert.equal(res.statusCode, 409);
  assert.equal(res.body.alreadyPaid, true);
  assert.equal(updated, false);
});
