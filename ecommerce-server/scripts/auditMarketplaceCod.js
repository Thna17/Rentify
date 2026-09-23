const { sequelize } = require('../config/db');
const { Order, OrderItem, Payment, OrderEvent } = require('../models');

const cents = (value) => Math.round(Number(value || 0) * 100);

async function run() {
  const orders = await Order.findAll({ where: { salesChannel: 'marketplace' },
    attributes: ['id', 'storeId', 'buyerId', 'websiteId', 'status', 'deliveryStatus',
      'stockDeducted', 'subtotal', 'shippingFee', 'taxTotal', 'totalAmount'] });
  const findings = [];
  let collected = 0;
  let refunded = 0;
  for (const order of orders) {
    const [payments, items, events] = await Promise.all([
      Payment.findAll({ where: { orderId: order.id } }),
      OrderItem.findAll({ where: { orderId: order.id } }),
      OrderEvent.findAll({ where: { orderId: order.id } }),
    ]);
    const problem = (message) => findings.push({ orderId: order.id, message });
    if (order.websiteId || !order.storeId || !order.buyerId) problem('Marketplace identity/context is incomplete');
    if (payments.length !== 1 || payments[0].paymentMethod !== 'COD') {
      problem('Expected exactly one COD payment');
      continue;
    }
    const payment = payments[0];
    const due = cents(payment.amount);
    const collectedAmount = cents(payment.collectedAmount);
    const refundedAmount = cents(payment.refundedAmount);
    collected += collectedAmount;
    refunded += refundedAmount;
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
  console.log(JSON.stringify({ orderCount: orders.length,
    collected: (collected / 100).toFixed(2), refunded: (refunded / 100).toFixed(2),
    findings }, null, 2));
  if (findings.length) process.exitCode = 1;
}

run().catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(() => sequelize.close());
