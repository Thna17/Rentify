import { z } from 'zod';
import { ORDER_STATUSES, PAYMENT_METHODS } from '../../../models/Order';

export const deliveryInfoSchema = z
  .object({
    fullName: z.string().trim().min(2).max(120),
    phone: z.string().trim().min(6).max(30),
    province: z.string().trim().min(2).max(80),
    city: z.string().trim().min(2).max(80),
    address: z.string().trim().min(4).max(300),
    note: z.string().trim().max(500).optional(),
  })
  .strict();

/**
 * Note what is absent: subtotal, deliveryFee and totalAmount.
 *
 * The client does not get to state what an order costs. Every amount is
 * recomputed from the database at checkout, so a tampered payload cannot buy
 * anything cheaply. Sending them is rejected outright by `.strict()`.
 */
export const createOrderSchema = z
  .object({
    // Omit `items` to check out the server-side cart, which is the normal path.
    items: z
      .array(
        z
          .object({
            productId: z.string().trim().min(1),
            quantity: z.number().int().min(1).max(999),
          })
          .strict(),
      )
      .min(1)
      .max(50)
      .optional(),
    deliveryInfo: deliveryInfoSchema,
    paymentMethod: z.enum(PAYMENT_METHODS),
  })
  .strict();

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const listOrdersQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10),
    status: z.enum(ORDER_STATUSES).optional(),
  })
  .strip();

/**
 * A status change carries only the target status and an optional note.
 *
 * Which moves are legal, and who may make them, is decided server-side in
 * order-lifecycle.ts — the client cannot nominate itself as an admin, and
 * cannot skip a step by asking for one.
 */
export const transitionOrderSchema = z
  .object({
    status: z.enum(ORDER_STATUSES),
    note: z.string().trim().max(500).optional(),
  })
  .strict();

export type TransitionOrderInput = z.infer<typeof transitionOrderSchema>;
