const test = require('node:test');
const assert = require('node:assert/strict');
const axios = require('axios');
const { getCutluyFinalStatus } = require('../../modules/payments/cutluyFinalStatus');

test('CutLuy cancellation requires a terminal status from a fresh provider read', async (t) => {
  let status = 'pending';
  t.mock.method(axios, 'get', async () => ({ data: { status } }));
  t.mock.method(axios, 'post', async () => ({ data: { status: 'cancelled' } }));
  assert.equal((await getCutluyFinalStatus({ providerPaymentId: 'p', apiKey: 'key' })).status, 'unknown');
  axios.post.mock.mockImplementation(async () => { status = 'cancelled'; return {}; });
  assert.equal((await getCutluyFinalStatus({ providerPaymentId: 'p', apiKey: 'key' })).status, 'cancelled');
  status = 'pending';
  axios.post.mock.mockImplementation(async () => { status = 'paid'; const e = new Error('conflict'); e.response = { status: 409 }; throw e; });
  assert.equal((await getCutluyFinalStatus({ providerPaymentId: 'p', apiKey: 'key' })).status, 'paid');
  status = 'pending';
  axios.post.mock.mockImplementation(async () => { const e = new Error('conflict'); e.response = { status: 409 }; throw e; });
  assert.equal((await getCutluyFinalStatus({ providerPaymentId: 'p', apiKey: 'key' })).status, 'unknown');
  axios.get.mock.mockImplementation(async () => { throw new Error('timeout'); });
  assert.equal((await getCutluyFinalStatus({ providerPaymentId: 'p', apiKey: 'key' })).status, 'unknown');
});
