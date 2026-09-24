const { sequelize } = require('../config/db');
const { Op } = require('sequelize');
const { Order, OrderItem, Payment, OrderEvent } = require('../models');

const cents = (value) => Math.round(Number(value || 0) * 100);

async function audit({ storeId } = {}) {
  const orders = await Order.findAll({ where: {
    [Op.or]: [
      { salesChannel: 'marketplace' },
      { salesChannel: 'storefront', checkoutKey: { [Op.ne]: null } },
    ],
    ...(storeId ? { storeId } : {}),
  }, attributes: ['id', 'storeId', 'buyerId', 'websiteId', 'salesChannel', 'status', 'deliveryStatus',
      'stockDeducted', 'subtotal', 'shippingFee', 'taxTotal', 'totalAmount'] });
  const findings = [];
  const channels = {
    marketplace: { orderCount: 0, amountDueCents: 0, collectedCents: 0, refundedCents: 0 },
    storefront: { orderCount: 0, amountDueCents: 0, collectedCents: 0, refundedCents: 0 },
  };
  for (const order of orders) {
    const [payments, items, events] = await Promise.all([
      Payment.findAll({ where: { orderId: order.id } }),
      OrderItem.findAll({ where: { orderId: order.id } }),
      OrderEvent.findAll({ where: { orderId: order.id } }),
    ]);
    const problem = (message) => findings.push({ orderId: order.id, message });
    if (!order.storeId || !order.buyerId) problem('Buyer or Store identity is incomplete');
    if (order.salesChannel === 'marketplace' && order.websiteId) {
      problem('Marketplace order unexpectedly has a Website');
    }
    if (order.salesChannel === 'storefront' && !order.websiteId) {
      problem('Storefront order has no Website');
    }
    const channel = channels[order.salesChannel];
    channel.orderCount += 1;
    if (payments.length !== 1 || payments[0].paymentMethod !== 'COD') {
      problem('Expected exactly one COD payment');
      continue;
    }
    const payment = payments[0];
    const due = cents(payment.amount);
    const collectedAmount = cents(payment.collectedAmount);
    const refundedAmount = cents(payment.refundedAmount);
    channel.amountDueCents += due;
    channel.collectedCents += collectedAmount;
    channel.refundedCents += refundedAmount;
    if (due !== cents(order.totalAmount)) problem('Payment amount differs from order total');
    if (items.reduce((sum, item) => sum + cents(item.total), 0) !== cents(order.subtotal)) {
      problem('Order line totals differ from subtotal');
    }
    if (cents(order.subtotal) + cents(order.shippingFee) + cents(order.taxTotal) !== cents(order.totalAmount)) {
      problem('Subtotal, delivery, and tax do not reconcile to total');
    }
    if (items.some((item) => item.itemMetadata?.seller?.storeId !== order.storeId)) {
      problem('Order contains a line for another Store');
    }
    if (refundedAmount > collectedAmount || collectedAmount > due) problem('Cash amounts exceed collected or due');
    if (payment.status === 'pending' && collectedAmount !== 0) problem('Pending COD has collected cash');
    if (payment.status === 'paid' && collectedAmount !== due) problem('Paid COD is not fully collected');
    if (payment.status === 'paid' && refundedAmount === collectedAmount && collectedAmount > 0) {
      problem('Fully refunded COD remains marked paid');
    }
    if (payment.status === 'refunded' && refundedAmount !== collectedAmount) problem('Refunded COD is not fully refunded');
    if (order.status === 'cancelled' && (order.stockDeducted || collectedAmount)) {
      problem('Cancelled order retains stock deduction or cash collection');
    }
    if (events.filter((event) => event.type === 'collect_cod').reduce((sum, event) => sum + cents(event.amount), 0) !== collectedAmount) {
      problem('Collection events do not reconcile to payment');
    }
    if (events.filter((event) => event.type === 'confirm_refund').reduce((sum, event) => sum + cents(event.amount), 0) !== refundedAmount) {
      problem('Refund events do not reconcile to payment');
    }
  }
  const money = (centsValue) => (centsValue / 100).toFixed(2);
  return { orderCount: orders.length, channels: Object.fromEntries(
    Object.entries(channels).map(([name, value]) => [name, {
      orderCount: value.orderCount, amountDue: money(value.amountDueCents),
      collected: money(value.collectedCents), refunded: money(value.refundedCents),
    }])
  ), findings };
}

if (require.main === module) {
  audit().then((report) => {
    console.log(JSON.stringify(report, null, 2));
    if (report.findings.length) process.exitCode = 1;
  }).catch((error) => { console.error(error); process.exitCode = 1; })
    .finally(() => sequelize.close());
}

module.exports = { audit };
