'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createAnalyticsEventService, validateAndSanitize } = require('../../modules/analytics/analyticsEventService');
const { createPlatformMetricsService, decimalToMinor } = require('../../modules/analytics/platformMetricsService');

const NOW = new Date('2026-10-29T12:00:00.000Z');

test('browser analytics accepts bounded search measures without search text', () => {
  const event = validateAndSanitize({
    eventId: '4db71043-1cd7-44d8-93ec-0e6f70f40001',
    eventName: 'marketplace.search_performed',
    schemaVersion: '1.0.0',
    occurredAt: NOW.toISOString(),
    properties: { channel: 'marketplace', locale: 'km', hasResults: false },
    measures: { queryLength: 9, filterCount: 1, resultCount: 0, durationMs: 14.25 },
  }, NOW);
  assert.equal(event.properties.locale, 'km');
  assert.equal(event.measures.durationMs, 14.3);
  assert.equal(event.properties.query, undefined);
  assert.equal(event.properties.searchText, undefined);
});

test('browser analytics rejects personal data and arbitrary labels', () => {
  assert.throws(() => validateAndSanitize({
    eventName: 'marketplace.search_performed',
    properties: { channel: 'marketplace', locale: 'en', hasResults: true, query: 'private search' },
    measures: { resultCount: 1 },
  }, NOW), (error) => error.code === 'ANALYTICS_PII_REJECTED');
  assert.throws(() => validateAndSanitize({
    eventName: 'marketplace.search_performed',
    properties: { channel: 'marketplace', locale: 'en', hasResults: true, campaign: 'unbounded' },
  }, NOW), /unsupported key/i);
});

test('duplicate event IDs return an accepted duplicate without a second record', async () => {
  let calls = 0;
  const model = { create: async () => {
    calls += 1;
    if (calls > 1) throw Object.assign(new Error('duplicate'), { name: 'SequelizeUniqueConstraintError' });
    return { eventId: '4db71043-1cd7-44d8-93ec-0e6f70f40002' };
  } };
  const service = createAnalyticsEventService({ model });
  const input = { eventId: '4db71043-1cd7-44d8-93ec-0e6f70f40002', eventName: 'cart.item_added',
    occurredAt: NOW.toISOString(), properties: { channel: 'marketplace' }, measures: { quantity: 1 } };
  assert.equal((await service.record(input, { now: NOW })).duplicate, false);
  assert.equal((await service.record(input, { now: NOW })).duplicate, true);
});

test('commerce dashboard keeps COD GMV, refunds and cancellations separate', async () => {
  const deps = {
    ProductAnalyticsEvent: { findAll: async () => [
      { eventName: 'marketplace.search_performed', properties: { hasResults: false }, measures: { durationMs: 8 } },
      { eventName: 'cart.item_added', properties: {}, measures: {} },
      { eventName: 'checkout.started', properties: {}, measures: {} },
    ] },
    Order: { findAll: async () => [
      { id: 'cod-order', status: 'fulfilled', totalAmount: '12.50', currency: 'USD' },
      { id: 'cancelled-order', status: 'cancelled', totalAmount: '3.00', currency: 'USD' },
      { id: 'online-order', status: 'fulfilled', totalAmount: '99.00', currency: 'USD' },
    ] },
    Payment: { findAll: async () => [
      { orderId: 'cod-order', paymentMethod: 'cod', collectedAmount: '12.50', refundedAmount: '2.00', currency: 'USD' },
      { orderId: 'online-order', paymentMethod: 'card', collectedAmount: '99.00', refundedAmount: '0.00', currency: 'USD' },
    ] },
    BuyerReport: { findAll: async () => [{ subjectType: 'return', category: 'return_claim', linkageStatus: 'linked' }] },
    ProductModerationHistory: { findAll: async () => [{ action: 'reject' }] },
    EventOutbox: { findAll: async () => [{ status: 'published' }] },
  };
  const dashboard = await createPlatformMetricsService(deps).getDashboard({}, NOW);
  assert.deepEqual(dashboard.cod.gmvMinorByCurrency, { USD: 1250 });
  assert.deepEqual(dashboard.cod.collectedMinorByCurrency, { USD: 1250 });
  assert.deepEqual(dashboard.refunds.refundedMinorByCurrency, { USD: 200 });
  assert.deepEqual(dashboard.cancellations.cancelledMinorByCurrency, { USD: 300 });
  assert.equal(dashboard.cart.checkoutProgressionRate, 1);
  assert.equal(dashboard.returnsAndComplaints.returns, 1);
  assert.equal(dashboard.returnsAndComplaints.complaints, 0);
  assert.equal(dashboard.cod.classification, 'merchant_commerce_not_rentify_revenue');
  assert.equal(decimalToMinor('1.50', 'USD'), 150);
});
