const express = require('express');
const router = express.Router();
const paymentController = require('./paymentController');

const { verifyToken } = require('../../middlewares/auth');

router.post('/khqr', verifyToken, paymentController.initiateKHQRPayment);
router.get('/status/:paymentId', verifyToken, paymentController.checkPaymentStatus);

// P3-PAY-002: Signed CutLuy Webhook Ingestion Endpoint
router.post('/cutluy/webhook', async (req, res, next) => {
  try {
    const { getCutluyConfig } = require('../../config/cutluyConfig');
    const { cutluyWebhookService } = require('./index');
    const config = getCutluyConfig();

    const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body || {}));
    const result = await cutluyWebhookService.handleWebhook({
      rawBody,
      headers: req.headers,
      webhookSecret: config.webhookSecret || process.env.CUTLUY_WEBHOOK_SECRET,
      accountRef: config.subscriptionAccountRef || process.env.CUTLUY_SUBSCRIPTION_ACCOUNT_REF || 'rentify_corp_sub_ref',
      accountType: 'subscription',
      toleranceSeconds: config.webhookToleranceSeconds,
    });

    return res.status(200).json(result);
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message, code: error.code });
    }
    return next(error);
  }
});

module.exports = router;