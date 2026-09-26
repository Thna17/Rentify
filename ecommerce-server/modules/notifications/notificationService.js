const TelegramService = require("./telegramService");
const { sendEmail } = require("./emailService");
const { formatMerchantOrder, formatCustomerOrder } = require("./messageFormatters");

const money = (n) => `$${(Number(n) || 0).toFixed(2)}`;

const itemsToHtmlRows = (orderItems = []) =>
  orderItems
    .map(
      (item) =>
        `<tr><td style="padding:4px 8px 4px 0;">${item.name} × ${item.quantity}</td>` +
        `<td style="padding:4px 0;text-align:right;">${money((item.price || 0) * (item.quantity || 1))}</td></tr>`
    )
    .join("");

class NotificationService {
  constructor(userType) {
    this.userType = userType; // 'merchant' or 'customer'
  }

  async send({ channel, recipient, message, options = {} }) {
    switch (channel) {
      case "telegram":
        return this.sendTelegram(recipient, message, options);
      case "email":
        return this.sendEmail(recipient, message, options);
      default:
        throw new Error(`Unsupported channel: ${channel}`);
    }
  }

  async sendTelegram(identifier, message, options = {}) {
    if (options.chatId) {
      return TelegramService.sendDirectMessage(options.chatId, message, options);
    }
    // TODO: implement fallback for phone number lookup
  }

  async sendEmail(email, message, options = {}) {
    const subject = options.subject || "Notification";
    return sendEmail(email, subject, message);
  }

  formatOrder(order, payment, orderItems) {
    return this.userType === "merchant"
      ? formatMerchantOrder(order, payment, orderItems)
      : formatCustomerOrder(order, payment, orderItems);
  }

  /** Confirms the order to the buyer. Silently does nothing without an email. */
  static async sendOrderConfirmation(email, order, orderItems = []) {
    if (!email) return;
    const html = `
      <div style="font-family:sans-serif;color:#1f2937;">
        <h2 style="margin:0 0 12px;">Thanks for your order!</h2>
        <p style="margin:0 0 16px;color:#4b5563;">Order <strong>#${String(order.id).slice(0, 8)}</strong> is confirmed.</p>
        <table style="width:100%;border-collapse:collapse;">${itemsToHtmlRows(orderItems)}</table>
        <p style="margin:16px 0 0;font-weight:bold;">Total: ${money(order.totalAmount)}</p>
      </div>`;
    try {
      await sendEmail(email, `Order confirmed — #${String(order.id).slice(0, 8)}`, html);
    } catch (error) {
      console.error("Buyer order confirmation email failed:", error.message);
    }
  }

  /**
   * Alerts the merchant that a new order came in — by email if we have one,
   * by Telegram if they've linked their account. Never throws: a failed
   * notification must not fail the order itself.
   */
  static async sendNewOrderNotification(contact, order, orderItems = []) {
    if (!contact) {
      console.warn(`No merchant contact found for order ${order?.id} — notification skipped`);
      return;
    }

    const html = `
      <div style="font-family:sans-serif;color:#1f2937;">
        <h2 style="margin:0 0 12px;">📦 New order received</h2>
        <p style="margin:0 0 4px;">Order <strong>#${String(order.id).slice(0, 8)}</strong></p>
        <p style="margin:0 0 16px;color:#4b5563;">Customer: ${order.customerInfo?.name || order.customerEmail || "Guest"}</p>
        <table style="width:100%;border-collapse:collapse;">${itemsToHtmlRows(orderItems)}</table>
        <p style="margin:16px 0 0;font-weight:bold;">Total: ${money(order.totalAmount)}</p>
        <p style="margin:8px 0 0;color:#6b7280;font-size:13px;">Open your Rentify dashboard to confirm and fulfil it.</p>
      </div>`;

    const tasks = [];
    if (contact.email) {
      tasks.push(
        sendEmail(contact.email, `🛒 New order — ${money(order.totalAmount)}`, html).catch((error) =>
          console.error(`Merchant order email failed (${contact.email}):`, error.message)
        )
      );
    }
    if (contact.telegramChatId) {
      const { text } = formatMerchantOrder(
        order,
        { paymentMethod: order.paymentMethod || "N/A", status: order.paymentStatus || "pending" },
        orderItems
      );
      tasks.push(
        TelegramService.sendDirectMessage(contact.telegramChatId, text).catch((error) =>
          console.error(`Merchant order Telegram message failed (chat ${contact.telegramChatId}):`, error.message)
        )
      );
    }
    if (!tasks.length) {
      console.warn(`Merchant ${contact.id || contact.email || "unknown"} has no email or Telegram — order ${order?.id} notification skipped`);
    }
    await Promise.all(tasks);
  }
}

module.exports = NotificationService;
