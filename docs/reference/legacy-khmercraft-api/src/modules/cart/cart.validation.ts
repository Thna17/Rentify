import { z } from 'zod';

export const addCartItemSchema = z
  .object({
    productId: z.string().trim().min(1),
    quantity: z.number().int().min(1).max(999).default(1),
  })
  .strict();

export const updateCartItemSchema = z
  .object({
    quantity: z.number().int().min(1).max(999),
  })
  .strict();

export type AddCartItemInput = z.infer<typeof addCartItemSchema>;
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;
