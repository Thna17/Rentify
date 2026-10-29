const test = require('node:test');
const assert = require('node:assert/strict');
const { Payment } = require('../../src/models');
const history = require('../../src/modules/billing/merchantPaymentHistory');

test('plan payment history uses exact minor units and never returns provider evidence', async (t) => {
  assert.equal(history.minorUnits('15.05', 'USD'), 1505);
  assert.equal(history.minorUnits('1.001', 'USD'), null);
  assert.equal(history.minorUnits('3000', 'KHR'), 3000);
  assert.equal(history.minorUnits('0.5', 'KHR'), null);
  assert.equal(history.minorUnits('12', 'EUR'), null);
  let options;
  t.mock.method(Payment, 'findAll', async (input) => { options = input; return [{ id: 'p1', packageId: 'pkg',
    amount: 15.05, currency: 'USD', status: 'completed', createdAt: new Date(), transactionData: { secret: 'hidden' } }]; });
  let body;
  await history.list({ user: { id: 'merchant-a', role: 'user' } }, { json(value) { body = value; } });
  assert.equal(options.where.userId, 'merchant-a');
  assert.equal(body.data[0].amountMinor, 1505);
  assert.equal(body.data[0].classification, 'subscription_payment');
  assert.equal(JSON.stringify(body).includes('secret'), false);
});
