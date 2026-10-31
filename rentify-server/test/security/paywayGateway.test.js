const test = require('node:test');
const assert = require('node:assert/strict');
const gateway = require('../../src/modules/billing/paywayGateway');

test('plan payment confirmation requires a successful lookup and matching payment details', async () => {
  const originalFetch = global.fetch;
  const oldId = process.env.PAYWAY_MERCHANT_ID;
  const oldKey = process.env.PAYWAY_API_KEY;
  process.env.PAYWAY_MERCHANT_ID = 'sandbox-test';
  process.env.PAYWAY_API_KEY = 'unit-test-key';
  try {
    const expected = { amount: '5.00', currency: 'USD' };
    const valid = { status: { code: '00', tran_id: 'PLAN1' }, data: { payment_status_code: 0, original_amount: '5.00', payment_currency: 'USD' } };
    for (const body of [
      { ...valid, status: { code: '5' } },
      { ...valid, data: { ...valid.data, original_amount: '0.01' } },
      { ...valid, data: { ...valid.data, payment_currency: 'KHR' } },
      { ...valid, status: { code: '00', tran_id: 'OTHER' } },
    ]) {
      global.fetch = async () => ({ ok: true, json: async () => body });
      await assert.rejects(() => gateway.checkTransaction('PLAN1', expected));
    }
    global.fetch = async () => ({ ok: true, json: async () => valid });
    assert.equal(await gateway.checkTransaction('PLAN1', expected), 'PAID');
    global.fetch = async () => ({ ok: true, json: async () => ({status:{code:'6'}}) });
    assert.equal(await gateway.checkTransaction('PLAN1', expected), 'PENDING');
  } finally {
    global.fetch = originalFetch;
    if (oldId === undefined) delete process.env.PAYWAY_MERCHANT_ID; else process.env.PAYWAY_MERCHANT_ID = oldId;
    if (oldKey === undefined) delete process.env.PAYWAY_API_KEY; else process.env.PAYWAY_API_KEY = oldKey;
  }
});
