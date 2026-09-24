import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import {
  apply,
  create,
  flagReviewHandler,
  getMyStores,
  getOrders,
  getProfile,
  getReviews,
  getStore,
  listApplications,
  listStores,
  replyReview,
  reviewApplication,
  updateProfile,
} from './sellers.controller';
import {
  createSellerApplicationSchema,
  createStoreSchema,
  replyToReviewSchema,
  reviewSellerApplicationSchema,
  updateStoreProfileSchema,
} from './sellers.validation';

const router = Router();

// Public — anyone can browse the store directory.
router.get('/stores', listStores);
router.get('/stores/:storeId', getStore);

// Every route below requires a signed-in user. Any authenticated user (not
// just an existing SELLER) may hit these — creating a store is how a BUYER
// becomes a seller in the first place.
router.use(authenticate, authorize('BUYER', 'SELLER', 'ADMIN'));

router.get('/my-stores', getMyStores);
router.post('/my-stores', validate(createStoreSchema), create);
router.get('/my-stores/:storeId', getProfile);
router.put('/my-stores/:storeId/profile', validate(updateStoreProfileSchema), updateProfile);
router.get('/my-stores/:storeId/orders', getOrders);
router.get('/my-stores/:storeId/reviews', getReviews);
router.post('/my-stores/:storeId/reviews/:reviewId/reply', validate(replyToReviewSchema), replyReview);
router.post('/my-stores/:storeId/reviews/:reviewId/flag', flagReviewHandler);

// Applications: any signed-in user can apply; only staff can see the queue
// or decide one.
router.post('/apply', validate(createSellerApplicationSchema), apply);
router.get('/apply', authorize('ADMIN'), listApplications);
router.patch(
  '/apply/:applicationId',
  authorize('ADMIN'),
  validate(reviewSellerApplicationSchema),
  reviewApplication,
);

export default router;
