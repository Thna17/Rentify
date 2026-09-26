const {

  Order,
  OrderItem,

} = require("../../models");
const { changeStock } = require('./sharedStockService');

exports.updateStock = async (orderId, action, transaction) => {
  const order = await Order.findByPk(orderId, {
    include: [{ model: OrderItem, as: 'OrderItems' }],
    transaction,
    lock: transaction.LOCK.UPDATE
  });
  if (!order) throw new Error('Order not found');
  if (!['deduct', 'restore'].includes(action)) throw new Error('Invalid stock action');
  if ((action === 'deduct' && order.stockDeducted) || (action === 'restore' && !order.stockDeducted)) {
    return order;
  }

  const modifier = action === 'deduct' ? -1 : 1;
  const sortedItems = order.OrderItems.sort((a, b) =>
    a.productId.localeCompare(b.productId)
  );

  for (const item of sortedItems) {
    await changeStock(item.productId, modifier * item.quantity, transaction, item.variantId || null);
  }

  await order.update({ stockDeducted: action === 'deduct' }, { transaction });
};
