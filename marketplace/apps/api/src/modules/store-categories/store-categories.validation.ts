import { z } from 'zod';

const imageValue = z
  .string()
  .trim()
  .max(5_000_000)
  .refine(
    (value) => /^https?:\/\//i.test(value) || /^data:image\/[a-z0-9.+-]+;base64,/i.test(value),
    'Use an image URL or an uploaded image',
  );

export const createStoreCategorySchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    description: z.string().trim().max(500).optional(),
    imageUrl: imageValue.optional(),
  })
  .strict();

export type CreateStoreCategoryInput = z.infer<typeof createStoreCategorySchema>;

/** Every field optional — renaming a category shouldn't require resending it whole. */
export const updateStoreCategorySchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    description: z.string().trim().max(500).nullable().optional(),
    imageUrl: imageValue.nullable().optional(),
    visible: z.boolean().optional(),
    sortOrder: z.number().int().min(0).optional(),
  })
  .strict()
  .refine((body) => Object.keys(body).length > 0, {
    message: 'Provide at least one field to update',
  });

export type UpdateStoreCategoryInput = z.infer<typeof updateStoreCategorySchema>;

export const createSubcategorySchema = z
  .object({
    name: z.string().trim().min(1).max(80),
  })
  .strict();

export type CreateSubcategoryInput = z.infer<typeof createSubcategorySchema>;

export const updateSubcategorySchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    visible: z.boolean().optional(),
    sortOrder: z.number().int().min(0).optional(),
  })
  .strict()
  .refine((body) => Object.keys(body).length > 0, {
    message: 'Provide at least one field to update',
  });

export type UpdateSubcategoryInput = z.infer<typeof updateSubcategorySchema>;

/** Bulk reorder: the full ordered list of ids, applied as the new sortOrder. */
export const reorderSchema = z
  .object({
    orderedIds: z.array(z.string().regex(/^[a-f\d]{24}$/i)).min(1).max(200),
  })
  .strict();

export type ReorderInput = z.infer<typeof reorderSchema>;
