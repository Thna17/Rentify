import { z } from 'zod';

const imageValue = z
  .string()
  .trim()
  .max(5_000_000)
  .refine(
    (value) => /^https?:\/\//i.test(value) || /^data:image\/[a-z0-9.+-]+;base64,/i.test(value),
    'Use an image URL or an uploaded image',
  );

/** Every field optional — a seller fixing one thing shouldn't have to resend the whole profile. */
export const updateStoreProfileSchema = z
  .object({
    storeName: z.string().trim().min(2).max(120).optional(),
    storeDescription: z.string().trim().max(2000).optional(),
    storeTagline: z.string().trim().max(160).optional(),
    announcement: z.string().trim().max(120).optional(),
    theme: z.enum(['FOREST', 'CLAY', 'GOLD', 'MIDNIGHT']).optional(),
    showContact: z.boolean().optional(),
    featuredProductIds: z.array(z.string().regex(/^[a-f\d]{24}$/i)).max(12).optional(),
    location: z.string().trim().max(80).optional(),
    phoneNumber: z.string().trim().max(30).optional(),
    logoUrl: imageValue.optional(),
    bannerUrl: imageValue.optional(),
  })
  .strict()
  .refine((body) => Object.keys(body).length > 0, {
    message: 'Provide at least one field to update',
  });

export type UpdateStoreProfileInput = z.infer<typeof updateStoreProfileSchema>;

/**
 * Creating a store is how a BUYER becomes a SELLER — subscriptionPlan and
 * paymentMethod are the plan-selection step of that same onboarding flow,
 * not a separate action, so they live on this one schema.
 */
export const createStoreSchema = z
  .object({
    storeName: z.string().trim().min(2).max(120),
    storeDescription: z.string().trim().max(2000).optional(),
    location: z.string().trim().max(80).optional(),
    phoneNumber: z.string().trim().max(30).optional(),
    category: z.string().trim().max(80).optional(),
    subscriptionPlan: z.enum(['STARTER', 'STANDARD', 'PREMIUM']).optional(),
    paymentMethod: z.enum(['ABA', 'STRIPE', 'FREE']).optional(),
  })
  .strict();

export type CreateStoreInput = z.infer<typeof createStoreSchema>;

const MAX_LIMIT = 60;

export const listStoresQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(20),
  })
  .strip();

export type ListStoresQuery = z.infer<typeof listStoresQuerySchema>;

// ------------------------------------------------------------ applications

export const createSellerApplicationSchema = z
  .object({
    firstName: z.string().trim().min(1).max(60),
    lastName: z.string().trim().min(1).max(60),
    phoneNumber: z.string().trim().min(8).max(30),
    province: z.string().trim().min(1).max(60),
    primaryCategory: z.string().trim().min(1).max(80),
  })
  .strict();

export type CreateSellerApplicationInput = z.infer<typeof createSellerApplicationSchema>;

/** A rejection needs a reason; an approval and a "start reviewing" don't. */
export const reviewSellerApplicationSchema = z
  .object({
    decision: z.enum(['UNDER_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED']),
    rejectionReason: z.string().trim().min(1).max(500).optional(),
    adminNotes: z.string().trim().max(2000).optional(),
  })
  .strict()
  .refine(
    (body) => body.decision !== 'REJECTED' || !!body.rejectionReason,
    { message: 'rejectionReason is required when rejecting an application', path: ['rejectionReason'] },
  );

export type ReviewSellerApplicationInput = z.infer<typeof reviewSellerApplicationSchema>;

// ------------------------------------------------------------------ orders

export const ORDER_DATE_RANGES = ['7d', '30d', 'month'] as const;

export const listStoreOrdersQuerySchema = z
  .object({
    search: z.string().trim().max(120).optional(),
    status: z.enum(['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED']).optional(),
    dateRange: z.enum(ORDER_DATE_RANGES).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(10),
  })
  .strip();

export type ListStoreOrdersQuery = z.infer<typeof listStoreOrdersQuerySchema>;

// ----------------------------------------------------------------- reviews

export const listStoreReviewsQuerySchema = z
  .object({
    rating: z.coerce.number().int().min(1).max(5).optional(),
    sort: z.enum(['newest', 'oldest']).default('newest'),
  })
  .strip();

export type ListStoreReviewsQuery = z.infer<typeof listStoreReviewsQuerySchema>;

export const replyToReviewSchema = z
  .object({
    response: z.string().trim().min(1).max(2000),
  })
  .strict();

export type ReplyToReviewInput = z.infer<typeof replyToReviewSchema>;
