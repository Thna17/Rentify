import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { CommerceApiService } from '../api/commerce-api.service';
import { ApiCart, ApiCartItem } from '../api/api.models';
import { AuthService } from '../auth/auth.service';
import { CatalogService } from '../catalog/catalog.service';
import { CartItem, CartLine, Product } from '../catalog/catalog.models';

const STORAGE_KEY = 'khmercraft.cart';
const FREE_SHIPPING_THRESHOLD = 50;
const SHIPPING_FLAT_RATE = 3.5;

/**
 * Cart state, shared app-wide, in one of two modes.
 *
 *   Signed in  → the server is the source of truth. Every mutation is a
 *                request, and the response replaces local state, so the
 *                totals shown are always the ones the server will charge.
 *   Guest      → localStorage, priced from the local catalog.
 *
 * On sign-in the guest basket is pushed to the server and then cleared, so a
 * visitor who fills a cart and only then logs in does not lose it — the single
 * most annoying bug this design avoids.
 */
@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly api = inject(CommerceApiService);
  private readonly auth = inject(AuthService);
  private readonly catalog = inject(CatalogService);

  /** Guest basket. Ignored entirely while signed in. */
  private readonly guestItems = signal<CartItem[]>(this.restore());

  /** Server cart. Null until the first fetch completes. */
  private readonly serverCart = signal<ApiCart | null>(null);

  private readonly signedIn = this.auth.isAuthenticated;

  readonly loading = signal(false);
  /** Last error from a cart mutation, e.g. "Only 3 left in stock". */
  readonly error = signal('');

  readonly lines = computed<CartLine[]>(() => {
    const cart = this.serverCart();
    if (this.signedIn() && cart) {
      return cart.items.map((item) => ({
        product: this.toProduct(item),
        quantity: item.quantity,
        lineTotal: item.subtotal,
      }));
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
    const cart = this.serverCart();
    if (this.signedIn() && cart) {
      return cart.itemCount;
    }
    return this.guestItems().reduce((total, item) => total + item.quantity, 0);
  });

  readonly subtotal = computed(() => {
    const cart = this.serverCart();
    if (this.signedIn() && cart) {
      return cart.subtotal;
    }
    return round(this.lines().reduce((total, line) => total + line.lineTotal, 0));
  });

  readonly shipping = computed(() => {
    const cart = this.serverCart();
    if (this.signedIn() && cart) {
      return cart.deliveryFee;
    }
    const subtotal = this.subtotal();
    return subtotal === 0 || subtotal >= FREE_SHIPPING_THRESHOLD
      ? 0
      : SHIPPING_FLAT_RATE;
  });

  readonly total = computed(() => {
    const cart = this.serverCart();
    if (this.signedIn() && cart) {
      return cart.total;
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
    // Persist the guest basket only. A signed-in cart lives on the server, and
    // mirroring it here would go stale the moment another tab changed it.
    effect(() => {
      if (!this.signedIn()) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.guestItems()));
      }
    });

    // Sign-in and sign-out both need the cart re-resolved.
    let wasSignedIn = false;
    effect(() => {
      const signedIn = this.signedIn();
      if (signedIn && !wasSignedIn) {
        wasSignedIn = true;
        void this.adoptGuestCart();
      } else if (!signedIn && wasSignedIn) {
        wasSignedIn = false;
        this.serverCart.set(null);
      }
    });
  }

  /**
   * Push the guest basket to the server, then load the merged result.
   *
   * Failures per line are swallowed on purpose: an item that went out of stock
   * while the visitor was browsing should not block the rest of the basket
   * from being adopted.
   */
  private async adoptGuestCart(): Promise<void> {
    this.loading.set(true);
    try {
      const pending = this.guestItems();
      for (const item of pending) {
        try {
          await firstValueFrom(this.api.addToCart(item.productId, item.quantity));
        } catch {
          // Skip this line; the rest of the basket still transfers.
        }
      }
      if (pending.length) {
        this.guestItems.set([]);
        localStorage.removeItem(STORAGE_KEY);
      }
      await this.refresh();
    } finally {
      this.loading.set(false);
    }
  }

  /** Re-read the server cart. Safe to call when signed out (no-op). */
  async refresh(): Promise<void> {
    if (!this.signedIn()) {
      return;
    }
    try {
      this.serverCart.set(await firstValueFrom(this.api.getCart()));
    } catch {
      // Leave the previous snapshot in place rather than blanking the cart.
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

    return this.mutate(() => this.api.addToCart(product.id, quantity));
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

    const line = this.serverItem(productId);
    if (!line) {
      return;
    }

    const next = line.quantity + delta;
    if (next <= 0) {
      await this.mutate(() => this.api.removeCartItem(line.id));
      return;
    }
    await this.mutate(() => this.api.updateCartItem(line.id, next));
  }

  async remove(productId: string): Promise<void> {
    if (!this.signedIn()) {
      this.guestItems.update((items) =>
        items.filter((item) => item.productId !== productId),
      );
      return;
    }

    const line = this.serverItem(productId);
    if (line) {
      await this.mutate(() => this.api.removeCartItem(line.id));
    }
  }

  async clear(): Promise<void> {
    if (!this.signedIn()) {
      this.guestItems.set([]);
      return;
    }
    await this.mutate(() => this.api.clearCart());
  }

  quantityOf(productId: string): number {
    if (this.signedIn()) {
      return this.serverItem(productId)?.quantity ?? 0;
    }
    return (
      this.guestItems().find((item) => item.productId === productId)?.quantity ??
      0
    );
  }

  contains(productId: string): boolean {
    return this.quantityOf(productId) > 0;
  }

  /** Called after checkout: the server already emptied it. */
  markEmptied(): void {
    this.serverCart.update((cart) =>
      cart ? { ...cart, items: [], itemCount: 0, subtotal: 0, deliveryFee: 0, total: 0 } : cart,
    );
    this.guestItems.set([]);
  }

  private serverItem(productId: string): ApiCartItem | undefined {
    return this.serverCart()?.items.find((item) => item.productId === productId);
  }

  /** Run a cart request, adopt its response, and surface any error message. */
  private async mutate(
    request: () => import('rxjs').Observable<ApiCart>,
  ): Promise<boolean> {
    this.loading.set(true);
    this.error.set('');
    try {
      this.serverCart.set(await firstValueFrom(request()));
      return true;
    } catch (error: unknown) {
      this.error.set(cartErrorMessage(error));
      return false;
    } finally {
      this.loading.set(false);
    }
  }

  /** Adapt a server cart line to the Product shape the UI already renders. */
  private toProduct(item: ApiCartItem): Product {
    const known = this.catalog.productById(item.productId);
    return {
      id: item.productId,
      name: item.productName,
      slug: item.productSlug,
      image: item.productImage,
      price: item.price,
      categorySlug: known?.categorySlug ?? '',
      categoryName: known?.categoryName ?? '',
      subcategory: known?.subcategory ?? null,
      subcategorySlug: known?.subcategorySlug ?? null,
      sellerName: item.sellerName,
      storeId: item.sellerId ?? known?.storeId ?? '',
      rating: known?.rating ?? 0,
      reviewCount: known?.reviewCount ?? 0,
      stock: item.stock,
      status:
        item.stock === 0
          ? 'out-of-stock'
          : item.stock <= 5
            ? 'low-stock'
            : 'in-stock',
      description: known?.description ?? '',
      soldCount: known?.soldCount ?? 0,
      createdAt: known?.createdAt ?? '',
      collections: known?.collections ?? [],
    };
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

/** Pull the server's message out, so "Only 3 left in stock" reaches the user. */
export const cartErrorMessage = (error: unknown): string => {
  const body = (error as { error?: { error?: { message?: string } } })?.error;
  return body?.error?.message ?? 'Could not update your cart. Please try again.';
};
