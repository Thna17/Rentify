import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import { create } from './reviews.controller';
import { createReviewSchema } from './reviews.validation';

const router = Router();

router.use(authenticate);

// Any signed-in role may hit this — eligibility (ownership, delivered order,
// not already reviewed) is enforced in the service, same as order creation.
router.post('/', validate(createReviewSchema), create);

export default router;
