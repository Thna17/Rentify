import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth/auth.service';
import { CartService } from '../core/cart/cart.service';
import { CatalogService } from '../core/catalog/catalog.service';
import { ProductRailComponent } from '../components/user/catalog/product-rail/product-rail.component';
import { WishlistService } from '../core/wishlist/wishlist.service';
import { CartLine } from '../core/catalog/catalog.models';
import { NavbarComponent } from '../components/shared/layout/navbar/navbar.component';
import { FooterComponent } from '../components/shared/layout/footer/footer.component';
import { IconComponent } from '../components/shared/ui/icon/icon.component';

@Component({
  selector: 'app-cart',
  imports: [RouterLink, NavbarComponent, FooterComponent, IconComponent, ProductRailComponent],
  template: `
    <app-navbar />

    @if (!cart.isEmpty()) {
      <section class="container cart-layout">
        <header class="cart-header">
          <h1>Your cart</h1>
          <p class="sub">
            {{ cart.count() }} {{ cart.count() === 1 ? 'item' : 'items' }} from
            {{ storeCount() }}
            {{ storeCount() === 1 ? 'seller' : 'sellers' }}
          </p>
        </header>

        <div class="cart-items">
          <!-- Grouped by seller: this is a multi-vendor marketplace, and items
               from different artisans ship separately. -->
          @for (group of groups(); track group.storeId) {
            <div class="store-group card">
              <a class="store-label" [routerLink]="['/stores', group.storeId]">
                <ui-icon name="store" [size]="14" /> {{ group.sellerName }}
                <span>Separate shipment</span>
              </a>

              @for (line of group.lines; track line.product.id) {
                <div class="cart-item">
                  <div class="item-row">
                    <a class="item-thumb img-placeholder" [routerLink]="['/product', line.product.id]">
                      @if (line.product.image) {
                        <img [src]="line.product.image" [alt]="line.product.name" />
                      } @else {
                        {{ line.product.name }}
                      }
                    </a>
                    <div class="item-main">
                      <a
                        class="item-name"
                        [routerLink]="['/product', line.product.id]"
                        >{{ line.product.name }}</a
                      >
                      <span class="item-cat">{{ line.product.categoryName }}</span>
                      <span class="unit"
                        >\${{ line.product.price.toFixed(2) }} each</span
                      >

                      <div class="qty-stepper">
                        <button
                          type="button"
                          (click)="cart.changeQuantity(line.product.id, -1)"
                          aria-label="Decrease quantity"
                        >
                          <ui-icon name="minus" [size]="13" />
                        </button>
                        <span aria-live="polite">{{ line.quantity }}</span>
                        <button
                          type="button"
                          (click)="cart.changeQuantity(line.product.id, 1)"
                          [disabled]="line.quantity >= line.product.stock"
                          aria-label="Increase quantity"
                        >
                          <ui-icon name="plus" [size]="13" />
                        </button>
                      </div>
                      @if (line.quantity >= line.product.stock) {
                        <small class="max-note"
                          >Only {{ line.product.stock }} in stock</small
                        >
                      }
                    </div>
                    <div class="item-side">
                      <span class="line-total"
                        >\${{ line.lineTotal.toFixed(2) }}</span
                      >
                      <button
                        type="button"
                        class="move"
                        (click)="moveToWishlist(line)"
                      >
                        <ui-icon name="heart" [size]="13" /> Save for later
                      </button>
                      <button
                        type="button"
                        class="remove"
                        (click)="cart.remove(line.product.id)"
                      >
                        <ui-icon name="trash" [size]="13" /> Remove
                      </button>
                    </div>
                  </div>
                </div>
              }
            </div>
          }

          <button class="btn btn-ghost btn-sm continue" routerLink="/products">
            <ui-icon name="arrow-left" [size]="14" /> Continue shopping
          </button>
        </div>

        <aside class="summary card">
          <h2>Order summary</h2>
          <div class="row">
            <span>Subtotal ({{ cart.count() }} items)</span>
            <span>\${{ cart.subtotal().toFixed(2) }}</span>
          </div>
          <div class="row">
            <span>Current delivery estimate</span>
            @if (cart.shipping() === 0) {
              <span class="free">Free</span>
            } @else {
              <span>\${{ cart.shipping().toFixed(2) }}</span>
            }
          </div>

          <p class="ship-hint">
            Final shipping will be confirmed for each seller shipment at checkout.
          </p>

          <div class="row total">
            <span>Total</span>
            <span>\${{ cart.total().toFixed(2) }}</span>
          </div>

          <button
            class="btn btn-primary btn-block btn-lg"
            (click)="goToCheckout()"
          >
            Proceed to Checkout <ui-icon name="arrow-right" [size]="16" color="#fff" />
          </button>

          @if (!isAuthenticated()) {
            <p class="login-note">
              <ui-icon name="lock" [size]="13" />
              Guest checkout is being connected. This version currently asks you to sign in.
            </p>
          }

          <div class="trust-list">
            <div><ui-icon name="package" [size]="14" /> Items stay grouped by seller</div>
            <div><ui-icon name="info" [size]="14" /> Totals are checked before ordering</div>
          </div>
        </aside>
      </section>
    } @else {
      <section class="container empty-cart">
        <div class="empty-image img-placeholder">
          <ui-icon name="cart" [size]="40" />
        </div>
        <h1>Your cart is empty</h1>
        <p>
          Explore products from Cambodian stores across fashion, food,
          electronics, home, beauty and more.
        </p>
        <div class="empty-actions">
          <button class="btn btn-primary btn-lg" routerLink="/products">
            Browse Products
          </button>
          @if (!wishlist.isEmpty()) {
            <button class="btn btn-outline btn-lg" routerLink="/wishlist">
              View wishlist ({{ wishlist.count() }})
            </button>
          }
        </div>
      </section>
    }

    @if (recommended().length) {
      <section class="container section cart-suggestions">
        <app-product-rail
          [title]="cart.isEmpty() ? 'Popular right now' : 'Goes well with your cart'"
          [products]="recommended()"
          linkRoute="/products"
          linkLabel="See all products"
        />
      </section>
    }

    <app-footer />
  `,
  styles: [
    `
      .cart-layout {
        display: grid;
        grid-template-columns: 1fr 340px;
        column-gap: 32px;
        row-gap: 22px;
        padding: 32px 32px 44px;
        align-items: start;
      }
      .cart-header {
        grid-column: 1 / -1;
      }
      .cart-header h1 {
        font-size: 25px;
        margin-bottom: 6px;
      }
      .sub {
        color: var(--color-muted);
        font-size: 13.5px;
        margin-bottom: 0;
      }
      .store-group {
        padding: 16px 18px;
        margin-bottom: 14px;
      }
      .store-label {
        font-size: 12.5px;
        color: var(--color-muted);
        margin-bottom: 12px;
        display: flex;
        align-items: center;
        gap: 6px;
        font-weight: 600;
      }
      .store-label:hover {
        color: var(--color-accent);
      }
      .store-label span {
        margin-left: auto;
        color: var(--color-muted-2);
        font-size: 10.5px;
        font-weight: 600;
      }
      .cart-item + .cart-item {
        border-top: 1px solid var(--color-border);
        margin-top: 14px;
        padding-top: 14px;
      }
      .item-row {
        display: flex;
        align-items: flex-start;
        gap: 16px;
      }
      .item-thumb {
        width: 92px;
        height: 92px;
        border-radius: var(--radius-sm);
        flex-shrink: 0;
        font-size: 10px;
        text-align: center;
      }
      .item-main {
        display: flex;
        flex-direction: column;
        gap: 3px;
        flex: 1;
      }
      .item-name {
        font-size: 14.5px;
        font-weight: 650;
      }
      .item-name:hover {
        color: var(--color-accent);
      }
      .item-cat {
        color: var(--color-muted);
        font-size: 12px;
      }
      .unit {
        color: var(--color-text-secondary);
        font-size: 12.5px;
      }
      .qty-stepper {
        display: flex;
        align-items: center;
        gap: 13px;
        border: 1px solid var(--color-border-strong);
        border-radius: var(--radius-xs);
        padding: 5px 11px;
        width: fit-content;
        margin-top: 6px;
      }
      .qty-stepper button {
        background: none;
        border: 0;
        display: flex;
        color: var(--color-text-secondary);
      }
      .qty-stepper button:disabled {
        color: var(--color-muted-2);
        cursor: not-allowed;
      }
      .max-note {
        color: var(--color-gold);
        font-size: 11.5px;
        margin-top: 3px;
      }
      .item-side {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 8px;
      }
      .item-thumb { overflow: hidden; }
      .item-thumb img { height: 100%; object-fit: cover; width: 100%; }
      .line-total {
        font-size: 16px;
        font-weight: 700;
      }
      .move,
      .remove {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        border: 0;
        background: none;
        font-size: 12px;
        padding: 0;
      }
      .move {
        color: var(--color-muted);
      }
      .move:hover {
        color: var(--color-danger);
      }
      .remove {
        color: var(--color-danger);
      }
      .remove:hover {
        text-decoration: underline;
      }
      .continue {
        margin-top: 6px;
      }
      .summary {
        padding: 20px 22px;
        display: flex;
        flex-direction: column;
        gap: 11px;
        position: sticky;
        top: 100px;
      }
      .summary h2 {
        font-size: 16px;
        margin-bottom: 4px;
      }
      .row {
        display: flex;
        justify-content: space-between;
        font-size: 13.5px;
        color: var(--color-text-secondary);
      }
      .free {
        color: var(--color-success);
        font-weight: 650;
      }
      .ship-hint {
        color: var(--color-muted);
        font-size: 12px;
        line-height: 1.5;
      }
      .row.total {
        color: var(--color-text);
        font-weight: 700;
        font-size: 18px;
        border-top: 1px solid var(--color-border);
        padding-top: 14px;
        margin-top: 4px;
      }
      .login-note {
        display: flex;
        align-items: center;
        gap: 6px;
        color: var(--color-muted);
        font-size: 12px;
      }
      .trust-list {
        display: flex;
        flex-direction: column;
        gap: 7px;
        margin-top: 6px;
        padding-top: 14px;
        border-top: 1px solid var(--color-border);
        color: var(--color-muted);
        font-size: 12.5px;
      }
      .trust-list div {
        display: flex;
        align-items: center;
        gap: 7px;
      }
      .empty-cart {
        text-align: center;
        padding: 70px 32px 90px;
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      .empty-image {
        width: 180px;
        height: 180px;
        border-radius: 50%;
        margin-bottom: 28px;
        color: var(--color-muted-2);
      }
      .empty-cart h1 {
        font-size: 27px;
        margin-bottom: 12px;
      }
      .empty-cart p {
        color: var(--color-muted);
        font-size: 14px;
        max-width: 420px;
        margin-bottom: 26px;
        line-height: 1.6;
      }
      .empty-actions {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
        justify-content: center;
      }
      @media (max-width: 900px) {
        .cart-layout {
          grid-template-columns: 1fr;
        }
        .summary {
          position: static;
        }
      }
      @media (max-width: 560px) {
        .item-row {
          flex-wrap: wrap;
        }
        .item-side {
          align-items: flex-start;
          flex-direction: row;
          gap: 14px;
          width: 100%;
        }
      }
    `,
  ],
})
export class CartComponent {
  protected readonly cart = inject(CartService);
  private readonly catalog = inject(CatalogService);
  protected readonly wishlist = inject(WishlistService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly isAuthenticated = this.auth.isAuthenticated;

  /**
   * Something to look at after adding to the cart, rather than a dead end.
   *
   * Related, not random: products from the same categories as what is already
   * in the cart, and from the same sellers — so the suggestion is plausibly
   * something they would add to the same order, and often ships together.
   * Anything already in the cart is excluded, since suggesting it back is
   * noise. An empty cart has nothing to relate to, so it falls back to the
   * genuinely best-selling products.
   */
  protected readonly recommended = computed(() => {
    const all = this.catalog.allProducts();
    if (!all.length) return [];

    const inCart = new Set(this.cart.lines().map((line) => line.product.id));
    const candidates = all.filter((product) => !inCart.has(product.id));

    if (!inCart.size) {
      return [...candidates].sort((a, b) => b.soldCount - a.soldCount).slice(0, 12);
    }

    const categories = new Set(this.cart.lines().map((line) => line.product.categorySlug));
    const stores = new Set(this.cart.lines().map((line) => line.product.storeId));

    return [...candidates]
      .map((product) => ({
        product,
        // Same seller counts for more than same category: it is the one that
        // actually saves the shopper a second delivery.
        score:
          (stores.has(product.storeId) ? 2 : 0) +
          (categories.has(product.categorySlug) ? 1 : 0),
      }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score || b.product.soldCount - a.product.soldCount)
      .slice(0, 12)
      .map((entry) => entry.product);
  });

  /** Cart lines bucketed by seller, preserving first-seen store order. */
  protected readonly groups = computed(() => {
    const buckets = new Map<
      string,
      { storeId: string; sellerName: string; lines: CartLine[] }
    >();

    for (const line of this.cart.lines()) {
      const key = line.product.storeId;
      const bucket = buckets.get(key);
      if (bucket) {
        bucket.lines.push(line);
      } else {
        buckets.set(key, {
          storeId: key,
          sellerName: line.product.sellerName,
          lines: [line],
        });
      }
    }

    return [...buckets.values()];
  });

  protected readonly storeCount = computed(() => this.groups().length);

  protected moveToWishlist(line: CartLine): void {
    if (!this.wishlist.isWishlisted(line.product.id)) {
      this.wishlist.toggle(line.product.id);
    }
    this.cart.remove(line.product.id);
  }

  protected goToCheckout(): void {
    // The route guard also enforces this, but redirecting here keeps the
    // returnUrl pointing at checkout rather than the cart.
    this.router.navigate(['/checkout']);
  }
}
