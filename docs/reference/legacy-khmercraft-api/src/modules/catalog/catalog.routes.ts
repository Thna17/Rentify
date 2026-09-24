import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import {
  create,
  detail,
  list,
  listMine,
  remove,
  update,
} from './catalog.controller';
import {
  createProductSchema,
  updateProductSchema,
} from './catalog.validation';
import { listForProduct } from '../reviews/reviews.controller';

const router = Router();

// Public browsing.
router.get('/', list);

// Literal paths must come before '/:id', which matches anything.
router.get(
  '/mine',
  authenticate,
  authorize('SELLER', 'ADMIN'),
  listMine,
);

router.get('/:id', detail);
router.get('/:id/reviews', listForProduct);

// Sellers manage their own listings. Ownership is enforced in the service,
// not here, because an admin is allowed past it for support work.
router.post(
  '/',
  authenticate,
  authorize('SELLER', 'ADMIN'),
  validate(createProductSchema),
  create,
);

router.patch(
  '/:id',
  authenticate,
  authorize('SELLER', 'ADMIN'),
  validate(updateProductSchema),
  update,
);

router.delete('/:id', authenticate, authorize('SELLER', 'ADMIN'), remove);

export default router;
