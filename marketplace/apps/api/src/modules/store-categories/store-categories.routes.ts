import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import {
  addSubcategory,
  create,
  listOwner,
  listPublic,
  remove,
  removeSubcategory,
  reorder,
  reorderSubcategories,
  update,
  updateSubcategory,
} from './store-categories.controller';
import {
  createStoreCategorySchema,
  createSubcategorySchema,
  reorderSchema,
  updateStoreCategorySchema,
  updateSubcategorySchema,
} from './store-categories.validation';

const router = Router();

// Public — a shopper browsing a store sees its (visible) category tree.
router.get('/stores/:storeId', listPublic);

// Everything below is the seller managing their own store's categories.
router.use(authenticate, authorize('BUYER', 'SELLER', 'ADMIN'));

router.get('/my-stores/:storeId', listOwner);
router.post('/my-stores/:storeId', validate(createStoreCategorySchema), create);
router.patch('/my-stores/:storeId/reorder', validate(reorderSchema), reorder);
router.patch('/my-stores/:storeId/:categoryId', validate(updateStoreCategorySchema), update);
router.delete('/my-stores/:storeId/:categoryId', remove);

router.post(
  '/my-stores/:storeId/:categoryId/subcategories',
  validate(createSubcategorySchema),
  addSubcategory,
);
router.patch(
  '/my-stores/:storeId/:categoryId/subcategories/reorder',
  validate(reorderSchema),
  reorderSubcategories,
);
router.patch(
  '/my-stores/:storeId/:categoryId/subcategories/:subcategoryId',
  validate(updateSubcategorySchema),
  updateSubcategory,
);
router.delete(
  '/my-stores/:storeId/:categoryId/subcategories/:subcategoryId',
  removeSubcategory,
);

export default router;
