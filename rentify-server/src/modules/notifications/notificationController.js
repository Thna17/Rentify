// controllers/notificationController.js (Port 3001)
const TelegramService = require("./telegramService");
const { Website, User } = require("../../models");
const NotificationService = require("./notificationService");
const { ecommerceApiUrl } = require("../../config/runtimeUrls");
// const merchantNotifier = new NotificationService("merchant");

exports.sendMerchantNotification = async (req, res) => {
  try {
    const { websiteId, message, options } = req.body;

    const website = await Website.findByPk(websiteId, {
      include: [
        {
          model: User,
          attributes: ["telegramChatId"],
        },
      ],
    });

    if (!website || !website.User || !website.User.telegramChatId) {
      return res
        .status(404)
        .json({ error: "Merchant Telegram not configured" });
    }

    await TelegramService.sendDirectMessage(
      website.User.telegramChatId,
      message,
      options
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Add this to handle merchant-specific callback queries
exports.handleMerchantCallback = async (req, res) => {
  try {
    const { callbackQuery } = req.body;
    await TelegramService.handleCallbackQuery(callbackQuery);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.handleOrderNotification = async (req, res) => {
  try {
    const { type, order, payment, orderItems, websiteId, initiator } = req.body;
    const website = await Website.findByPk(websiteId, { include: [User] });

    // if (!website?.User?.telegramChatId) {
    //   return res.status(404).json({ error: "Merchant not configured for Telegram" });
    // }

      const notificationService = new NotificationService("merchant");
    let message, options;
    
    switch (type) {
      case "new_order":
        ({ text: message, reply_markup: options } = notificationService.formatOrder(
          order,
          payment,
          orderItems
        ));
        break;
      
      case "order_cancelled":
        message = `❌ Order #${order.id} cancelled by ${initiator === "customer" ? "customer" : "merchant"}`;
        break;
      
      default:
        return res.status(400).json({ error: "Invalid notification type" });
    }

    await notificationService.send({
      channel: "telegram",
      recipient: website.User.id,
      message,
      options: {
        chatId: website.User.telegramChatId,
        ...(options && { reply_markup: options })
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Notification error:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.processOrder = async (req, res) => {
  const { orderId } = req.params;
  const { action } = req.body;
  
  try {
    // ... existing order processing logic ...
    
    // Notify customer if action is cancellation
    if (action === "cancel") {
      await axios.post(`${ecommerceApiUrl}/api/notifications/orders`, {
        type: "order_cancelled",
        orderId,
        initiator: "merchant"
      });
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
