import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import {
  create,
  detail,
  listForSeller,
  listMine,
  transition,
} from './orders.controller';
import { createOrderSchema, transitionOrderSchema } from './orders.validation';

const router = Router();

router.use(authenticate);

router.post('/', validate(createOrderSchema), create);

// Literal paths must precede '/:id', or they are read as order ids.
router.get('/my-orders', listMine);
router.get('/seller', authorize('SELLER', 'ADMIN'), listForSeller);

router.get('/:id', detail);

// Accept, reject, ship, deliver and cancel all run through here. Who may make
// which move is enforced in order-lifecycle.ts, not by the route.
router.patch('/:id/status', validate(transitionOrderSchema), transition);

export default router;
