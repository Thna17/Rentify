import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { CatalogService } from '../catalog/catalog.service';
import { CartItem, CartLine, Product, StoreCartGroup, StoreCartGroupLine } from '../catalog/catalog.models';
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
 * Store isolation & multi-store guarantees:
 *   - Products are grouped strictly by Store and sales channel.
 *   - Totals, delivery fees, and subtotals are authoritative from Commerce.
 *   - Stale prices and unavailable stock are surfaced with review requirements.
 *   - Single-store checkout does not destroy or drop items from other stores.
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

  /** Acknowledged stale price reviews per storeId. */
  readonly acknowledgedStores = signal<Set<string>>(new Set());

  /** Selected single storeId for checkout. */
  readonly activeCheckoutStoreId = signal<string | null>(null);

  private readonly signedIn = this.auth.isAuthenticated;

  readonly loading = signal(false);
  /** Last error from a cart mutation or network timeout. */
  readonly error = signal('');

  /** Authoritative store-grouped carts from Commerce or local session projection. */
  readonly groups = computed<StoreCartGroup[]>(() => {
    if (this.signedIn()) {
      const result: StoreCartGroup[] = [];
      for (const cart of this.storeCarts()) {
        const activeItems = (cart.items || []).filter((it) => it.quantity > 0);
        if (activeItems.length === 0) continue;

        const store = this.catalog.storeById(cart.storeId);
        const sellerName = store?.name || 'Local Merchant';
        const channel: 'marketplace' | 'storefront' =
          cart.channel || (cart.websiteId ? 'storefront' : 'marketplace');

        const lines: StoreCartGroupLine[] = activeItems.map((it) => {
          const known =
            this.catalog.productById(it.productId) ||
            this.localProductCache.get(it.productId);
          const backendProd = (it as any).product;
          const backendVar = (it as any).variant;
          const img =
            backendProd?.images?.[0]?.url ||
            backendProd?.images?.[0] ||
            known?.image ||
            null;
          const effectiveName = known?.name || backendProd?.name || 'Product';
          const unitPrice = it.unitPrice
            ? parseFloat(it.unitPrice) || 0
            : it.currentPrice
              ? parseFloat(it.currentPrice) || 0
              : known?.price || 0;
          const currentPrice = it.currentPrice
            ? parseFloat(it.currentPrice) || 0
            : unitPrice;
          const isPriceStale = Boolean(
            it.unitPrice &&
              it.currentPrice &&
              Math.abs(parseFloat(it.unitPrice) - parseFloat(it.currentPrice)) > 0.001,
          );
          const stockLimit =
            backendVar?.stockQuantity ?? backendProd?.stockQuantity ?? known?.stock;
          const product: Product = known
            ? { ...known, price: currentPrice, sellerName }
            : {
                id: it.productId,
                name: effectiveName,
                slug: backendProd?.slug || it.productId,
                image: img,
                images: img ? [img] : [],
                price: currentPrice,
                categorySlug: 'general',
                categoryName: 'General',
                subcategory: null,
                subcategorySlug: null,
                sellerName,
                storeId: cart.storeId,
                rating: 5,
                reviewCount: 0,
                stock: stockLimit ?? 99,
                status: it.available ? 'in-stock' : 'out-of-stock',
                description: '',
                soldCount: 0,
                createdAt: new Date().toISOString(),
                collections: [],
              };
          if (!known && backendProd) {
            this.localProductCache.set(it.productId, product);
          }
          return {
            id: it.id,
            product,
            variantId: it.variantId || null,
            sku: backendVar?.sku || product.sku,
            quantity: it.quantity,
            unitPrice: round(unitPrice),
            currentPrice: round(currentPrice),
            isPriceStale,
            available: it.available,
            stockLimit,
            stockWarning: !it.available
              ? 'Out of stock'
              : stockLimit !== undefined && stockLimit < it.quantity
                ? `Only ${stockLimit} available`
                : undefined,
            lineTotal: round(currentPrice * it.quantity),
            optionValues: backendVar?.optionValues,
          };
        });

        const hasStalePrices =
          lines.some((l) => l.isPriceStale) &&
          !this.acknowledgedStores().has(cart.storeId);
        const checkoutReady = Boolean(cart.checkoutReady && !hasStalePrices);

        result.push({
          cartId: cart.id,
          storeId: cart.storeId,
          sellerName,
          storeSlug: store?.slug,
          channel,
          websiteId: cart.websiteId || null,
          lines,
          subtotal: cart.subtotal,
          deliveryFee: cart.deliveryFee,
          totalAmount: cart.totalAmount,
          currency: cart.currency || 'USD',
          deliveryPolicyVersion: cart.deliveryPolicyVersion ?? null,
          checkoutReady,
          issues: cart.issues || [],
          hasStalePrices,
        });
      }
      return result;
    }

    // Guest basket: group guestItems by storeId
    const guestBuckets = new Map<string, EnhancedCartItem[]>();
    for (const item of this.guestItems()) {
      if (item.quantity <= 0) continue;
      const known =
        this.catalog.productById(item.productId) ||
        this.localProductCache.get(item.productId) ||
        item.product;
      const storeId = known?.storeId || (item as any).storeId || 'store-guest-001';
      const bucket = guestBuckets.get(storeId);
      if (bucket) bucket.push(item);
      else guestBuckets.set(storeId, [item]);
    }

    return [...guestBuckets.entries()].map(([storeId, items]) => {
      const store = this.catalog.storeById(storeId);
      const sellerName =
        store?.name || (items[0] as any)?.product?.sellerName || 'Local Merchant';
      const serverCart = this.storeCarts().find((c) => c.storeId === storeId);
      let storeSubtotal = 0;

      const lines: StoreCartGroupLine[] = items.map((it) => {
        const known =
          this.catalog.productById(it.productId) ||
          this.localProductCache.get(it.productId) ||
          it.product;
        const serverItem = serverCart?.items?.find((i) => i.productId === it.productId);
        const price = known?.price || (it as any).price || 0;
        const lineTotal = round(price * it.quantity);
        storeSubtotal += lineTotal;
        return {
          id: serverItem?.id,
          product: known || {
            id: it.productId,
            name: (it as any).name || 'Product',
            slug: it.productId,
            image: (it as any).image || null,
            images: [],
            price,
            categorySlug: 'general',
            categoryName: 'General',
            subcategory: null,
            subcategorySlug: null,
            sellerName,
            storeId,
            rating: 5,
            reviewCount: 0,
            stock: 99,
            status: 'in-stock',
            description: '',
            soldCount: 0,
            createdAt: new Date().toISOString(),
            collections: [],
          },
          variantId: serverItem?.variantId || null,
          quantity: it.quantity,
          unitPrice: price,
          currentPrice: price,
          isPriceStale: false,
          available: (known?.status ?? 'in-stock') !== 'out-of-stock',
          stockLimit: known?.stock ?? 99,
          lineTotal,
        };
      });

      const freeDelivery = storeSubtotal >= FREE_SHIPPING_THRESHOLD;
      const deliveryFee = freeDelivery ? '0.00' : (serverCart?.deliveryFee || SHIPPING_FLAT_RATE.toFixed(2));
      const feeNum = parseFloat(deliveryFee) || 0;
      const totalAmount = (storeSubtotal + feeNum).toFixed(2);

      return {
        cartId: serverCart?.id || `guest-cart-${storeId}`,
        storeId,
        sellerName,
        storeSlug: store?.slug,
        channel: serverCart?.channel || 'marketplace',
        websiteId: serverCart?.websiteId || null,
        lines,
        subtotal: storeSubtotal.toFixed(2),
        deliveryFee,
        totalAmount,
        currency: 'USD',
        deliveryPolicyVersion: serverCart?.deliveryPolicyVersion ?? 1,
        checkoutReady: lines.every((l) => l.available),
        issues: lines.some((l) => !l.available) ? ['Item unavailable'] : [],
        hasStalePrices: false,
      };
    });
  });

  /** Flattened lines view for quick legacy consumers. */
  readonly lines = computed<CartLine[]>(() => {
    return this.groups().flatMap((group) =>
      group.lines.map((line) => ({
        product: line.product,
        quantity: line.quantity,
        lineTotal: line.lineTotal,
      })),
    );
  });

  readonly count = computed(() => {
    return this.groups().reduce(
      (sum, group) => sum + group.lines.reduce((s, it) => s + it.quantity, 0),
      0,
    );
  });

  readonly subtotal = computed(() => {
    return round(
      this.groups().reduce((sum, g) => sum + (parseFloat(g.subtotal) || 0), 0),
    );
  });

  readonly shipping = computed(() => {
    if (this.signedIn()) {
      return round(
        this.groups().reduce(
          (sum, g) => sum + (parseFloat(g.deliveryFee || '0') || 0),
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
        this.groups().reduce(
          (sum, g) => sum + (parseFloat(g.totalAmount || g.subtotal) || 0),
          0,
        ),
      );
    }
    return round(this.subtotal() + this.shipping());
  });

  readonly isEmpty = computed(() => this.count() === 0);

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

  storeCart(storeId: string): StoreCartGroup | undefined {
    return this.groups().find((g) => g.storeId === storeId);
  }

  selectStoreForCheckout(storeId: string | null): void {
    this.activeCheckoutStoreId.set(storeId);
  }

  acknowledgeStalePrices(storeId: string): void {
    this.acknowledgedStores.update((set) => {
      const next = new Set(set);
      next.add(storeId);
      return next;
    });
  }

  private async adoptGuestCart(): Promise<void> {
    this.loading.set(true);
    try {
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

  async refresh(timeoutMs = 8000): Promise<void> {
    try {
      const res = await firstValueFrom(this.rentify.carts().pipe(timeout(timeoutMs)));
      if (res?.carts) {
        this.storeCarts.set(res.carts);
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
    } catch (err: unknown) {
      const isTimeout = (err as any)?.name === 'TimeoutError';
      if (isTimeout) {
        this.error.set('Network timeout: could not refresh cart. Please retry.');
      }
    }
  }

  async retry(): Promise<void> {
    this.error.set('');
    await this.refresh();
  }

  async add(product: Product, quantity = 1, variantId?: string): Promise<boolean> {
    this.error.set('');

    if (product.status === 'out-of-stock' || quantity < 1) {
      this.error.set('This product is out of stock.');
      return false;
    }

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

      const targetQty = this.quantityOf(product.id);
      const persist$ = product.storeId
        ? this.rentify.setQuantity(product.storeId, product.id, targetQty)
        : this.rentify.addItem(product.id, quantity, product.storeId, variantId);
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
        : this.rentify.addItem(product.id, quantity, product.storeId, variantId);
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

  async clear(storeId?: string): Promise<void> {
    if (storeId) {
      this.guestItems.update((items) =>
        items.filter((item) => {
          const product = this.catalog.productById(item.productId) || this.localProductCache.get(item.productId) || item.product;
          return product?.storeId !== storeId && (item as any).storeId !== storeId;
        }),
      );
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.guestItems()));
      } catch {}
      try {
        const res = await firstValueFrom(this.rentify.clearCart(storeId));
        this.storeCarts.set(res?.carts || []);
      } catch {
        this.storeCarts.update((carts) => carts.filter((c) => c.storeId !== storeId));
      }
      return;
    }

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
    for (const group of this.groups()) {
      const item = group.lines.find((i) => i.product.id === productId);
      if (item) return item.quantity;
    }
    return 0;
  }

  contains(productId: string): boolean {
    return this.quantityOf(productId) > 0;
  }

  /**
   * Called after checkout: mirrors emptied state for a specific Store or all Stores.
   * If storeId is provided, preserves carts from all other stores.
   */
  markEmptied(storeId?: string): void {
    if (storeId) {
      this.storeCarts.update((carts) => carts.filter((c) => c.storeId !== storeId));
      this.guestItems.update((items) =>
        items.filter((item) => {
          const product =
            this.catalog.productById(item.productId) ||
            this.localProductCache.get(item.productId) ||
            item.product;
          return product?.storeId !== storeId && (item as any).storeId !== storeId;
        }),
      );
      this.acknowledgedStores.update((set) => {
        const next = new Set(set);
        next.delete(storeId);
        return next;
      });
      if (this.activeCheckoutStoreId() === storeId) {
        this.activeCheckoutStoreId.set(null);
      }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.guestItems()));
      } catch {}
      return;
    }

    this.storeCarts.set([]);
    this.guestItems.set([]);
    this.acknowledgedStores.set(new Set());
    this.activeCheckoutStoreId.set(null);
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
