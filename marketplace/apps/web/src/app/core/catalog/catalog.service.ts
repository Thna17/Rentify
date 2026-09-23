import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { CommerceApiService } from '../api/commerce-api.service';
import { ApiProduct } from '../api/api.models';
import {
  CATEGORIES,
  classifyCategory,
  findCategory,
  subcategorySlug,
} from '../data/categories.data';
import { Category, Product, ProductQuery, Store } from './catalog.models';
import { ApiStore } from '../api/api.models';

/**
 * The catalog the UI reads.
 *
 * Products and stores both come from the API and are held in signals, so
 * every derived view (homepage rails, the products grid, related items,
 * the store directory) recomputes when they load. Product identifiers
 * therefore match the server's, which is what makes add-to-cart work — the
 * previous mock ids would have 404'd.
 *
 * API failures stay failures. Rendering local fixture products as live stock
 * creates broken cart actions and misleading availability, so callers receive
 * an empty result plus an explicit error signal that they can retry.
 *
 * TODO(api): categories are still a local fixture — there is no endpoint for
 * them yet.
 */
@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly api = inject(CommerceApiService);

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

  /** Live store list. Fixtures are intentionally never exposed as inventory. */
  get stores(): Store[] {
    return this._stores();
  }

  allStores(): Store[] {
    return this._stores();
  }

  /** Fetch the whole catalog once. It is small; pagination is a UI concern. */
  async load(): Promise<void> {
    this.loaded.set(false);
    this.productError.set('');
    try {
      // A page is capped at 60 server-side, so one request silently truncated
      // the catalogue - whole departments were missing from the homepage.
      // Follow totalPages, the same way loadStoreProducts already does.
      const first = await firstValueFrom(this.api.listProducts({ page: 1, limit: 60 }));
      const all = [...first.products];
      for (let page = 2; page <= first.totalPages; page += 1) {
        const next = await firstValueFrom(this.api.listProducts({ page, limit: 60 }));
        all.push(...next.products);
      }
      this.products.set(all.map(toProduct));
    } catch {
      this.products.set([]);
      this.productError.set(
        'We could not load the marketplace right now. Please try again.',
      );
    } finally {
      this.loaded.set(true);
    }
  }

  /** Fetch the store directory once, same fallback pattern as products. */
  async loadStores(): Promise<void> {
    this.storesLoaded.set(false);
    this.storeError.set('');
    try {
      const response = await firstValueFrom(this.api.listStores(1, 60));
      this._stores.set(response.stores.map(toStore));
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

  /**
   * Loads a complete public storefront directly from the API. The marketplace
   * home catalogue is intentionally paged, so filtering its first page would
   * make larger sellers appear to have missing products.
   */
  async productsForStore(storeId: string): Promise<Product[]> {
    const first = await firstValueFrom(this.api.listProducts({ storeId, page: 1, limit: 60 }));
    const products = [...first.products];
    for (let page = 2; page <= first.totalPages; page += 1) {
      const response = await firstValueFrom(this.api.listProducts({ storeId, page, limit: 60 }));
      products.push(...response.products);
    }
    return products.map(toProduct);
  }

  productById(id: string): Product | undefined {
    return this.products().find(
      (product) => product.id === id || product.slug === id,
    );
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
   * How many products a filter would return *given the rest of the filters*.
   *
   * Counting against the full catalogue would show a number the user cannot
   * reach — clicking a "12" and landing on 3 results reads as a bug. This
   * applies every other active filter first, so the count is what they will
   * actually get.
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

/**
 * Map a server product onto the shape the UI renders.
 *
 * The category slug is derived from the display name because the API stores
 * categories as free text ("Palm Sugar") while the UI routes on slugs.
 */
const toProduct = (api: ApiProduct): Product => {
  const classification = classifyCategory(api.category);
  // The API's own subcategory (set by the seller at listing time) is the
  // real value — classifyCategory only fills one in for the handful of old
  // narrow category labels ("fresh-fruit" etc.) that predate the seller
  // being able to pick a subcategory at all. Prefer the real one whenever
  // the seller actually set it, so the store page can group by it.
  const subcategory = api.subcategory ?? classification.subcategory;

  return {
    id: api.id,
    name: api.name,
    slug: api.slug,
    image: api.image,
    images: api.images ?? [],
    variants: api.variants ?? [],
    price: api.price,
    compareAtPrice: api.compareAtPrice ?? undefined,
    ...classification,
    subcategory,
    subcategorySlug: subcategory ? subcategorySlug(subcategory) : null,
    sellerName: api.sellerName,
    // The product's own sellerId now points at a real Seller/store document
    // (see sellers.service.ts) — no more guessing the store by matching names
    // against a fixture.
    storeId: api.sellerId ?? '',
    rating: api.rating,
    reviewCount: api.reviewCount,
    stock: api.stock,
    status:
      api.stock === 0 ? 'out-of-stock' : api.stock <= 5 ? 'low-stock' : 'in-stock',
    description: api.description,
    soldCount: api.soldCount,
    createdAt: api.createdAt,
    collections: collectionsFor(api),
  };
};

/** Map a server store onto the shape the UI renders. */
const toStore = (api: ApiStore): Store => ({
  id: api.id,
  slug: api.slug,
  name: api.name,
  location: api.location ?? '',
  rating: api.rating,
  reviewCount: api.reviewCount,
  categoryName: api.categoryName ?? '',
  description: api.description ?? '',
  tagline: api.tagline ?? '',
  announcement: api.announcement ?? '',
  theme: api.theme ?? 'FOREST',
  phoneNumber: api.phoneNumber ?? '',
  showContact: api.showContact,
  logoUrl: api.logoUrl,
  bannerUrl: api.bannerUrl,
  featuredProductIds: api.featuredProductIds ?? [],
});

/**
 * Collections are computed client-side from the category and sales figures,
 * matching the server's own collection rules in catalog.validation.ts.
 */
const collectionsFor = (api: ApiProduct): string[] => {
  const collections: string[] = [];
  const handmade = ['Handmade Crafts', 'Pottery', 'Weaving', 'Bamboo Products'];
  const agro = ['Rice Products', 'Palm Sugar', 'Local Food', 'Dried Fruits'];

  if (handmade.includes(api.category)) {
    collections.push('handmade-crafts');
  }
  if (agro.includes(api.category)) {
    collections.push('agro-products');
  }
  if (api.rating >= 4.6) {
    collections.push('top-picks');
  }
  if (api.soldCount >= 400) {
    collections.push('best-sellers');
  }
  if (api.price <= 5) {
    collections.push('under-5');
  }
  if (api.rating >= 4.4 && api.soldCount < 400) {
    collections.push('recommended');
  }
  return collections;
};
