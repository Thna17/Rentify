import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { CatalogService } from '../catalog/catalog.service';
import { CartItem, CartLine, Product } from '../catalog/catalog.models';
import {
  RentifyMarketplaceService,
  StoreCart,
} from '../rentify/rentify-marketplace.service';

const STORAGE_KEY = 'khmercraft.cart';
const FREE_SHIPPING_THRESHOLD = 50;
const SHIPPING_FLAT_RATE = 3.5;

export interface EnhancedCartItem extends CartItem {
  product?: Product;
}

/**
 * Cart state, shared app-wide.
 *
 * Connected to Rentify Commerce API via RentifyMarketplaceService.
 *   Signed in  → Rentify Commerce API store-grouped cart (/api/marketplace/cart).
 *   Guest      → Local memory & localStorage, synced with Rentify session cart.
 *
 * On sign-in the guest basket is merged and pushed to Rentify.
 */
@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly rentify = inject(RentifyMarketplaceService);
  private readonly auth = inject(AuthService);
  private readonly catalog = inject(CatalogService);

  /** In-memory product cache ensuring added products are never dropped from view. */
  private readonly localProductCache = new Map<string, Product>();

  /** Guest basket. */
  private readonly guestItems = signal<EnhancedCartItem[]>(this.restore());

  /** Store carts from Rentify Commerce API. */
  private readonly storeCarts = signal<StoreCart[]>([]);

  private readonly signedIn = this.auth.isAuthenticated;

  readonly loading = signal(false);
  /** Last error from a cart mutation. */
  readonly error = signal('');

  readonly lines = computed<CartLine[]>(() => {
    if (this.signedIn()) {
      const allLines: CartLine[] = [];
      for (const cart of this.storeCarts()) {
        const store = this.catalog.storeById(cart.storeId);
        const sellerName = store?.name || 'Local Merchant';
        for (const item of cart.items) {
          const known =
            this.catalog.productById(item.productId) ||
            this.localProductCache.get(item.productId);
          const backendProd = (item as any).product;
          const img = backendProd?.images?.[0]?.url || backendProd?.images?.[0] || null;
          const effectiveName = known?.name || backendProd?.name || 'Product';
          const effectivePrice = item.currentPrice
            ? parseFloat(item.currentPrice) || 0
            : known?.price || (backendProd?.price ? parseFloat(backendProd.price) : 0);
          const product: Product = known
            ? { ...known, price: effectivePrice, sellerName: store?.name || known.sellerName || 'Local Merchant' }
            : {
                id: item.productId,
                name: effectiveName,
                slug: backendProd?.slug || item.productId,
                image: img,
                images: img ? [img] : [],
                price: effectivePrice,
                categorySlug: 'general',
                categoryName: 'General',
                subcategory: null,
                subcategorySlug: null,
                sellerName,
                storeId: cart.storeId,
                rating: 5,
                reviewCount: 0,
                stock: backendProd?.stockQuantity ?? 99,
                status: item.available ? 'in-stock' : 'out-of-stock',
                description: '',
                soldCount: 0,
                createdAt: new Date().toISOString(),
                collections: [],
              };
          if (!known && backendProd) {
            this.localProductCache.set(item.productId, product);
          }
          allLines.push({
            product,
            quantity: item.quantity,
            lineTotal: round(effectivePrice * item.quantity),
          });
        }
      }
      return allLines;
    }

    return this.guestItems().map((item) => {
      const known =
        this.catalog.productById(item.productId) ||
        this.localProductCache.get(item.productId) ||
        item.product;
      const product: Product = known
        ? known
        : {
            id: item.productId,
            name: (item as any).name || 'Product',
            slug: item.productId,
            image: (item as any).image || null,
            images: (item as any).image ? [(item as any).image] : [],
            price: (item as any).price || 0,
            categorySlug: 'general',
            categoryName: 'General',
            subcategory: null,
            subcategorySlug: null,
            sellerName: (item as any).sellerName || 'Local Merchant',
            storeId: (item as any).storeId || '',
            rating: 5,
            reviewCount: 0,
            stock: 99,
            status: 'in-stock',
            description: '',
            soldCount: 0,
            createdAt: new Date().toISOString(),
            collections: [],
          };
      return {
        product,
        quantity: item.quantity,
        lineTotal: round(product.price * item.quantity),
      };
    });
  });

  readonly count = computed(() => {
    if (this.signedIn()) {
      return this.storeCarts().reduce(
        (sum, cart) => sum + cart.items.reduce((s, it) => s + it.quantity, 0),
        0,
      );
    }
    return this.guestItems().reduce((total, item) => total + item.quantity, 0);
  });

  readonly subtotal = computed(() => {
    if (this.signedIn()) {
      return round(
        this.storeCarts()
          .filter((cart) => cart.items && cart.items.length > 0)
          .reduce((sum, cart) => sum + (parseFloat(cart.subtotal) || 0), 0),
      );
    }
    return round(this.lines().reduce((total, line) => total + line.lineTotal, 0));
  });

  readonly shipping = computed(() => {
    if (this.signedIn()) {
      return round(
        this.storeCarts()
          .filter((cart) => cart.items && cart.items.length > 0)
          .reduce(
            (sum, cart) => sum + (parseFloat(cart.deliveryFee || '0') || 0),
            0,
          ),
      );
    }
    const subtotal = this.subtotal();
    return subtotal === 0 || subtotal >= FREE_SHIPPING_THRESHOLD
      ? 0
      : SHIPPING_FLAT_RATE;
  });

  readonly total = computed(() => {
    if (this.signedIn()) {
      return round(
        this.storeCarts()
          .filter((cart) => cart.items && cart.items.length > 0)
          .reduce(
            (sum, cart) =>
              sum + (parseFloat(cart.totalAmount || cart.subtotal) || 0),
            0,
          ),
      );
    }
    return round(this.subtotal() + this.shipping());
  });

  readonly isEmpty = computed(() => this.lines().length === 0);

  readonly freeShippingRemaining = computed(() =>
    this.subtotal() >= FREE_SHIPPING_THRESHOLD
      ? 0
      : round(FREE_SHIPPING_THRESHOLD - this.subtotal()),
  );

  constructor() {
    effect(() => {
      if (!this.signedIn()) {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(this.guestItems()));
        } catch {}
      }
    });

    let wasSignedIn = false;
    effect(() => {
      const signedIn = this.signedIn();
      if (signedIn && !wasSignedIn) {
        wasSignedIn = true;
        void this.adoptGuestCart();
      } else if (!signedIn && wasSignedIn) {
        wasSignedIn = false;
        this.storeCarts.set([]);
      }
    });

    void this.refresh();
  }

  getStoreCarts(): StoreCart[] {
    return this.storeCarts();
  }

  private async adoptGuestCart(): Promise<void> {
    this.loading.set(true);
    try {
      // First attempt server-side merge of session cart if available
      const mergedProductIds = new Set<string>();
      try {
        const mergeRes = await firstValueFrom(this.rentify.mergeCart());
        if (mergeRes?.carts) {
          this.storeCarts.set(mergeRes.carts);
          for (const c of mergeRes.carts) {
            for (const it of c.items) {
              mergedProductIds.add(it.productId);
            }
          }
        }
      } catch {}

      const pending = this.guestItems();
      const remaining: EnhancedCartItem[] = [];
      for (const item of pending) {
        if (mergedProductIds.has(item.productId)) {
          continue;
        }
        try {
          const product =
            this.catalog.productById(item.productId) ||
            this.localProductCache.get(item.productId) ||
            item.product ||
            (await this.catalog.loadProduct(item.productId));
          const res = await firstValueFrom(
            this.rentify.addItem(item.productId, item.quantity, product?.storeId),
          );
          if (res?.carts) {
            this.storeCarts.set(res.carts);
          }
        } catch {
          remaining.push(item);
        }
      }
      this.guestItems.set(remaining);
      if (remaining.length === 0) {
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {}
      } else {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
        } catch {}
      }
      await this.refresh();
    } finally {
      this.loading.set(false);
    }
  }

  async refresh(): Promise<void> {
    try {
      const res = await firstValueFrom(this.rentify.carts());
      if (res?.carts) {
        this.storeCarts.set(res.carts);
        // Cache products returned by server
        for (const c of res.carts) {
          for (const it of c.items) {
            const bp = (it as any).product;
            if (bp && !this.localProductCache.has(it.productId)) {
              const img = bp.images?.[0]?.url || bp.images?.[0] || null;
              this.localProductCache.set(it.productId, {
                id: it.productId,
                name: bp.name,
                slug: bp.slug || it.productId,
                image: img,
                images: img ? [img] : [],
                price: parseFloat(it.currentPrice || bp.price) || 0,
                categorySlug: 'general',
                categoryName: 'General',
                subcategory: null,
                subcategorySlug: null,
                sellerName: 'Local Merchant',
                storeId: c.storeId,
                rating: 5,
                reviewCount: 0,
                stock: bp.stockQuantity ?? 99,
                status: it.available ? 'in-stock' : 'out-of-stock',
                description: '',
                soldCount: 0,
                createdAt: new Date().toISOString(),
                collections: [],
              });
            }
          }
        }
        // If guest has no local items but server has session cart items, restore them into guestItems
        if (!this.signedIn() && this.guestItems().length === 0) {
          const restored: EnhancedCartItem[] = [];
          for (const c of res.carts) {
            for (const it of c.items) {
              const cached = this.localProductCache.get(it.productId);
              restored.push({ productId: it.productId, quantity: it.quantity, product: cached });
            }
          }
          if (restored.length > 0) {
            this.guestItems.set(restored);
          }
        }
      }
    } catch {
      // Leave previous in place
    }
  }

  async add(product: Product, quantity = 1): Promise<boolean> {
    this.error.set('');

    if (product.status === 'out-of-stock' || quantity < 1) {
      this.error.set('This product is out of stock.');
      return false;
    }

    // Always cache the product reference in memory
    this.localProductCache.set(product.id, product);

    if (!this.signedIn()) {
      this.guestItems.update((items) => {
        const existing = items.find((item) => item.productId === product.id);
        const newQty = clamp((existing?.quantity || 0) + quantity, product);
        if (!existing) {
          return [
            ...items,
            { productId: product.id, quantity: newQty, product },
          ];
        }
        return items.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: newQty, product }
            : item,
        );
      });

      // Also persist to backend session cart asynchronously
      const targetQty = this.quantityOf(product.id);
      const persist$ = product.storeId
        ? this.rentify.setQuantity(product.storeId, product.id, targetQty)
        : this.rentify.addItem(product.id, quantity);
      await firstValueFrom(persist$).then((res) => {
        if (res?.carts) this.storeCarts.set(res.carts);
      }).catch(() => {});
      return true;
    }

    try {
      this.loading.set(true);
      const existingCart = this.storeCarts().find((c) => c.storeId === product.storeId);
      const existingItem = existingCart?.items.find((it) => it.productId === product.id);
      const currentQty = existingItem?.quantity || 0;
      const mutation$ = product.storeId
        ? this.rentify.setQuantity(product.storeId, product.id, currentQty + quantity)
        : this.rentify.addItem(product.id, quantity);
      const res = await firstValueFrom(mutation$);
      this.storeCarts.set(res.carts || []);
      return true;
    } catch (error: unknown) {
      this.error.set(cartErrorMessage(error));
      return false;
    } finally {
      this.loading.set(false);
    }
  }

  async changeQuantity(productId: string, delta: number): Promise<void> {
    const product =
      this.catalog.productById(productId) || this.localProductCache.get(productId);

    if (!this.signedIn()) {
      let targetStoreId: string | null = product?.storeId || null;
      let nextQty = 0;
      this.guestItems.update((items) =>
        items
          .map((item) => {
            if (item.productId === productId) {
              const q = product ? clamp(item.quantity + delta, product) : item.quantity + delta;
              nextQty = Math.max(0, q);
              if (!targetStoreId && (item as any).product?.storeId) {
                targetStoreId = (item as any).product.storeId;
              }
              return { ...item, quantity: nextQty };
            }
            return item;
          })
          .filter((item) => item.quantity > 0),
      );

      if (targetStoreId) {
        await firstValueFrom(
          this.rentify.setQuantity(targetStoreId, productId, nextQty),
        ).then((res) => {
          if (res?.carts) this.storeCarts.set(res.carts);
        }).catch(() => {});
      }
      return;
    }

    let targetStoreId: string | null = null;
    let targetItem: { productId: string; quantity: number } | null = null;
    for (const cart of this.storeCarts()) {
      const it = cart.items.find((i) => i.productId === productId);
      if (it) {
        targetStoreId = cart.storeId;
        targetItem = it;
        break;
      }
    }

    if (!targetStoreId || !targetItem) {
      return;
    }

    const next = targetItem.quantity + delta;
    try {
      this.loading.set(true);
      const res = await firstValueFrom(
        this.rentify.setQuantity(targetStoreId, productId, Math.max(0, next)),
      );
      this.storeCarts.set(res.carts || []);
    } catch (error: unknown) {
      this.error.set(cartErrorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }

  async remove(productId: string): Promise<void> {
    const product =
      this.catalog.productById(productId) || this.localProductCache.get(productId);

    if (!this.signedIn()) {
      let targetStoreId: string | null = product?.storeId || null;
      for (const item of this.guestItems()) {
        if (item.productId === productId && (item as any).product?.storeId) {
          targetStoreId = (item as any).product.storeId;
        }
      }
      this.guestItems.update((items) =>
        items.filter((item) => item.productId !== productId),
      );
      if (targetStoreId) {
        await firstValueFrom(
          this.rentify.setQuantity(targetStoreId, productId, 0),
        ).then((res) => {
          if (res?.carts) this.storeCarts.set(res.carts);
        }).catch(() => {});
      }
      return;
    }

    let targetStoreId: string | null = null;
    for (const cart of this.storeCarts()) {
      if (cart.items.some((it) => it.productId === productId)) {
        targetStoreId = cart.storeId;
        break;
      }
    }

    if (!targetStoreId) {
      return;
    }

    try {
      this.loading.set(true);
      const res = await firstValueFrom(
        this.rentify.setQuantity(targetStoreId, productId, 0),
      );
      this.storeCarts.set(res.carts || []);
    } catch (error: unknown) {
      this.error.set(cartErrorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }

  async clear(): Promise<void> {
    this.guestItems.set([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    try {
      const res = await firstValueFrom(this.rentify.clearCart());
      this.storeCarts.set(res?.carts || []);
    } catch {
      this.storeCarts.set([]);
    }
  }

  quantityOf(productId: string): number {
    if (this.signedIn()) {
      for (const cart of this.storeCarts()) {
        const item = cart.items.find((i) => i.productId === productId);
        if (item) return item.quantity;
      }
      return 0;
    }
    const guestItem = this.guestItems().find((item) => item.productId === productId);
    return guestItem?.quantity ?? 0;
  }

  contains(productId: string): boolean {
    return this.quantityOf(productId) > 0;
  }

  /** Called after checkout: mirrors emptied state. */
  markEmptied(): void {
    this.storeCarts.set([]);
    this.guestItems.set([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }

  private restore(): EnhancedCartItem[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return [];
      }
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }
      const items: EnhancedCartItem[] = [];
      for (const item of parsed) {
        if (
          typeof item?.productId === 'string' &&
          typeof item?.quantity === 'number' &&
          item.quantity > 0
        ) {
          if (item.product && typeof item.product === 'object' && item.product.id) {
            this.localProductCache.set(item.productId, item.product as Product);
          }
          items.push(item as EnhancedCartItem);
        }
      }
      return items;
    } catch {
      return [];
    }
  }
}

const clamp = (quantity: number, product: Product) =>
  Math.max(0, Math.min(quantity, product.stock));

const round = (value: number) => Math.round(value * 100) / 100;

export const cartErrorMessage = (error: unknown): string => {
  const body = (error as { error?: { error?: string; message?: string } })?.error;
  return body?.error || body?.message || 'Could not update your cart. Please try again.';
};
