'use strict';

const { Op } = require('sequelize');
const models = require('../../models');
const { CATALOG_VERSION } = require('./eventCatalog');

const openStatuses = new Set(['pending', 'confirmed', 'processing', 'preparing', 'ready_for_pickup', 'out_for_delivery']);
const fulfilledStatuses = new Set(['completed', 'fulfilled']);

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
  const result = Number.parseInt(whole, 10) * (10 ** decimals) + Number.parseInt(padded || '0', 10);
  return negative ? -result : result;
}

function addMoney(target, currency, value) {
  const code = /^[A-Z]{3}$/.test(currency || '') ? currency : 'USD';
  target[code] = (target[code] || 0) + decimalToMinor(value, code);
}

function percentile(values, ratio) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * ratio) - 1)];
}

function createPlatformMetricsService(deps = models) {
  const { ProductAnalyticsEvent, Order, Payment, BuyerReport, ProductModerationHistory, EventOutbox } = deps;
  return {
    async getDashboard(query = {}, now = new Date()) {
      const window = windowFrom(query, now);
      const where = { createdAt: { [Op.between]: [window.start, window.end] } };
      const [telemetry, orders, payments, reports, moderation, outbox] = await Promise.all([
        ProductAnalyticsEvent.findAll({ where: { occurredAt: { [Op.between]: [window.start, window.end] } }, raw: true }),
        Order.findAll({ where, attributes: ['id', 'status', 'salesChannel', 'totalAmount', 'currency', 'returnStatus'], raw: true }),
        Payment.findAll({ where, attributes: ['orderId', 'status', 'paymentMethod', 'amount', 'collectedAmount', 'refundedAmount', 'currency'], raw: true }),
        BuyerReport.findAll({ where, attributes: ['subjectType', 'category', 'linkageStatus'], raw: true }),
        ProductModerationHistory.findAll({ where, attributes: ['action', 'reasonCode'], raw: true }),
        EventOutbox.findAll({ where, attributes: ['status'], raw: true }),
      ]);
      const named = (name) => telemetry.filter((event) => event.eventName === name);
      const searches = named('marketplace.search_performed');
      const zeroResults = searches.filter((event) => event.properties?.hasResults === false).length;
      const latencies = searches.map((event) => Number(event.measures?.durationMs || 0)).filter(Number.isFinite);
      const checkoutStarts = named('checkout.started').length;
      const checkoutFailures = named('checkout.failed').length;
      const cartAdds = named('cart.item_added').length;
      const completedOrders = orders.filter((order) => fulfilledStatuses.has(order.status));
      const cancelledOrders = orders.filter((order) => order.status === 'cancelled');
      const openOrders = orders.filter((order) => openStatuses.has(order.status));
      const codOrderIds = new Set(payments.filter((payment) => String(payment.paymentMethod).toLowerCase().includes('cod'))
        .map((payment) => payment.orderId));
      const gmv = {};
      for (const order of orders.filter((item) => item.status !== 'cancelled' && codOrderIds.has(item.id))) {
        addMoney(gmv, order.currency, order.totalAmount);
      }
      const cancelled = {};
      for (const order of cancelledOrders) addMoney(cancelled, order.currency, order.totalAmount);
      const codCollected = {};
      const refunds = {};
      for (const payment of payments) {
        if (String(payment.paymentMethod).toLowerCase().includes('cod')) addMoney(codCollected, payment.currency, payment.collectedAmount);
        addMoney(refunds, payment.currency, payment.refundedAmount);
      }
      const statusCounts = (rows) => rows.reduce((result, row) => {
        result[row.status] = (result[row.status] || 0) + 1;
        return result;
      }, {});
      const moderationCounts = moderation.reduce((result, row) => {
        result[row.action] = (result[row.action] || 0) + 1;
        return result;
      }, {});
      return {
        catalogVersion: CATALOG_VERSION,
        generatedAt: now.toISOString(),
        window: { days: window.days, start: window.start.toISOString(), end: window.end.toISOString() },
        search: { performed: searches.length, zeroResults,
          zeroResultRate: searches.length ? zeroResults / searches.length : 0,
          latencyMs: { p50: percentile(latencies, 0.5), p95: percentile(latencies, 0.95) } },
        discovery: { views: named('marketplace.discovery_viewed').length },
        cart: { itemAdded: cartAdds, itemUpdated: named('cart.item_updated').length,
          checkoutProgressionRate: cartAdds ? checkoutStarts / cartAdds : null },
        checkout: { started: checkoutStarts, completed: orders.length,
          failed: checkoutFailures, completionRate: checkoutStarts ? orders.length / checkoutStarts : null },
        fulfillment: { orders: orders.length, completed: completedOrders.length, open: openOrders.length,
          successRate: orders.length ? completedOrders.length / orders.length : 0 },
        cod: { gmvMinorByCurrency: gmv, collectedMinorByCurrency: codCollected,
          classification: 'merchant_commerce_not_rentify_revenue' },
        refunds: { refundedMinorByCurrency: refunds },
        cancellations: { count: cancelledOrders.length, cancelledMinorByCurrency: cancelled },
        returnsAndComplaints: { total: reports.length,
          returns: reports.filter((row) => row.subjectType === 'return' || String(row.category).includes('return')).length,
          complaints: reports.filter((row) => row.subjectType !== 'return' && !String(row.category).includes('return')).length,
          linkedToCore: reports.filter((row) => row.linkageStatus === 'linked').length },
        moderation: moderationCounts,
        reliability: { outbox: statusCounts(outbox) },
      };
    },
  };
}

module.exports = { createPlatformMetricsService, windowFrom, decimalToMinor, percentile };
