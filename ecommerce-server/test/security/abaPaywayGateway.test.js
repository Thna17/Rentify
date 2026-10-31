const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const payway = require("../../modules/payments/aba/paywayGateway");

const withEnv = async (vars, fn) => {
  const saved = {};
  for (const [key, value] of Object.entries(vars)) {
    saved[key] = process.env[key];
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
  try { return await fn(); } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
};

const ENABLED = { PAYWAY_ENABLED: "true", PAYWAY_MERCHANT_ID: "test-merchant", PAYWAY_API_KEY: "test-key" };

const stubFetch = (body) => {
  const calls = [];
  const original = global.fetch;
  global.fetch = async (url, options) => { calls.push({ url, options }); return { json: async () => body }; };
  return { calls, restore: () => { global.fetch = original; } };
};

test("ABA PayWay is off unless PAYWAY_ENABLED is true (DEC-026 keeps checkout COD-only)", async () => {
  await withEnv({ PAYWAY_ENABLED: undefined }, async () => {
    assert.equal(payway.isEnabled(), false);
    await assert.rejects(() => payway.checkTransaction("RFTEST"), { code: "PAYWAY_DISABLED", statusCode: 404 });
  });
});

test("an enabled server without credentials says it is not configured", async () => {
  await withEnv({ PAYWAY_ENABLED: "true", PAYWAY_MERCHANT_ID: undefined, PAYWAY_API_KEY: undefined }, async () => {
    await assert.rejects(() => payway.checkTransaction("RFTEST"), { code: "PAYWAY_NOT_CONFIGURED", statusCode: 500 });
  });
});

test("tran ids are unique and fit PayWay's 20-character limit", () => {
  const ids = new Set(Array.from({ length: 50 }, () => payway.generateTranId()));
  assert.equal(ids.size, 50);
  for (const id of ids) assert.ok(id.length <= 20 && /^RF[0-9A-Z]+$/.test(id));
});

test("purchase hash follows PayWay's field order and treats empty fields as empty strings", () => {
  const fields = Object.fromEntries(payway.HASH_FIELD_ORDER.map((field, i) => [field, i % 3 ? `v${i}` : ""]));
  const expected = crypto.createHmac("sha512", "k").update(payway.HASH_FIELD_ORDER.map((f) => fields[f]).join("")).digest("base64");
  assert.equal(payway.buildPurchaseHash(fields, "k"), expected);
});

test("createTransaction signs the request and returns the KHQR", async () => {
  await withEnv(ENABLED, async () => {
    const stub = stubFetch({ status: { code: "00" }, qrImage: "data:image/png;base64,AAA", qrString: "000201", abapay_deeplink: "abamobilebank://x" });
    try {
      const result = await payway.createTransaction({
        tranId: "RFABC", amount: 12.5, items: [{ name: "Tea", quantity: 1, price: 12.5 }],
        firstName: "Emily", phone: "012", returnParams: "ORD-1", successUrl: "http://x/s", cancelUrl: "http://x/c",
      });
      assert.equal(result.qrString, "000201");
      assert.equal(result.deeplink, "abamobilebank://x");
      assert.equal(result.currency, "USD");
      const form = stub.calls[0].options.body;
      assert.match(stub.calls[0].url, /\/payments\/purchase$/);
      assert.equal(form.get("amount"), "12.50");
      assert.equal(form.get("payment_option"), "abapay_khqr_deeplink");
      assert.ok(form.get("hash"));
    } finally { stub.restore(); }
  });
});

test("a rejected purchase surfaces ABA's message as PAYWAY_REQUEST_FAILED", async () => {
  await withEnv(ENABLED, async () => {
    const stub = stubFetch({ status: { code: 12, message: "Payment currency is not allowed" } });
    try {
      await assert.rejects(
        () => payway.createTransaction({ tranId: "RFX", amount: 1, items: [], successUrl: "http://x", cancelUrl: "http://x" }),
        { code: "PAYWAY_REQUEST_FAILED", statusCode: 502 },
      );
    } finally { stub.restore(); }
  });
});

test("checkTransaction maps ABA's payment_status_code and treats an unknown tran id as pending", async () => {
  await withEnv(ENABLED, async () => {
    const cases = [
      [{ status: { code: "00" }, data: { payment_status_code: 0 } }, "PAID"],
      [{ status: { code: "00" }, data: { payment_status_code: 2 } }, "PENDING"],
      [{ status: { code: "00" }, data: { payment_status_code: 3 } }, "FAILED"],
      [{ status: { code: "00" }, data: { payment_status_code: 7 } }, "FAILED"],
      [{ status: { code: "00" }, data: { payment_status_code: 4 } }, "REFUNDED"],
      [{ status: { code: 6, message: "not found" } }, "PENDING"],
    ];
    for (const [body, expected] of cases) {
      const stub = stubFetch(body);
      try { assert.equal(await payway.checkTransaction("RFT"), expected); } finally { stub.restore(); }
    }
  });
});


test("payment verification rejects failed lookups and mismatched amount, currency or transaction", async () => {
  await withEnv(ENABLED, async () => {
    for (const body of [
      { status: { code: '5' }, data: { payment_status_code: 0 } },
      { status: { code: '00', tran_id: 'RFTEST' }, data: { payment_status_code: 0, original_amount: '4.99', payment_currency: 'USD' } },
      { status: { code: '00', tran_id: 'RFTEST' }, data: { payment_status_code: 0, original_amount: '5.00', payment_currency: 'KHR' } },
      { status: { code: '00', tran_id: 'OTHER' }, data: { payment_status_code: 0, original_amount: '5.00', payment_currency: 'USD' } },
    ]) {
      const stub = stubFetch(body);
      try { await assert.rejects(() => payway.checkTransaction('RFTEST', { amount: '5.00', currency: 'USD' })); }
      finally { stub.restore(); }
    }
    const stub = stubFetch({ status: { code: '00', tran_id: 'RFTEST' }, data: { payment_status_code: '0', original_amount: '5.00', payment_currency: 'USD' } });
    try { assert.equal(await payway.checkTransaction('RFTEST', { amount: '5.00', currency: 'USD' }), 'PAID'); }
    finally { stub.restore(); }
  });
});
