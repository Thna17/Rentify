import { commerceClient } from '@rentify/shared/api';
import type { ProductEditorForm, ProductPayload } from './productEditorModel';

export type CatalogProduct = {
  id: string;
  name: string;
  description?: string;
  marketplaceCategory: string;
  marketplaceVisibility: boolean | null;
  status: 'draft' | 'active' | 'archived';
  version: number;
  images?: Array<{ url: string; alt?: string }>;
  ProductVariants?: Array<{
    id: string; sku: string; price: string; stockQuantity: number;
    optionValues?: Record<string, string>; status: 'active' | 'disabled'; version: number;
  }>;
};

const timeout = <T>(promise: Promise<T>, milliseconds = 15_000): Promise<T> => Promise.race([
  promise,
  new Promise<never>((_resolve, reject) => window.setTimeout(
    () => reject(new DOMException('Timed out', 'TimeoutError')), milliseconds,
  )),
]);

export const productEditorApi = {
  async categories() {
    const response = await timeout(commerceClient.request<{ categories: string[] }>({
      method: 'GET', path: '/api/marketplace/categories', credentials: 'include',
    }));
    return response.data.categories;
  },
  async get(storeId: string, productId: string) {
    const response = await timeout(commerceClient.request<CatalogProduct>({
      method: 'GET', path: `/api/stores/${storeId}/products/${productId}`, credentials: 'include',
    }));
    return response.data;
  },
  async list(storeId: string) {
    const response = await timeout(commerceClient.request<{ products: CatalogProduct[] }>({
      method: 'GET', path: `/api/stores/${storeId}/products`, credentials: 'include',
    }));
    return response.data.products;
  },
  async save(storeId: string, productId: string | undefined, body: ProductPayload) {
    const response = await timeout(commerceClient.request<CatalogProduct>({
      method: productId ? 'PATCH' : 'POST',
      path: productId ? `/api/stores/${storeId}/products/${productId}` : `/api/stores/${storeId}/products`,
      body, credentials: 'include',
    }));
    return response.data;
  },
  async update(storeId: string, productId: string, body: Record<string, unknown>) {
    const response = await timeout(commerceClient.request<CatalogProduct>({
      method: 'PATCH', path: `/api/stores/${storeId}/products/${productId}`,
      body, credentials: 'include',
    }));
    return response.data;
  },
};

export function toEditorForm(product: CatalogProduct): ProductEditorForm {
  return {
    name: product.name,
    description: product.description || '',
    marketplaceCategory: product.marketplaceCategory || '',
    marketplaceVisibility: product.marketplaceVisibility,
    status: product.status,
    version: product.version,
    images: (product.images || []).map((image) => ({ url: image.url, alt: image.alt || '' })),
    variants: (product.ProductVariants || []).map((variant) => {
      const option = Object.entries(variant.optionValues || {})[0] || ['', ''];
      return {
        id: variant.id, expectedVersion: variant.version, sku: variant.sku,
        price: String(variant.price), stockQuantity: String(variant.stockQuantity),
        optionName: option[0], optionValue: option[1], status: variant.status,
      };
    }),
  };
}
