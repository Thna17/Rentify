const TelegramService = require("../services/telegramService");
const { sendEmail } = require("../services/emailService");
const { formatMerchantOrder, formatCustomerOrder } = require("../services/messageFormatters");

class NotificationService {
  constructor(userType) {
    this.userType = userType; // 'merchant' or 'customer'
    this.telegramService = TelegramService;
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
      return this.telegramService.sendDirectMessage(options.chatId, message, options);
    }
    throw new Error("Telegram chat is not linked to this account");
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
}

module.exports = NotificationService;
