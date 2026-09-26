const TelegramService = require("./telegramService");

exports.handleWebhook = async (req, res) => {
  try {
    await TelegramService.handleWebhook(req.body);
    res.sendStatus(200);
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};