export type ProductEditorVariant = {
  id?: string;
  expectedVersion?: number;
  sku: string;
  price: string;
  stockQuantity: string;
  optionName: string;
  optionValue: string;
  status: 'active' | 'disabled';
};

export type ProductEditorForm = {
  name: string;
  description: string;
  marketplaceCategory: string;
  status: 'draft' | 'active' | 'archived';
  marketplaceVisibility: boolean | null;
  version?: number;
  variants: ProductEditorVariant[];
  images: Array<{ url: string; alt: string }>;
};

export const blankVariant = (): ProductEditorVariant => ({
  sku: '', price: '', stockQuantity: '0', optionName: '', optionValue: '', status: 'active',
});

export const blankProduct = (): ProductEditorForm => ({
  name: '', description: '', marketplaceCategory: '', status: 'draft',
  marketplaceVisibility: null, variants: [blankVariant()], images: [],
});

export function productPayload(form: ProductEditorForm) {
  const variants = form.variants.map((variant) => ({
    ...(variant.id ? { id: variant.id, expectedVersion: variant.expectedVersion } : {}),
    sku: variant.sku.trim(),
    price: Number(variant.price),
    stockQuantity: Number(variant.stockQuantity),
    status: variant.status,
    optionValues: variant.optionName.trim() && variant.optionValue.trim()
      ? { [variant.optionName.trim()]: variant.optionValue.trim() } : {},
  }));
  return {
    name: form.name.trim(), description: form.description.trim(),
    marketplaceCategory: form.marketplaceCategory, status: form.status,
    marketplaceVisibility: form.marketplaceVisibility, images: form.images,
    price: Math.min(...variants.map((variant) => variant.price)),
    stockQuantity: variants.filter((variant) => variant.status === 'active')
      .reduce((sum, variant) => sum + variant.stockQuantity, 0),
    variants,
    ...(form.version === undefined ? {} : { expectedVersion: form.version, replaceVariants: true }),
  };
}

export type ProductPayload = ReturnType<typeof productPayload>;

export function editorStateFor(error: unknown) {
  const status = (error as { status?: number }).status;
  if (status === 401 || status === 403) return 'forbidden' as const;
  if (status === 409) return 'conflict' as const;
  if ((error as Error)?.name === 'TimeoutError') return 'timeout' as const;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return 'offline' as const;
  return 'error' as const;
}
