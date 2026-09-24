import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { CatalogService } from '../catalog/catalog.service';
import { Product } from '../catalog/catalog.models';

const STORAGE_KEY = 'khmercraft.wishlist';

/**
 * Saved products, shared app-wide and persisted to localStorage.
 *
 * Stores ids only, for the same reason as the cart: the catalog stays the
 * single source of truth for price and stock.
 */
@Injectable({ providedIn: 'root' })
export class WishlistService {
  private readonly catalog = inject(CatalogService);
  private readonly ids = signal<string[]>(this.restore());

  readonly products = computed<Product[]>(() =>
    this.catalog.productsByIds(this.ids()),
  );

  readonly count = computed(() => this.ids().length);
  readonly isEmpty = computed(() => this.ids().length === 0);

  constructor() {
    effect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(this.ids())));
  }

  isWishlisted(productId: string): boolean {
    return this.ids().includes(productId);
  }

  /** Returns the state after toggling, so callers can show feedback. */
  toggle(productId: string): boolean {
    const nowSaved = !this.isWishlisted(productId);
    this.ids.update((ids) =>
      nowSaved ? [...ids, productId] : ids.filter((id) => id !== productId),
    );
    return nowSaved;
  }

  remove(productId: string): void {
    this.ids.update((ids) => ids.filter((id) => id !== productId));
  }

  clear(): void {
    this.ids.set([]);
  }

  private restore(): string[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return [];
      }
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed)
        ? parsed.filter((id): id is string => typeof id === 'string')
        : [];
    } catch {
      return [];
    }
  }
}
