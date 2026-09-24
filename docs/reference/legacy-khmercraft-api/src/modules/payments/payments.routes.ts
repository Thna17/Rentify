import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import { createPaywayCheckout, paywayCallback } from './payments.controller';
import { createPaywayCheckoutSchema } from './payments.validation';

const router = Router();

router.post(
  '/aba-payway/checkout',
  authenticate,
  validate(createPaywayCheckoutSchema),
  createPaywayCheckout,
);

// PayWay calls this directly — no cookie, so no `authenticate` here.
router.post('/aba-payway/callback', paywayCallback);

export default router;
