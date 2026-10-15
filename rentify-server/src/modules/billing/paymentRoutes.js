const express = require('express');
const router = express.Router();
const paymentController = require('./paymentController');

const { verifyToken } = require('../../middlewares/auth');

router.post('/khqr', verifyToken, paymentController.initiateKHQRPayment);
router.get('/status/:paymentId', verifyToken, paymentController.checkPaymentStatus);

module.exports = router;