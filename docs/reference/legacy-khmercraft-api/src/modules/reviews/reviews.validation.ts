import { z } from 'zod';

/**
 * Note what is absent: `verifiedPurchase`, `buyerId`, `buyerName`, `sellerId`,
 * `productName`. All of those are derived server-side from the order the
 * caller actually owns — accepting any of them from the client would let a
 * review claim a purchase that never happened.
 */
export const createReviewSchema = z
  .object({
    orderId: z.string().trim().min(1),
    productId: z.string().trim().min(1),
    rating: z.number().int().min(1).max(5),
    comment: z.string().trim().min(1).max(2000),
    images: z.array(z.string().trim().url().max(2048)).max(6).optional(),
  })
  .strict();

export type CreateReviewInput = z.infer<typeof createReviewSchema>;

const MAX_LIMIT = 50;

export const listProductReviewsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(10),
    sort: z.enum(['newest', 'oldest', 'highest', 'lowest']).default('newest'),
  })
  .strip();

export type ListProductReviewsQuery = z.infer<typeof listProductReviewsQuerySchema>;
