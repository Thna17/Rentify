import { z } from 'zod';

export const PRODUCT_SORTS = [
  'newest',
  'price-low',
  'price-high',
  'rating',
  'popular',
] as const;

export const COLLECTIONS = [
  'top-picks',
  'handmade-crafts',
  'agro-products',
  'best-sellers',
  'new-arrivals',
  'under-5',
] as const;

export type ProductSort = (typeof PRODUCT_SORTS)[number];
export type Collection = (typeof COLLECTIONS)[number];

/** Categories a collection expands to. */
export const COLLECTION_CATEGORIES: Partial<Record<Collection, string[]>> = {
  'handmade-crafts': [
    'Handmade Crafts',
    'Pottery',
    'Weaving',
    'Bamboo Products',
  ],
  'agro-products': [
    'Rice Products',
    'Palm Sugar',
    'Local Food',
    'Dried Fruits',
  ],
};

const MAX_LIMIT = 60;

/**
 * Query strings arrive as strings, so every numeric field is coerced and
 * bounded here rather than trusted downstream. An out-of-range `limit` is the
 * classic way to turn a public list endpoint into a denial-of-service.
 */
export const listProductsQuerySchema = z
  .object({
    search: z.string().trim().max(120).optional(),
    category: z.string().trim().max(80).optional(),
    subcategory: z.string().trim().max(80).optional(),
    storeId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
    location: z.string().trim().max(80).optional(),
    collection: z.enum(COLLECTIONS).optional(),
    priceMin: z.coerce.number().min(0).max(1_000_000).optional(),
    priceMax: z.coerce.number().min(0).max(1_000_000).optional(),
    sort: z.enum(PRODUCT_SORTS).default('newest'),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(12),
    status: z.enum(['ACTIVE', 'DRAFT', 'ARCHIVED']).optional(),
  })
  .strip()
  .refine(
    (query) =>
      query.priceMin === undefined ||
      query.priceMax === undefined ||
      query.priceMin <= query.priceMax,
    { message: 'priceMin cannot be greater than priceMax', path: ['priceMin'] },
  );

export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;

/**
 * Note what the server never trusts from the request: `sellerName`,
 * `sellerId`, `sellerUserId`. Any signed-in seller could otherwise publish a
 * product attributed to someone else's store, or one that reaches nobody's
 * order desk. `catalog.service.ts#createProduct` always overwrites these
 * from the authenticated seller's own session/Store — `.strip()` here just
 * means the seller dashboard sending its own copy of them (it needs its own
 * state for the form) is dropped rather than 422ing the whole request.
 *
 * `image`/`images` accept more than a hosted URL because the dashboard's
 * upload control reads the file client-side and submits a base64 data URI —
 * there is no image-hosting step in this deployment yet.
 */
export const createProductSchema = z
  .object({
    name: z.string().trim().min(2).max(200),
    description: z.string().trim().max(4000).optional(),
    price: z.number().positive().max(1_000_000),
    compareAtPrice: z.number().positive().max(1_000_000).nullable().optional(),
    category: z.string().trim().min(2).max(80),
    subcategory: z.string().trim().max(80).nullable().optional(),
    sellerName: z.string().trim().max(120).optional(),
    storeName: z.string().trim().max(120).optional(),
    storeId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
    location: z.string().trim().max(80).optional(),
    image: z.string().trim().max(5_000_000).optional(),
    images: z.array(z.string().trim().max(5_000_000)).max(10).optional(),
    variants: z
      .array(
        z.object({
          label: z.string().trim().min(1).max(60),
          image: z.string().trim().min(1).max(5_000_000),
        }),
      )
      .max(12)
      .optional(),
    stock: z.number().int().min(0).max(1_000_000).default(0),
    status: z.enum(['ACTIVE', 'DRAFT', 'ARCHIVED']).default('ACTIVE'),
    sellerId: z.string().optional(),
  })
  .strip();

export type CreateProductInput = z.infer<typeof createProductSchema>;

/**
 * Every field optional — a seller fixing a typo should not have to resend the
 * whole listing. Ownership fields are still never trusted from the body (see
 * above): a product cannot be reassigned to another seller through an edit.
 */
export const updateProductSchema = z
  .object({
    name: z.string().trim().min(2).max(200).optional(),
    description: z.string().trim().max(4000).optional(),
    price: z.number().positive().max(1_000_000).optional(),
    compareAtPrice: z.number().positive().max(1_000_000).nullable().optional(),
    category: z.string().trim().min(2).max(80).optional(),
    subcategory: z.string().trim().max(80).nullable().optional(),
    sellerName: z.string().trim().min(2).max(120).optional(),
    storeName: z.string().trim().max(120).optional(),
    location: z.string().trim().max(80).optional(),
    image: z.string().trim().max(5_000_000).nullable().optional(),
    images: z.array(z.string().trim().max(5_000_000)).max(10).optional(),
    variants: z
      .array(
        z.object({
          label: z.string().trim().min(1).max(60),
          image: z.string().trim().min(1).max(5_000_000),
        }),
      )
      .max(12)
      .optional(),
    stock: z.number().int().min(0).max(1_000_000).optional(),
    status: z.enum(['ACTIVE', 'DRAFT', 'ARCHIVED']).optional(),
  })
  .strip()
  .refine((body) => Object.keys(body).length > 0, {
    message: 'Provide at least one field to update',
  });

export type UpdateProductInput = z.infer<typeof updateProductSchema>;
