import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartService } from '../core/cart/cart.service';
import { WishlistService } from '../core/wishlist/wishlist.service';
import { Product } from '../core/catalog/catalog.models';
import { NavbarComponent } from '../components/shared/layout/navbar/navbar.component';
import { FooterComponent } from '../components/shared/layout/footer/footer.component';
import { IconComponent } from '../components/shared/ui/icon/icon.component';
import { ProductCardComponent } from '../components/user/catalog/product-card/product-card.component';

@Component({
  selector: 'app-wishlist',
  imports: [
    RouterLink,
    NavbarComponent,
    FooterComponent,
    IconComponent,
    ProductCardComponent,
  ],
  template: `
    <app-navbar />

    @if (!wishlist.isEmpty()) {
      <section class="container wishlist">
        <div class="head-row">
          <div>
            <h1>Your wishlist</h1>
            <p class="sub">
              {{ wishlist.count() }} saved
              {{ wishlist.count() === 1 ? 'item' : 'items' }}
              <span>· Saved on this device</span>
            </p>
          </div>
          <div class="head-actions">
            <button class="btn btn-outline btn-sm" (click)="moveAllToCart()">
              <ui-icon name="cart" [size]="14" /> Move all to cart
            </button>
            <button class="btn btn-ghost btn-sm" (click)="clearWishlist()">
              Clear wishlist
            </button>
          </div>
        </div>

        <div class="product-grid">
          @for (product of wishlist.products(); track product.id) {
            <app-product-card [product]="product" />
          }
        </div>

        @if (movedCount(); as moved) {
          <p class="feedback" role="status">
            <ui-icon name="check-circle" [size]="14" />
            {{ moved }} {{ moved === 1 ? 'item' : 'items' }} moved to your cart.
            <a routerLink="/cart">View cart</a>
          </p>
        }
      </section>
    } @else {
      <section class="container empty-state">
        <div class="empty-image img-placeholder">
          <ui-icon name="heart" [size]="40" />
        </div>
        <h1>Your wishlist is empty</h1>
        <p>
          Tap the heart on any product to save it here for later.
        </p>
        <button class="btn btn-primary btn-lg" routerLink="/products">
          Browse Products
        </button>
      </section>
    }

    <app-footer />
  `,
  styles: [
    `
      .wishlist {
        padding: 30px 32px 60px;
      }
      .head-row {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 20px;
        flex-wrap: wrap;
        margin-bottom: 22px;
      }
      h1 {
        font-size: 25px;
      }
      .sub {
        margin-top: 5px;
        color: var(--color-muted);
        font-size: 13.5px;
      }
      .sub span { color: var(--color-muted-2); }
      .head-actions {
        display: flex;
        gap: 10px;
      }
      .product-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
        gap: 18px;
      }
      .feedback {
        display: flex;
        align-items: center;
        gap: 7px;
        margin-top: 20px;
        color: var(--color-success);
        font-size: 13px;
        font-weight: 600;
      }
      .feedback a {
        color: var(--color-accent);
        text-decoration: underline;
      }
      .empty-state {
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
      .empty-state h1 {
        font-size: 27px;
        margin-bottom: 12px;
      }
      .empty-state p {
        color: var(--color-muted);
        font-size: 14px;
        max-width: 420px;
        margin-bottom: 26px;
        line-height: 1.6;
      }
      @media (max-width: 1100px) {
        .product-grid {
          grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
        }
      }
      @media (max-width: 820px) {
        .product-grid {
          grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
        }
      }
      @media (max-width: 520px) {
        .product-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class WishlistComponent {
  protected readonly wishlist = inject(WishlistService);
  private readonly cart = inject(CartService);

  protected readonly movedCount = signal(0);

  protected clearWishlist(): void {
    if (window.confirm('Remove every saved item from this device?')) {
      this.wishlist.clear();
    }
  }

  protected async moveAllToCart(): Promise<void> {
    const saved: Product[] = [...this.wishlist.products()];
    let moved = 0;

    for (const product of saved) {
      // Sold-out items stay on the wishlist rather than vanishing silently.
      if (await this.cart.add(product)) {
        this.wishlist.remove(product.id);
        moved += 1;
      }
    }

    this.movedCount.set(moved);
  }
}
