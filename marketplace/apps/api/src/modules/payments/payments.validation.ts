import { z } from 'zod';

export const createPaywayCheckoutSchema = z
  .object({
    orderId: z.string().trim().min(1),
  })
  .strict();

export type CreatePaywayCheckoutInput = z.infer<typeof createPaywayCheckoutSchema>;
