import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import { addItem, clear, removeItem, show, updateItem } from './cart.controller';
import { addCartItemSchema, updateCartItemSchema } from './cart.validation';

const router = Router();

// A cart always belongs to a signed-in user. Guests keep theirs in
// localStorage on the client; sign-in is where the two are reconciled.
router.use(authenticate);

router.get('/', show);
router.post('/items', validate(addCartItemSchema), addItem);
router.patch('/items/:itemId', validate(updateCartItemSchema), updateItem);
router.delete('/items/:itemId', removeItem);

// Declared before any '/:something' DELETE would be, so 'clear' is never
// swallowed as an item id.
router.delete('/clear', clear);

export default router;
