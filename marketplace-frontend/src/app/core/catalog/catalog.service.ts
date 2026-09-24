import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  CATEGORIES,
  classifyCategory,
  findCategory,
  subcategorySlug,
} from '../data/categories.data';
import { Category, Product, ProductQuery, StockStatus, Store } from './catalog.models';
import {
  RentifyMarketplaceService,
  RentifyProduct,
  RentifyStore,
} from '../rentify/rentify-marketplace.service';

/**
 * The catalog the UI reads.
 *
 * Reconnected to Rentify Core and Commerce APIs via RentifyMarketplaceService.
 * Products and stores come from Rentify and are held in signals, so
 * every derived view (homepage rails, the products grid, related items,
 * the store directory) recomputes when they load.
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly rentify = inject(RentifyMarketplaceService);

  private readonly products = signal<Product[]>([]);
  private readonly _stores = signal<Store[]>([]);
  readonly loaded = signal(false);
  readonly storesLoaded = signal(false);
  readonly productError = signal('');
  readonly storeError = signal('');

  readonly categories: Category[] = CATEGORIES;

  constructor() {
    void this.load();
    void this.loadStores();
  }

  /** Live store list. */
  get stores(): Store[] {
    return this._stores();
  }

  allStores(): Store[] {
    return this._stores();
  }

  /** Fetch the whole catalog from Rentify Commerce and Core APIs. */
  async load(): Promise<void> {
    this.loaded.set(false);
    this.productError.set('');
    try {
      const first = await firstValueFrom(this.rentify.products({ page: 1, limit: 60 }));
      const all: RentifyProduct[] = [...(first.products || [])];
      const totalPages = Math.ceil((first.total || 0) / (first.limit || 60));
      for (let page = 2; page <= totalPages && page <= 5; page += 1) {
        try {
          const next = await firstValueFrom(this.rentify.products({ page, limit: 60 }));
          all.push(...(next.products || []));
        } catch {
          break;
        }
      }

      const storeIds = [
        ...new Set(
          all
            .map((p) => p.storeId)
            .filter((id): id is string => Boolean(id) && UUID_REGEX.test(id)),
        ),
      ].slice(0, 60);
      let storeMap = new Map<string, RentifyStore>();
      if (storeIds.length > 0) {
        try {
          const storeRes = await firstValueFrom(this.rentify.stores(storeIds));
          const storesList = storeRes.data || [];
          storeMap = new Map(storesList.map((s) => [s.id, s]));
          this._stores.set(storesList.map(toStoreFromRentify));
          this.storesLoaded.set(true);
        } catch {
          // Store fetching failure is non-fatal for catalog display
        }
      }

      this.products.set(all.map((p) => toProductFromRentify(p, storeMap)));
    } catch {
      this.products.set([]);
      this.productError.set(
        'We could not load the marketplace right now. Please try again.',
      );
    } finally {
      this.loaded.set(true);
    }
  }

  /** Fetch the store directory once from Rentify Core API. */
  async loadStores(): Promise<void> {
    this.storesLoaded.set(false);
    this.storeError.set('');
    try {
      let storeIds = [
        ...new Set(
          this.products()
            .map((p) => p.storeId)
            .filter((id): id is string => Boolean(id) && UUID_REGEX.test(id)),
        ),
      ].slice(0, 60);
      if (storeIds.length === 0) {
        try {
          const res = await firstValueFrom(this.rentify.products({ page: 1, limit: 60 }));
          storeIds = [
            ...new Set(
              (res.products || [])
                .map((p) => p.storeId)
                .filter((id): id is string => Boolean(id) && UUID_REGEX.test(id)),
            ),
          ].slice(0, 60);
        } catch {
          // ignore
        }
      }
      if (storeIds.length > 0) {
        const response = await firstValueFrom(this.rentify.stores(storeIds));
        this._stores.set((response.data || []).map(toStoreFromRentify));
      } else {
        this._stores.set([]);
      }
    } catch {
      this._stores.set([]);
      this.storeError.set(
        'We could not load stores right now. Please try again.',
      );
    } finally {
      this.storesLoaded.set(true);
    }
  }

  allProducts(): Product[] {
    return this.products();
  }

  /** Loads all products for a given store. */
  async productsForStore(storeId: string): Promise<Product[]> {
    try {
      const first = await firstValueFrom(this.rentify.products({ storeId, page: 1, limit: 60 }));
      const all: RentifyProduct[] = [...(first.products || [])];
      let store = this._stores().find((s) => s.id === storeId);
      const storeMap = new Map<string, RentifyStore>();
      if (store) {
        storeMap.set(storeId, {
          id: store.id,
          name: store.name,
          slug: store.slug || store.id,
          primaryCategory: store.categoryName,
        });
      }
      return all.map((p) => toProductFromRentify(p, storeMap));
    } catch {
      return this.products().filter((p) => p.storeId === storeId);
    }
  }

  productById(id: string): Product | undefined {
    return this.products().find(
      (product) => product.id === id || product.slug === id,
    );
  }

  /** Load a single product by ID from Rentify Commerce API, ensuring deep links resolve. */
  async loadProduct(id: string): Promise<Product | null> {
    const existing = this.productById(id);
    if (existing) return existing;
    try {
      const p = await firstValueFrom(this.rentify.product(id));
      const storeMap = new Map<string, RentifyStore>();
      if (p.storeId && UUID_REGEX.test(p.storeId)) {
        try {
          const storeRes = await firstValueFrom(this.rentify.stores([p.storeId]));
          if (storeRes.data?.[0]) storeMap.set(p.storeId, storeRes.data[0]);
        } catch {
          // ignore
        }
      }
      const mapped = toProductFromRentify(p, storeMap);
      this.products.update((current) => {
        if (current.some((x) => x.id === mapped.id)) return current;
        return [...current, mapped];
      });
      return mapped;
    } catch {
      return null;
    }
  }

  productsByIds(ids: readonly string[]): Product[] {
    return ids
      .map((id) => this.productById(id))
      .filter((product): product is Product => Boolean(product));
  }

  category(slug: string): Category | undefined {
    return findCategory(slug);
  }

  store(id: string): Store | undefined {
    return this._stores().find((candidate) => candidate.id === id || candidate.slug === id);
  }

  storeById(id: string): Store | undefined {
    return this.store(id);
  }

  /** Load a single store by ID from Rentify Core API, ensuring deep links resolve. */
  async loadStore(id: string): Promise<Store | null> {
    const existing = this.store(id);
    if (existing) return existing;
    if (!UUID_REGEX.test(id)) return null;
    try {
      const res = await firstValueFrom(this.rentify.store(id));
      if (!res?.data) return null;
      const mapped = toStoreFromRentify(res.data);
      this._stores.update((current) => {
        if (current.some((x) => x.id === mapped.id)) return current;
        return [...current, mapped];
      });
      return mapped;
    } catch {
      return null;
    }
  }

  productsByStore(storeId: string): Product[] {
    return this.products().filter((product) => product.storeId === storeId);
  }

  countByCategory(slug: string): number {
    return this.products().filter((product) => product.categorySlug === slug)
      .length;
  }

  /** Product count for a sub-category, used by the chips and filter list. */
  countBySubcategory(categorySlug: string, subSlug: string): number {
    return this.products().filter(
      (product) =>
        product.categorySlug === categorySlug &&
        product.subcategorySlug === subSlug,
    ).length;
  }

  countByStore(storeId: string): number {
    return this.products().filter((product) => product.storeId === storeId)
      .length;
  }

  collection(name: string, limit?: number): Product[] {
    const matches = this.products().filter((product) =>
      product.collections.includes(name),
    );
    return limit ? matches.slice(0, limit) : matches;
  }

  bestSellers(limit = 4): Product[] {
    return [...this.products()]
      .sort((a, b) => b.soldCount - a.soldCount)
      .slice(0, limit);
  }

  newArrivals(limit = 4): Product[] {
    return [...this.products()]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }

  search(query: ProductQuery): Product[] {
    let results = [...this.products()];

    const term = query.search?.trim().toLowerCase();
    if (term) {
      results = results.filter((product) =>
        [
          product.name,
          product.categoryName,
          product.sellerName,
          product.description,
        ]
          .join(' ')
          .toLowerCase()
          .includes(term),
      );
    }

    if (query.category) {
      results = results.filter(
        (product) => product.categorySlug === query.category,
      );
    }

    if (query.subcategory) {
      results = results.filter(
        (product) => product.subcategorySlug === query.subcategory,
      );
    }

    if (query.collection) {
      results = results.filter((product) =>
        product.collections.includes(query.collection!),
      );
    }

    if (query.storeId) {
      results = results.filter((product) => product.storeId === query.storeId);
    }

    if (query.priceMin !== undefined) {
      results = results.filter((product) => product.price >= query.priceMin!);
    }

    if (query.priceMax !== undefined) {
      results = results.filter((product) => product.price <= query.priceMax!);
    }

    if (query.minRating !== undefined) {
      results = results.filter((product) => product.rating >= query.minRating!);
    }

    if (query.inStockOnly) {
      results = results.filter((product) => product.status !== 'out-of-stock');
    }

    if (query.onSaleOnly) {
      results = results.filter(
        (product) =>
          product.compareAtPrice !== undefined &&
          product.compareAtPrice > product.price,
      );
    }

    switch (query.sort) {
      case 'price-asc':
        results.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        results.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        results.sort((a, b) => b.rating - a.rating);
        break;
      case 'newest':
        results.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        break;
      default:
        results.sort(
          (a, b) =>
            Number(a.status === 'out-of-stock') -
            Number(b.status === 'out-of-stock'),
        );
    }

    return results;
  }

  /**
   * How many products a filter would return given the rest of the filters.
   */
  countWith(base: ProductQuery, override: Partial<ProductQuery>): number {
    return this.search({ ...base, ...override }).length;
  }

  /** Cheapest and dearest in a set, for the price slider bounds. */
  priceRange(query: ProductQuery): { min: number; max: number } {
    const prices = this.search(query).map((product) => product.price);
    if (!prices.length) {
      return { min: 0, max: 0 };
    }
    return {
      min: Math.floor(Math.min(...prices)),
      max: Math.ceil(Math.max(...prices)),
    };
  }

  related(product: Product, limit = 4): Product[] {
    return this.products()
      .filter(
        (candidate) =>
          candidate.id !== product.id &&
          candidate.categorySlug === product.categorySlug,
      )
      .slice(0, limit);
  }
}

/** Map a Rentify product onto the shape the UI renders. */
const toProductFromRentify = (
  api: RentifyProduct,
  storeMap: Map<string, RentifyStore>,
): Product => {
  const classification = classifyCategory(api.category || 'General');
  const store = storeMap.get(api.storeId);
  const sellerName = store?.name || 'Local Merchant';
  const price = typeof api.price === 'string' ? parseFloat(api.price) || 0 : Number(api.price) || 0;
  const compareAtPrice = api.compareAtPrice
    ? typeof api.compareAtPrice === 'string'
      ? parseFloat(api.compareAtPrice) || undefined
      : Number(api.compareAtPrice) || undefined
    : undefined;
  const image = api.images?.[0]?.url || null;
  const images = api.images?.map((img) => img.url) || [];
  const stock = api.stockQuantity ?? 10;
  const status: StockStatus = stock === 0 ? 'out-of-stock' : stock <= 5 ? 'low-stock' : 'in-stock';

  return {
    id: api.id,
    name: api.name,
    slug: (api as any).slug || api.id,
    image,
    images,
    variants: [],
    price,
    compareAtPrice,
    ...classification,
    subcategory: null,
    subcategorySlug: null,
    sellerName,
    storeId: api.storeId,
    rating: 4.8,
    reviewCount: 12,
    stock,
    status,
    description: api.description || '',
    soldCount: 100,
    createdAt: (api as any).createdAt || new Date().toISOString(),
    collections: collectionsForCategoryAndPrice(classification.categorySlug, api.category, price),
  };
};

/** Map a Rentify store onto the shape the UI renders. */
const toStoreFromRentify = (api: RentifyStore): Store => ({
  id: api.id,
  slug: api.slug || api.id,
  name: api.name,
  location: 'Cambodia',
  rating: 4.9,
  reviewCount: 16,
  categoryName: api.primaryCategory || 'General',
  description: `${api.name} on Rentify Marketplace`,
  tagline: `${api.name} Storefront`,
  announcement: '',
  theme: 'FOREST',
  phoneNumber: '',
  showContact: false,
  logoUrl: null,
  bannerUrl: null,
  featuredProductIds: [],
});

const collectionsForCategoryAndPrice = (slug: string, rawCategory: string, price: number): string[] => {
  const collections: string[] = ['top-picks', 'recommended', 'best-sellers'];
  if (price <= 5) collections.push('under-5');
  if (slug === 'handmade-crafts' || slug === 'arts-culture' || /craft|handmade|weaving|pottery/i.test(rawCategory)) {
    collections.push('handmade-crafts');
  }
  if (slug === 'food-groceries' || slug === 'agro-products' || /food|grocer|produce|fruit|rice/i.test(rawCategory)) {
    collections.push('agro-products');
  }
  return collections;
};
