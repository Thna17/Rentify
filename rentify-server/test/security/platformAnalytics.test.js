'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createPlatformMetricsService, decimalToMinor } = require('../../src/modules/analytics/platformMetricsService');

const NOW = new Date('2026-10-29T12:00:00.000Z');
const list = (rows) => ({ findAll: async () => rows });

test('Core analytics separates subscription revenue and exposes missing accounting inputs', async () => {
  const deps = {
    User: list([{ isVerified: true }]),
    Store: list([{ status: 'active', marketplaceApprovalStatus: 'approved' }]),
    Website: list([{ status: 'active' }]),
    Subscription: list([{ status: 'active' }, { status: 'trial' }]),
    Payment: list([{ status: 'completed', amount: '15.00', currency: 'USD' }]),
    SupportCase: list([{ status: 'resolved', priority: 'normal', openedAt: '2026-10-29T10:00:00Z',
      serviceDeadlineAt: '2026-10-30T10:00:00Z', resolvedAt: '2026-10-29T11:00:00Z' }]),
    NotificationDelivery: list([{ status: 'sent', channel: 'in_app' }]),
    NotificationDeliveryAttempt: list([{ status: 'sent' }]),
    EventOutbox: list([{ status: 'published' }]),
  };
  const dashboard = await createPlatformMetricsService(deps).getDashboard({}, NOW);
  assert.deepEqual(dashboard.revenue.subscriptionCollectedMinorByCurrency, { USD: 1500 });
  assert.deepEqual(dashboard.revenue.codGmvMinorByCurrency, {});
  assert.equal(dashboard.revenue.providerFees.defined, false);
  assert.equal(dashboard.revenue.netRecognizedPlatformRevenue.defined, false);
  assert.equal(dashboard.subscriptions.lifecycleAuthorityComplete, false);
  assert.equal(dashboard.activation.completionRate, 1);
  assert.equal(dashboard.support.slaAttainmentRate, 1);
  assert.equal(decimalToMinor('1.50', 'USD'), 150);
});

test('Core analytics reports overdue support and notification failure visibility', async () => {
  const deps = {
    User: list([]), Store: list([]), Website: list([]), Subscription: list([]), Payment: list([]),
    SupportCase: list([{ status: 'open', priority: 'urgent', openedAt: '2026-10-27T10:00:00Z',
      serviceDeadlineAt: '2026-10-28T10:00:00Z', resolvedAt: null }]),
    NotificationDelivery: list([{ status: 'failed_retryable', channel: 'email' }]),
    NotificationDeliveryAttempt: list([{ status: 'failed_retryable', errorCode: 'TIMEOUT' }]),
    EventOutbox: list([{ status: 'dead_letter' }]),
  };
  const dashboard = await createPlatformMetricsService(deps).getDashboard({}, NOW);
  assert.equal(dashboard.support.overdue, 1);
  assert.equal(dashboard.notificationReliability.failed, 1);
  assert.equal(dashboard.reliability.outbox.dead_letter, 1);
});
