import { Router } from 'express';
import { listCategories, listSellers } from './taxonomy.service';

/**
 * Public reference data. Both are read-only and unauthenticated: the category
 * tree and the seller directory are part of the storefront's navigation.
 */
const router = Router();

router.get('/categories', async (_request, response) => {
  response.json(await listCategories());
});

router.get('/sellers', async (_request, response) => {
  response.json(await listSellers());
});

export default router;
