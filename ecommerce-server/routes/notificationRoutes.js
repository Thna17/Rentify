const express = require("express");
const router = express.Router();
const telegramController = require("../controllers/telegramController");

router.post("/telegram/webhook", telegramController.handleWebhook);

module.exports = router;