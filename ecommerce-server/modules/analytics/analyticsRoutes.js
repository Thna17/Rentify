'use strict';

const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const controller = require('./analyticsController');
const safe = (handler) => (req, res, next) => Promise.resolve(handler(req, res)).catch(next);

router.post('/events', rateLimit({ windowMs: 60 * 1000, max: 120, standardHeaders: true, legacyHeaders: false }), safe(controller.record));

module.exports = router;
