const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");
const { ECOMMERCE_API_BASE } = require("../config/serviceUrls");
const { generateOtp } = require("../utils/otpUtils");
const { ApiError } = require("../utils/errors");

class TelegramService {
  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN;
    this.bot = new TelegramBot(this.botToken, { polling: false });
    this.apiUrl = `https://api.telegram.org/bot${this.botToken}`;
    this.setupHandlers();
  }

  setupWebhook(app) {
    const webhookPath = `/telegram/${process.env.SERVER_TYPE}`;
    const webhookUrl = `${process.env.BASE_URL}${webhookPath}`;

    // Route to receive updates from Telegram
    app.post(webhookPath, (req, res) => {
      this.bot.processUpdate(req.body);
      res.sendStatus(200);
    });

    // Register webhook with Telegram
    this.bot.setWebHook(webhookUrl);
  }

  setupHandlers() {
    this.bot.onText(/\/start/, this.handleStart.bind(this));
    this.bot.on("contact", this.handleContact.bind(this));
    this.bot.on("callback_query", this.handleCallback.bind(this));
  }

  async handleStart(msg) {
    const chatId = msg.chat.id;
    await this.bot.sendMessage(
      chatId,
      "Please share your phone number to link your account",
      {
        reply_markup: {
          keyboard: [[{ text: "Share Phone Number", request_contact: true }]],
          one_time_keyboard: true,
        },
      }
    );
  }

  async handleContact(msg) {
    const chatId = msg.chat.id;
    const phoneNumber = msg.contact.phone_number;
    const telegramUserId = msg.from.id;
    const userType = process.env.SERVER_TYPE;

    try {
      const user = await this.findUser(phoneNumber, userType);

      if (user) {
        await this.updateUserTelegram(user, telegramUserId, chatId);

        if (!user.isVerified) {
          await this.sendVerificationOtp(user, chatId);
        }
      } else {
        await this.bot.sendMessage(
          chatId,
          "Phone number not registered. Please sign up first."
        );
      }
    } catch (error) {
      console.error("Contact error:", error);
      await this.bot.sendMessage(
        chatId,
        "Error processing your request. Please try again."
      );
    }
  }

  async findUser(phoneNumber, userType) {
    const model =
      userType === "merchant"
        ? require("../models/User")
        : require("../models/Customer");

    return model.findOne({ where: { phoneNumber } });
  }

  async updateUserTelegram(user, telegramUserId, chatId) {
    await user.update({
      telegramChatId: chatId,
      telegramUserId,
      telegramLinkedAt: new Date(),
    });
  }

  async sendVerificationOtp(user, chatId) {
    const otp = generateOtp();
    await user.update({
      otp,
      otpExpires: new Date(Date.now() + 10 * 60 * 1000),
    });
    await this.bot.sendMessage(
      chatId,
      `Your verification code is: ${otp}\n\nPlease enter this code on our website.`
    );
  }

  async sendDirectMessage(chatId, message, options = {}) {
    try {
      await this.bot.sendMessage(chatId, message, {
        parse_mode: "Markdown",
        ...options,
      });
    } catch (error) {
      console.error("Telegram send error:", error);
      throw new ApiError(500, "Failed to send Telegram message");
    }
  }

  async handleCallback(callbackQuery) {
    const data = callbackQuery.data;

    if (data.startsWith("customer_cancel:")) {
      await this.handleCustomerCancel(callbackQuery);
    } else if (data.startsWith("confirm:") || data.startsWith("cancel:")) {
      await this.handleMerchantAction(callbackQuery);
    } else {
      await this.bot.answerCallbackQuery(callbackQuery.id, {
        text: "Unknown action",
        show_alert: true,
      });
    }
  }

  async handleCustomerCancel(callbackQuery) {
    const orderId = callbackQuery.data.split(":")[1];
    const chatId = callbackQuery.message.chat.id;

    try {
      await axios.post(
        `${ECOMMERCE_API_BASE}/api/merchant/orders/${orderId}/process`,
        { action: "cancelled" }
      );

      await this.bot.answerCallbackQuery(callbackQuery.id, {
        text: "❌ Order cancelled successfully",
      });

      await this.bot.editMessageReplyMarkup(
        { inline_keyboard: [] },
        { chat_id: chatId, message_id: callbackQuery.message.message_id }
      );

      await this.bot.sendMessage(
        chatId,
        `Your order #${orderId} has been cancelled.`,
        { parse_mode: "Markdown" }
      );
    } catch (error) {
      console.error("Customer cancellation error:", error);
      await this.bot.answerCallbackQuery(callbackQuery.id, {
        text: `❌ Error: ${error.response?.data?.error || error.message}`,
        show_alert: true,
      });
    }
  }

  async handleMerchantAction(callbackQuery) {
    const [action, orderId] = callbackQuery.data.split(":");
    const chatId = callbackQuery.message.chat.id;

    try {
      await axios.post(
        `${ECOMMERCE_API_BASE}/api/merchant/orders/${orderId}/process`,
        { action }
      );

      await this.bot.answerCallbackQuery(callbackQuery.id, {
        text:
          action === "confirm" ? "✅ Order confirmed!" : "❌ Order cancelled!",
      });

      await this.bot.editMessageReplyMarkup(
        { inline_keyboard: [] },
        { chat_id: chatId, message_id: callbackQuery.message.message_id }
      );

      await this.bot.sendMessage(
        chatId,
        action === "confirm"
          ? `Order #${orderId} confirmed successfully!`
          : `Order #${orderId} cancelled.`,
        { parse_mode: "Markdown" }
      );
    } catch (error) {
      console.error("Merchant action error:", error);
      await this.bot.answerCallbackQuery(callbackQuery.id, {
        text: `❌ Error: ${error.response?.data?.error || error.message}`,
        show_alert: true,
      });
    }
  }
}

module.exports = new TelegramService();
