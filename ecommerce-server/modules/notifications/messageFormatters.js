const { PAYMENT_METHODS, PAYMENT_STATUS } = require("../../utils/constants");

exports.formatMerchantOrder = (order, payment, orderItems = []) => {
  const { name, phone, province, district, commune, street, note } =
    order.customerInfo;
  const address = [street, commune, district, province]
    .filter(Boolean)
    .join(", ");

  const itemList = orderItems
    .map(
      (item) =>
        `• ${item.name} x${item.quantity} - $${(
          item.price * item.quantity
        ).toFixed(2)}`
    )
    .join("\n");

  const text = `📦 *New Order Received*  
🆔 *Order ID:* \`${order.id}\`  
👤 *Customer:* ${name}  
📞 *Phone:* ${phone}  
📍 *Address:* ${address || "N/A"}  
📝 *Note:* ${note || "None"}  

🛍️ *Items:*  
${itemList || "No items"}  

💰 *Total:* $${order.totalAmount.toFixed(2)}  
💳 *Payment:* ${payment.paymentMethod} (${payment.status})  
🕐 *Time:* ${new Date(order.createdAt).toLocaleString("en-US", {
    timeZone: "Asia/Phnom_Penh",
  })}`;

  let reply_markup;
  if (payment.paymentMethod === "COD" && payment.status === "pending") {
    reply_markup = {
      inline_keyboard: [
        [
          { text: "✅ Confirm", callback_data: `confirm:${order.id}` },
          { text: "❌ Cancel", callback_data: `cancel:${order.id}` },
        ],
      ],
    };
  }

  return { text, reply_markup };
};

exports.formatCustomerOrder = (order, payment, orderItems = []) => {
  const { name, phone, province, district, commune, street, note } =
    order.customerInfo;
  const address = [street, commune, district, province]
    .filter(Boolean)
    .join(", ");

  const itemList = orderItems
    .map(
      (item) =>
        `• ${item.name} x${item.quantity} - $${(
          item.price * item.quantity
        ).toFixed(2)}`
    )
    .join("\n");

  const text = `📬 *Your Order Confirmation*  
🆔 *Order ID:* \`${order.id}\`  
👤 *Name:* ${name}  
📞 *Phone:* ${phone}  
📍 *Address:* ${address || "N/A"}  
📝 *Note:* ${note || "None"}  

🛍️ *Items:*  
${itemList || "No items"}  

💰 *Total:* $${order.totalAmount.toFixed(2)}  
💳 *Payment Method:* ${payment.paymentMethod}  
🕐 *Order Time:* ${new Date(order.createdAt).toLocaleString("en-US", {
    timeZone: "Asia/Phnom_Penh",
  })}`;

  let reply_markup = undefined;

  // Show cancel button only for COD pending orders
  if (
    payment.paymentMethod === PAYMENT_METHODS.COD &&
    payment.status === PAYMENT_STATUS.PENDING
  ) {
    reply_markup = {
      inline_keyboard: [
        [
          {
            text: "❌ Cancel Order",
            callback_data: `customer_cancel:${order.id}`,
          },
        ],
      ],
    };
  }

  return { text, reply_markup };
};
