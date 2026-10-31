const express = require('express');
const { verifyCoreBuyer } = require('../../../middlewares/authMiddleware');
const payway = require('./paywayGateway');
const service = require('./abaPaywayService');

/**
 * ABA PayWay routes (test-only). With PAYWAY_ENABLED unset every route except /config answers
 * 404, so Release 1 stays COD-only (DEC-026) unless a developer turns it on locally.
 */
const router = express.Router();

const wrap = (handler) => async (req, res, next) => {
  try { await handler(req, res); } catch (error) { next(error); }
};
const requireEnabled = (req, res, next) =>
  payway.isEnabled() ? next() : res.status(404).json({ error: 'ABA PayWay is turned off', code: 'PAYWAY_DISABLED' });
const requireBuyer = (req, res, next) =>
  req.user?.type === 'user' ? next() : res.status(401).json({ error: 'Rentify buyer sign-in required' });

// Lets checkout decide whether to offer ABA at all; reveals nothing but the flag
router.get('/config', (req, res) =>
  res.json({ enabled: payway.isEnabled(), mock: payway.isMock(), currency: payway.PAYWAY_CURRENCY }));

router.post('/checkout', requireEnabled, verifyCoreBuyer, requireBuyer,
  wrap(async (req, res) => res.status(201).json(await service.createCheckout(req.user.id, req.body?.orderId))));

// Polled every few seconds while the QR is on screen
router.get('/status/:orderId', requireEnabled, verifyCoreBuyer, requireBuyer,
  wrap(async (req, res) => res.json(await service.getStatus(req.user.id, req.params.orderId))));

// PAYWAY_MOCK=true only (never in production): pretends the buyer paid in the ABA app
const requireMock = (req, res, next) =>
  payway.isMock() ? next() : res.status(404).json({ error: 'Mock payments are turned off', code: 'PAYWAY_MOCK_DISABLED' });
router.post('/mock/approve/:orderId', requireEnabled, requireMock, verifyCoreBuyer, requireBuyer,
  wrap(async (req, res) => res.json(await service.approveMockPayment(req.user.id, req.params.orderId))));

// PayWay calls this server-to-server; no cookie, and the payload is only a hint to re-check with ABA
router.post('/callback', requireEnabled, express.urlencoded({ extended: false }), wrap(async (req, res) => {
  await service.handleCallback(req.body || {});
  res.json({ received: true });
}));

module.exports = router;
