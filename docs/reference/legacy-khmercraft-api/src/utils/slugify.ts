/**
 * Derive a URL slug from a display name.
 *
 * Shared by Product and Store — both need the same "human-readable, unique,
 * never a raw Mongo id" identifier, so this lives in one place rather than
 * being copied per model.
 */
export const slugify = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
