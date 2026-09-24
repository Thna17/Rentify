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

/**
 * Cart state, shared app-wide.
 *
 * Connected to Rentify Commerce API via RentifyMarketplaceService.
 *   Signed in  → Rentify Commerce API store-grouped cart (/api/marketplace/cart).
 *   Guest      → localStorage, priced from the catalog.
 *
 * On sign-in the guest basket is pushed to Rentify and then cleared.
 */
@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly rentify = inject(RentifyMarketplaceService);
  private readonly auth = inject(AuthService);
  private readonly catalog = inject(CatalogService);

  /** Guest basket. Ignored entirely while signed in. */
  private readonly guestItems = signal<CartItem[]>(this.restore());

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
          const known = this.catalog.productById(item.productId);
          const price = item.currentPrice
            ? parseFloat(item.currentPrice) || 0
            : known?.price || 0;
          const product: Product = known
            ? { ...known, price, sellerName: store?.name || known.sellerName || 'Local Merchant' }
            : {
                id: item.productId,
                name: 'Product',
                slug: item.productId,
                image: null,
                images: [],
                price,
                categorySlug: 'general',
                categoryName: 'General',
                subcategory: null,
                subcategorySlug: null,
                sellerName,
                storeId: cart.storeId,
                rating: 5,
                reviewCount: 0,
                stock: 99,
                status: item.available ? 'in-stock' : 'out-of-stock',
                description: '',
                soldCount: 0,
                createdAt: new Date().toISOString(),
                collections: [],
              };
          allLines.push({
            product,
            quantity: item.quantity,
            lineTotal: round(price * item.quantity),
          });
        }
      }
      return allLines;
    }

    return this.guestItems()
      .map((item) => {
        const product = this.catalog.productById(item.productId);
        return product
          ? {
              product,
              quantity: item.quantity,
              lineTotal: round(product.price * item.quantity),
            }
          : null;
      })
      .filter((line): line is CartLine => line !== null);
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
        this.storeCarts().reduce((sum, cart) => sum + (parseFloat(cart.subtotal) || 0), 0),
      );
    }
    return round(this.lines().reduce((total, line) => total + line.lineTotal, 0));
  });

  readonly shipping = computed(() => {
    if (this.signedIn()) {
      return round(
        this.storeCarts().reduce(
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
        this.storeCarts().reduce(
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
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.guestItems()));
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
  }

  getStoreCarts(): StoreCart[] {
    return this.storeCarts();
  }

  private async adoptGuestCart(): Promise<void> {
    this.loading.set(true);
    try {
      const pending = this.guestItems();
      const remaining: CartItem[] = [];
      for (const item of pending) {
        try {
          const product = this.catalog.productById(item.productId) || await this.catalog.loadProduct(item.productId);
          if (product?.storeId) {
            await firstValueFrom(
              this.rentify.setQuantity(product.storeId, item.productId, item.quantity),
            );
          } else {
            remaining.push(item);
          }
        } catch {
          remaining.push(item);
        }
      }
      this.guestItems.set(remaining);
      if (remaining.length === 0) {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
      }
      await this.refresh();
    } finally {
      this.loading.set(false);
    }
  }

  async refresh(): Promise<void> {
    if (!this.signedIn()) {
      return;
    }
    try {
      const res = await firstValueFrom(this.rentify.carts());
      this.storeCarts.set(res.carts || []);
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

    if (!this.signedIn()) {
      this.guestItems.update((items) => {
        const existing = items.find((item) => item.productId === product.id);
        if (!existing) {
          return [
            ...items,
            { productId: product.id, quantity: clamp(quantity, product) },
          ];
        }
        return items.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: clamp(item.quantity + quantity, product) }
            : item,
        );
      });
      return true;
    }

    try {
      this.loading.set(true);
      const existingCart = this.storeCarts().find((c) => c.storeId === product.storeId);
      const existingItem = existingCart?.items.find((it) => it.productId === product.id);
      const currentQty = existingItem?.quantity || 0;
      const res = await firstValueFrom(
        this.rentify.setQuantity(product.storeId, product.id, currentQty + quantity),
      );
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
    if (!this.signedIn()) {
      const product = this.catalog.productById(productId);
      this.guestItems.update((items) =>
        items
          .map((item) =>
            item.productId === productId
              ? {
                  ...item,
                  quantity: product
                    ? clamp(item.quantity + delta, product)
                    : item.quantity + delta,
                }
              : item,
          )
          .filter((item) => item.quantity > 0),
      );
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
    if (!this.signedIn()) {
      this.guestItems.update((items) =>
        items.filter((item) => item.productId !== productId),
      );
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
    if (!this.signedIn()) {
      this.guestItems.set([]);
      return;
    }
    for (const cart of this.storeCarts()) {
      for (const item of cart.items) {
        try {
          await firstValueFrom(this.rentify.setQuantity(cart.storeId, item.productId, 0));
        } catch {}
      }
    }
    await this.refresh();
  }

  quantityOf(productId: string): number {
    if (this.signedIn()) {
      for (const cart of this.storeCarts()) {
        const item = cart.items.find((i) => i.productId === productId);
        if (item) return item.quantity;
      }
      return 0;
    }
    return (
      this.guestItems().find((item) => item.productId === productId)?.quantity ??
      0
    );
  }

  contains(productId: string): boolean {
    return this.quantityOf(productId) > 0;
  }

  /** Called after checkout: mirrors emptied state. */
  markEmptied(): void {
    this.storeCarts.set([]);
    this.guestItems.set([]);
    localStorage.removeItem(STORAGE_KEY);
  }

  private restore(): CartItem[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return [];
      }
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed.filter(
        (item): item is CartItem =>
          typeof item?.productId === 'string' &&
          typeof item?.quantity === 'number' &&
          item.quantity > 0,
      );
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
