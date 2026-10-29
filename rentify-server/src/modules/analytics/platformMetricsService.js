'use strict';

const { Op } = require('sequelize');
const models = require('../../models');

const CATALOG_VERSION = '1.0.0';

function windowFrom(input = {}, now = new Date()) {
  const days = Math.min(90, Math.max(1, Number.parseInt(input.days, 10) || 30));
  const end = new Date(now);
  const start = new Date(end.getTime() - days * 86400000);
  return { days, start, end };
}

function decimalToMinor(value, currency = 'USD') {
  if (value == null || value === '') return 0;
  const decimals = currency === 'KHR' ? 0 : 2;
  const text = String(value).trim();
  if (!/^-?\d+(\.\d+)?$/.test(text)) return 0;
  const negative = text.startsWith('-');
  const unsigned = negative ? text.slice(1) : text;
  const [whole, fraction = ''] = unsigned.split('.');
  const padded = `${fraction}${'0'.repeat(decimals)}`.slice(0, decimals);
  const minor = Number.parseInt(whole, 10) * (10 ** decimals) + Number.parseInt(padded || '0', 10);
  return negative ? -minor : minor;
}

function moneyByCurrency(rows, valueField) {
  return rows.reduce((result, row) => {
    const currency = /^[A-Z]{3}$/.test(row.currency || '') ? row.currency : 'USD';
    result[currency] = (result[currency] || 0) + decimalToMinor(row[valueField], currency);
    return result;
  }, {});
}

function countBy(rows, key) {
  return rows.reduce((result, row) => {
    const value = row[key] || 'unknown';
    result[value] = (result[value] || 0) + 1;
    return result;
  }, {});
}

function average(values) {
  return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null;
}

function createPlatformMetricsService(deps = models) {
  const { User, Store, Website, Subscription, Payment, SupportCase,
    NotificationDelivery, NotificationDeliveryAttempt, EventOutbox } = deps;
  return {
    async getDashboard(query = {}, now = new Date()) {
      const window = windowFrom(query, now);
      const createdWhere = { createdAt: { [Op.between]: [window.start, window.end] } };
      const [users, stores, websites, subscriptions, payments, supportCases,
        deliveries, attempts, outbox] = await Promise.all([
        User.findAll({ where: createdWhere, attributes: ['id', 'isVerified', 'createdAt'], raw: true }),
        Store.findAll({ where: createdWhere, attributes: ['id', 'status', 'marketplaceApprovalStatus', 'createdAt'], raw: true }),
        Website.findAll({ where: createdWhere, attributes: ['id', 'status', 'createdAt'], raw: true }),
        Subscription.findAll({ where: createdWhere, attributes: ['id', 'status', 'createdAt', 'startDate', 'endDate'], raw: true }),
        Payment.findAll({ where: { ...createdWhere, status: 'completed' }, attributes: ['amount', 'currency', 'status', 'createdAt'], raw: true }),
        SupportCase.findAll({ where: createdWhere, attributes: ['status', 'priority', 'openedAt', 'serviceDeadlineAt', 'resolvedAt'], raw: true }),
        NotificationDelivery.findAll({ where: createdWhere, attributes: ['status', 'channel', 'createdAt', 'sentAt'], raw: true }),
        NotificationDeliveryAttempt.findAll({ where: createdWhere, attributes: ['status', 'errorCode', 'createdAt'], raw: true }),
        EventOutbox.findAll({ where: createdWhere, attributes: ['status'], raw: true }),
      ]);
      const resolved = supportCases.filter((item) => item.resolvedAt);
      const resolvedWithDeadline = resolved.filter((item) => item.serviceDeadlineAt);
      const resolvedWithinDeadline = resolvedWithDeadline.filter((item) =>
        new Date(item.resolvedAt).getTime() <= new Date(item.serviceDeadlineAt).getTime());
      const resolutionDurations = resolved.map((item) => new Date(item.resolvedAt).getTime() - new Date(item.openedAt).getTime())
        .filter((value) => Number.isFinite(value) && value >= 0);
      const overdue = supportCases.filter((item) => !item.resolvedAt && item.serviceDeadlineAt
        && new Date(item.serviceDeadlineAt).getTime() < now.getTime()).length;
      const sent = deliveries.filter((item) => item.status === 'sent').length;
      const failed = deliveries.filter((item) => ['failed_retryable', 'failed_terminal'].includes(item.status)).length;
      const subscriptionRevenue = moneyByCurrency(payments, 'amount');
      const activeStores = stores.filter((store) => store.status === 'active').length;
      return {
        catalogVersion: CATALOG_VERSION,
        generatedAt: now.toISOString(),
        window: { days: window.days, start: window.start.toISOString(), end: window.end.toISOString() },
        activation: {
          accountsStarted: users.length,
          verifiedAccounts: users.filter((user) => user.isVerified).length,
          storesCreated: stores.length,
          activeStores,
          marketplaceApprovedStores: stores.filter((store) => store.marketplaceApprovalStatus === 'approved').length,
          storefrontsCreated: websites.length,
          completionRate: users.length ? activeStores / users.length : null,
        },
        support: {
          opened: supportCases.length,
          resolved: resolved.length,
          overdue,
          resolutionRate: supportCases.length ? resolved.length / supportCases.length : 0,
          resolvedWithDeadline: resolvedWithDeadline.length,
          resolvedWithinDeadline: resolvedWithinDeadline.length,
          slaAttainmentRate: resolvedWithDeadline.length
            ? resolvedWithinDeadline.length / resolvedWithDeadline.length : null,
          averageResolutionDurationMs: average(resolutionDurations),
          byStatus: countBy(supportCases, 'status'),
          byPriority: countBy(supportCases, 'priority'),
        },
        notificationReliability: {
          deliveries: deliveries.length,
          sent,
          failed,
          successRate: deliveries.length ? sent / deliveries.length : null,
          byStatus: countBy(deliveries, 'status'),
          attemptsByStatus: countBy(attempts, 'status'),
        },
        subscriptions: {
          created: subscriptions.length,
          byStatus: countBy(subscriptions, 'status'),
          lifecycleAuthorityComplete: false,
          lifecycleGapCode: 'P5_SUBSCRIPTION_LIFECYCLE_INCOMPLETE',
        },
        revenue: {
          subscriptionCollectedMinorByCurrency: subscriptionRevenue,
          codGmvMinorByCurrency: {},
          providerFees: { defined: false, minorByCurrency: null },
          netRecognizedPlatformRevenue: { defined: false, minorByCurrency: null },
          classification: 'rentify_subscription_revenue_only',
        },
        reliability: { outbox: countBy(outbox, 'status') },
      };
    },
  };
}

module.exports = { createPlatformMetricsService, windowFrom, decimalToMinor, moneyByCurrency };
