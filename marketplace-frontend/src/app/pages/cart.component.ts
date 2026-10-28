import { KeyValuePipe } from '@angular/common';
import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth/auth.service';
import { CartService } from '../core/cart/cart.service';
import { CatalogService } from '../core/catalog/catalog.service';
import { ProductRailComponent } from '../components/user/catalog/product-rail/product-rail.component';
import { WishlistService } from '../core/wishlist/wishlist.service';
import { CartLine, StoreCartGroup, StoreCartGroupLine } from '../core/catalog/catalog.models';
import { NavbarComponent } from '../components/shared/layout/navbar/navbar.component';
import { FooterComponent } from '../components/shared/layout/footer/footer.component';
import { IconComponent } from '../components/shared/ui/icon/icon.component';
import { TranslatePipe } from '../core/i18n/translate.pipe';
import { TranslateService } from '../core/i18n/translate.service';
import { SeoService } from '../core/seo/seo.service';

@Component({
  selector: 'app-cart',
  host: {
    '(document:click)': 'onDocumentClick($event)',
    '(document:keydown.escape)': 'sheetOpen.set(false)',
  },
  imports: [
    KeyValuePipe,
    RouterLink,
    NavbarComponent,
    FooterComponent,
    IconComponent,
    ProductRailComponent,
    TranslatePipe,
  ],
  template: `
    <app-navbar />

    @if (!cart.isEmpty()) {
      <section class="container cart-layout">
        <header class="cart-header">
          <h1>{{ 'cart.title' | translate }}</h1>
          <p class="sub">
            {{ 'cart.itemsFromSellers' | translate:{
              count: cart.count(),
              stores: storeCount(),
              itemWord: cart.count() === 1 ? 'item' : 'items',
              sellerWord: storeCount() === 1 ? 'seller' : 'sellers'
            } }}
          </p>
        </header>

        <!-- Multi-vendor marketplace educational banner -->
        <div class="multi-vendor-banner" role="note">
          <ui-icon name="truck" [size]="18" />
          <div class="banner-text">
            <strong>{{ 'cart.multiVendorBanner' | translate }}</strong>
            <p>{{ 'cart.separateShipmentNotice' | translate }}</p>
          </div>
        </div>

        @if (cart.error()) {
          <div class="cart-error-banner" role="alert">
            <ui-icon name="info" [size]="18" />
            <span>{{ cart.error() }}</span>
            <button type="button" class="btn btn-outline btn-sm" (click)="cart.retry()">
              {{ 'cart.retry' | translate }}
            </button>
          </div>
        }

        <div class="cart-items">
          <!-- Distinct Store & Channel Groups -->
          @for (group of cart.groups(); track group.storeId) {
            <div
              class="store-group card"
              [class.not-ready]="!group.checkoutReady"
              [attr.aria-labelledby]="'store-heading-' + group.storeId"
            >
              <header class="group-header">
                <div class="group-brand">
                  <a
                    class="store-label"
                    [routerLink]="['/stores', group.storeId]"
                    [id]="'store-heading-' + group.storeId"
                  >
                    <ui-icon name="store" [size]="16" />
                    <span class="seller-title">{{ group.sellerName }}</span>
                  </a>
                  <span
                    class="channel-badge"
                    [class.storefront]="group.channel === 'storefront'"
                  >
                    {{
                      (group.channel === 'storefront'
                        ? 'cart.channelStorefront'
                        : 'cart.channelMarketplace'
                      ) | translate
                    }}
                  </span>
                </div>
                <span class="shipment-badge">
                  <ui-icon name="package" [size]="12" />
                  {{ 'cart.separateShipment' | translate }}
                </span>
              </header>

              @if (group.hasStalePrices) {
                <div class="stale-alert" role="alert">
                  <ui-icon name="info" [size]="15" />
                  <span>{{ 'cart.priceStaleReview' | translate }}</span>
                  <button
                    type="button"
                    class="btn btn-ghost btn-xs acknowledge-btn"
                    (click)="cart.acknowledgeStalePrices(group.storeId)"
                  >
                    {{ 'cart.acknowledgePrice' | translate }}
                  </button>
                </div>
              }

              <div class="group-items">
                @for (line of group.lines; track line.product.id + (line.variantId || "")) {
                  <div class="cart-item" [class.unavailable]="!line.available">
                    <div class="item-row">
                      <a
                        class="item-thumb img-placeholder"
                        [routerLink]="['/product', line.product.id]"
                      >
                        @if (line.product.image) {
                          <img [src]="line.product.image" [alt]="line.product.name" />
                        } @else {
                          <span>{{ line.product.name }}</span>
                        }
                      </a>
                      <div class="item-main">
                        <a
                          class="item-name"
                          [routerLink]="['/product', line.product.id]"
                        >
                          {{ line.product.name }}
                        </a>

                        <div class="selected-variant-preview">
                          @if (line.variantImage) { <img [src]="line.variantImage" alt="Selected variant" /> }
                          @for (option of line.optionValues | keyvalue; track option.key) {
                            <span>{{ option.key }}: {{ option.value }}</span>
                          }
                        </div>
                        <div class="item-sub-meta">
                          <span class="item-cat">{{ line.product.categoryName }}</span>
                          @if (line.sku) {
                            <span class="sku-tag">SKU: {{ line.sku }}</span>
                          }

                        </div>

                        @if (line.isPriceStale) {
                          <span class="price-stale-tag">
                            {{
                              'cart.priceChanged'
                                | translate
                                  : { was: line.unitPrice.toFixed(2), now: line.currentPrice.toFixed(2) }
                            }}
                          </span>
                        } @else {
                          <span class="unit">\${{ line.currentPrice.toFixed(2) }} each</span>
                        }

                        @if (!line.available) {
                          <span class="stock-badge oos">{{ 'cart.outOfStock' | translate }}</span>
                        } @else if (line.stockWarning) {
                          <span class="stock-badge low">{{ line.stockWarning }}</span>
                        }

                        <div class="qty-stepper">
                          <button
                            type="button"
                            (click)="cart.changeQuantity(line.product.id, -1, line.variantId)"
                            aria-label="Decrease quantity"
                          >
                            <ui-icon name="minus" [size]="13" />
                          </button>
                          <span aria-live="polite">{{ line.quantity }}</span>
                          <button
                            type="button"
                            (click)="cart.changeQuantity(line.product.id, 1, line.variantId)"
                            [disabled]="
                              !line.available ||
                              (line.stockLimit !== undefined &&
                                line.quantity >= line.stockLimit)
                            "
                            aria-label="Increase quantity"
                          >
                            <ui-icon name="plus" [size]="13" />
                          </button>
                        </div>
                      </div>

                      <div class="item-side">
                        <span class="line-total">\${{ line.lineTotal.toFixed(2) }}</span>
                        <button
                          type="button"
                          class="move"
                          (click)="moveToWishlist(line)"
                        >
                          <ui-icon name="heart" [size]="13" /> {{ 'cart.saveForLater' | translate }}
                        </button>
                        <button
                          type="button"
                          class="remove"
                          (click)="cart.remove(line.product.id, line.variantId)"
                        >
                          <ui-icon name="trash" [size]="13" /> {{ 'cart.remove' | translate }}
                        </button>
                      </div>
                    </div>
                  </div>
                }
              </div>

              <!-- Authoritative Commerce Store Financials & Independent Checkout Button -->
              <footer class="group-footer">
                <div class="financial-breakdown">
                  <div class="fin-row">
                    <span>{{ 'cart.subtotal' | translate }}</span>
                    <strong>\${{ group.subtotal }}</strong>
                  </div>
                  <div class="fin-row">
                    <span>{{ 'cart.deliveryFee' | translate }}</span>
                    <span>{{
                      group.deliveryFee
                        ? '\$' + group.deliveryFee
                        : ('cart.freeDelivery' | translate)
                    }}</span>
                  </div>
                  <div class="fin-row fin-total">
                    <span>{{ 'cart.exactTotal' | translate }}</span>
                    <strong>\${{ group.totalAmount || group.subtotal }}</strong>
                  </div>
                </div>

                <div class="group-actions">
                  @if (group.checkoutReady) {
                    <div class="ready-pill">
                      <ui-icon name="check" [size]="14" />
                      <span>{{ 'cart.readyForCheckout' | translate }}</span>
                    </div>
                    <button
                      type="button"
                      class="btn btn-primary checkout-store-btn"
                      (click)="checkoutStore(group.storeId)"
                    >
                      {{ 'cart.checkoutStore' | translate:{ name: group.sellerName } }}
                      <ui-icon name="arrow-right" [size]="14" color="#fff" />
                    </button>
                    <small class="preserved-hint">{{ 'cart.preservedNotice' | translate }}</small>
                  } @else {
                    <div class="issues-box" role="alert">
                      <div class="issues-title">
                        <ui-icon name="info" [size]="14" />
                        <span>{{ 'cart.notReady' | translate }}</span>
                      </div>
                      <ul>
                        @for (issue of group.issues; track issue) {
                          <li>{{ formatIssue(issue) }}</li>
                        }
                        @if (group.hasStalePrices) {
                          <li>{{ 'cart.priceStaleReview' | translate }}</li>
                        }
                      </ul>
                      @if (group.hasStalePrices) {
                        <button
                          type="button"
                          class="btn btn-outline btn-xs ack-btn"
                          (click)="cart.acknowledgeStalePrices(group.storeId)"
                        >
                          {{ 'cart.acknowledgePrice' | translate }}
                        </button>
                      }
                    </div>
                  }
                </div>
              </footer>
            </div>
          }

          <button class="btn btn-ghost btn-sm continue" routerLink="/products">
            <ui-icon name="arrow-left" [size]="14" /> {{ 'cart.continueShopping' | translate }}
          </button>
        </div>

        <!-- Desktop: sticky sidebar, always open. Phone (<=900px): a bottom sheet
             that shows only the total and checkout, and slides up for details. -->
        <aside
          #summary
          class="summary card"
          [class.open]="sheetOpen()"
          [attr.aria-label]="'cart.orderSummary' | translate"
        >
          <button
            type="button"
            class="sheet-grabber"
            (click)="toggleSheet()"
            aria-controls="summary-details"
            [attr.aria-label]="(sheetOpen() ? 'cart.hideDetails' : 'cart.showDetails') | translate"
          ></button>

          <div class="reveal" id="summary-details">
            <div class="reveal-inner">
              <h2>{{ 'cart.orderSummary' | translate }}</h2>
              <div class="row">
                <span>{{ 'cart.subtotal' | translate }} ({{ cart.count() }} items)</span>
                <span>\${{ cart.subtotal().toFixed(2) }}</span>
              </div>
              <div class="row">
                <span>{{ 'cart.deliveryFee' | translate }}</span>
                @if (cart.shipping() === 0) {
                  <span class="free">{{ 'cart.freeDelivery' | translate }}</span>
                } @else {
                  <span>\${{ cart.shipping().toFixed(2) }}</span>
                }
              </div>

              <div class="stores-summary-box">
                <span class="stores-count-label">
                  <ui-icon name="store" [size]="14" />
                  {{ storeCount() }} {{ storeCount() === 1 ? 'store cart' : 'store carts' }}
                </span>
                <p class="ship-hint">
                  {{ 'cart.independentOrdersNotice' | translate }}
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            class="row total"
            (click)="toggleSheet()"
            aria-controls="summary-details"
            [attr.aria-expanded]="sheetOpen()"
          >
            <span>{{ 'cart.exactTotal' | translate }}</span>
            <span class="total-value">
              \${{ cart.total().toFixed(2) }}
              <span class="chevron" aria-hidden="true"><ui-icon name="chevron-up" [size]="14" /></span>
            </span>
          </button>

          <!-- Phone, collapsed: one quiet line so the total has context. -->
          <div class="reveal collapsed-only">
            <div class="reveal-inner">
              <p class="sheet-hint">
                <ui-icon name="store" [size]="12" />
                {{ storeCount() }} {{ storeCount() === 1 ? 'store cart' : 'store carts' }}
                · {{ cart.count() }} {{ cart.count() === 1 ? 'item' : 'items' }}
              </p>
            </div>
          </div>

          @if (readyStores().length > 0) {
            <button
              class="btn btn-primary btn-block btn-lg checkout-btn"
              (click)="goToCheckout()"
            >
              {{ 'cart.checkoutSelectedStore' | translate }}
              <ui-icon name="arrow-right" [size]="16" color="#fff" />
            </button>
          } @else {
            <button class="btn btn-secondary btn-block btn-lg checkout-btn" disabled>
              {{ 'cart.notReady' | translate }}
            </button>
          }

          <div class="reveal">
            <div class="reveal-inner">
              @if (!isAuthenticated()) {
                <p class="login-note">
                  <ui-icon name="lock" [size]="13" />
                  Browse and add items without an account. Sign in or create one when you check out.
                </p>
              }

              <div class="trust-list">
                <div><ui-icon name="package" [size]="14" /> Items stay grouped by seller</div>
                <div><ui-icon name="check" [size]="14" /> Authoritative totals calculated by Commerce</div>
                <div><ui-icon name="shield" [size]="14" /> Cash on Delivery (COD) payment</div>
              </div>
            </div>
          </div>
        </aside>
      </section>
    } @else {
      <section class="container empty-cart">
        <div class="empty-image img-placeholder">
          <ui-icon name="cart" [size]="40" />
        </div>
        <h1>{{ 'cart.emptyTitle' | translate }}</h1>
        <p>{{ 'cart.emptySubtitle' | translate }}</p>
        <div class="empty-actions">
          <button class="btn btn-primary btn-lg" routerLink="/products">
            {{ 'state.browseProducts' | translate }}
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
      .selected-variant-preview { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; margin: 6px 0; font-size: 11px; color: var(--color-text-secondary); }
    .selected-variant-preview:empty { display: none; }
    .selected-variant-preview img { width: 32px; height: 32px; object-fit: contain; border: 1px solid var(--color-border); border-radius: 5px; }
    .selected-variant-preview span { padding: 3px 6px; background: var(--color-bg-alt); border-radius: 4px; }
    .cart-layout {
        display: grid;
        grid-template-columns: 1fr 360px;
        column-gap: 32px;
        row-gap: 22px;
        padding: 32px 32px 44px;
        align-items: start;
      }
      .cart-header {
        grid-column: 1 / -1;
      }
      .cart-header h1 {
        font-size: 26px;
        margin-bottom: 6px;
      }
      .sub {
        color: var(--color-muted);
        font-size: 14px;
        margin-bottom: 0;
      }
      .multi-vendor-banner {
        grid-column: 1 / -1;
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 12px 18px;
        background: #f0fdf4;
        border: 1px solid #bbf7d0;
        border-radius: var(--radius-md, 8px);
        color: #166534;
        font-size: 13.5px;
      }
      .multi-vendor-banner strong {
        display: block;
        font-weight: 650;
      }
      .multi-vendor-banner p {
        margin: 2px 0 0;
        color: #15803d;
        font-size: 12.5px;
      }
      .cart-error-banner {
        grid-column: 1 / -1;
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        background: #fef2f2;
        border: 1px solid #fecaca;
        border-radius: var(--radius-md, 8px);
        color: #991b1b;
        font-size: 13.5px;
      }
      .cart-error-banner button {
        margin-left: auto;
      }
      .store-group {
        padding: 20px;
        margin-bottom: 18px;
        border-radius: var(--radius-md, 8px);
        transition: border-color 0.2s;
      }
      .store-group.not-ready {
        border-color: #fde68a;
      }
      .group-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding-bottom: 14px;
        border-bottom: 1px solid var(--color-border, #e5e7eb);
        margin-bottom: 16px;
      }
      .group-brand {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .store-label {
        font-size: 15px;
        color: var(--color-text-primary, #111827);
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 700;
        text-decoration: none;
      }
      .store-label:hover {
        color: var(--color-accent, #2563eb);
      }
      .channel-badge {
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        padding: 2px 8px;
        border-radius: 999px;
        background: #e0f2fe;
        color: #0369a1;
      }
      .channel-badge.storefront {
        background: #fef3c7;
        color: #b45309;
      }
      .shipment-badge {
        display: flex;
        align-items: center;
        gap: 5px;
        color: var(--color-muted-2, #6b7280);
        font-size: 12px;
        font-weight: 600;
      }
      .stale-alert {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 14px;
        background: #fffbeb;
        border: 1px solid #fef3c7;
        border-radius: var(--radius-sm, 6px);
        color: #92400e;
        font-size: 12.5px;
        margin-bottom: 14px;
      }
      .acknowledge-btn {
        margin-left: auto;
        font-weight: 600;
        text-decoration: underline;
      }
      .cart-item + .cart-item {
        border-top: 1px solid var(--color-border, #e5e7eb);
        margin-top: 14px;
        padding-top: 14px;
      }
      .cart-item.unavailable {
        opacity: 0.75;
      }
      .item-row {
        display: flex;
        align-items: flex-start;
        gap: 16px;
      }
      .item-thumb {
        width: 88px;
        height: 88px;
        border-radius: var(--radius-sm, 6px);
        flex-shrink: 0;
        font-size: 11px;
        text-align: center;
        overflow: hidden;
      }
      .item-thumb img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .item-main {
        display: flex;
        flex-direction: column;
        gap: 4px;
        flex: 1;
      }
      .item-name {
        font-size: 15px;
        font-weight: 650;
        color: var(--color-text-primary, #111827);
        text-decoration: none;
      }
      .item-name:hover {
        color: var(--color-accent, #2563eb);
      }
      .item-sub-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        align-items: center;
        font-size: 12px;
        color: var(--color-muted, #6b7280);
      }
      .sku-tag,
      .opt-tag {
        background: var(--color-bg-subtle, #f3f4f6);
        padding: 1px 6px;
        border-radius: 4px;
        font-size: 11px;
      }
      .price-stale-tag {
        color: #b45309;
        font-weight: 600;
        font-size: 12.5px;
      }
      .unit {
        color: var(--color-text-secondary, #4b5563);
        font-size: 13px;
      }
      .stock-badge {
        font-size: 11px;
        font-weight: 600;
        padding: 2px 6px;
        border-radius: 4px;
        align-self: flex-start;
      }
      .stock-badge.oos {
        background: #fee2e2;
        color: #991b1b;
      }
      .stock-badge.low {
        background: #fef3c7;
        color: #b45309;
      }
      .qty-stepper {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-top: 6px;
      }
      .qty-stepper button {
        width: 28px;
        height: 28px;
        border-radius: var(--radius-sm, 6px);
        border: 1px solid var(--color-border, #d1d5db);
        background: var(--color-bg, #fff);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      }
      .qty-stepper button:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
      .qty-stepper span {
        min-width: 28px;
        text-align: center;
        font-weight: 600;
        font-size: 13.5px;
      }
      .item-side {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 8px;
      }
      .line-total {
        font-size: 16px;
        font-weight: 700;
        color: var(--color-text-primary, #111827);
      }
      .move,
      .remove {
        background: transparent;
        border: none;
        color: var(--color-muted, #6b7280);
        font-size: 12px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 5px;
        padding: 0;
      }
      .move:hover {
        color: var(--color-accent, #2563eb);
      }
      .remove:hover {
        color: #dc2626;
      }
      .group-footer {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        border-top: 1px solid var(--color-border, #e5e7eb);
        margin-top: 18px;
        padding-top: 16px;
        gap: 16px;
      }
      .financial-breakdown {
        display: flex;
        flex-direction: column;
        gap: 5px;
        min-width: 200px;
      }
      .fin-row {
        display: flex;
        justify-content: space-between;
        font-size: 13px;
        color: var(--color-text-secondary, #4b5563);
      }
      .fin-total {
        font-size: 15px;
        color: var(--color-text-primary, #111827);
        border-top: 1px dashed var(--color-border, #d1d5db);
        padding-top: 5px;
        margin-top: 2px;
      }
      .group-actions {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 6px;
      }
      .ready-pill {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 12px;
        color: #16a34a;
        font-weight: 600;
      }
      .checkout-store-btn {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-size: 13.5px;
        padding: 9px 18px;
      }
      .preserved-hint {
        font-size: 11px;
        color: var(--color-muted-2, #6b7280);
      }
      .issues-box {
        background: #fef2f2;
        border: 1px solid #fee2e2;
        border-radius: var(--radius-sm, 6px);
        padding: 10px 14px;
        font-size: 12px;
        color: #991b1b;
        max-width: 320px;
      }
      .issues-title {
        display: flex;
        align-items: center;
        gap: 5px;
        font-weight: 700;
        margin-bottom: 4px;
      }
      .issues-box ul {
        margin: 0;
        padding-left: 18px;
      }
      .ack-btn {
        margin-top: 8px;
      }
      .continue {
        margin-top: 16px;
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
      .summary {
        padding: 22px;
        border-radius: var(--radius-md, 8px);
        position: sticky;
        top: 20px;
      }
      /* Sheet-only parts are hidden on desktop, where everything is open. */
      .sheet-grabber,
      .chevron,
      .collapsed-only {
        display: none;
      }
      .summary h2 {
        font-size: 18px;
        margin-bottom: 14px;
      }
      .summary .row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 10px;
        font-size: 13.5px;
        color: var(--color-text-secondary, #4b5563);
      }
      .summary .row.total {
        width: 100%;
        align-items: center;
        border: 0;
        border-top: 1px solid var(--color-border, #e5e7eb);
        border-radius: 0;
        background: none;
        padding: 12px 0 0;
        margin: 12px 0 14px;
        font: inherit;
        font-size: 17px;
        font-weight: 700;
        color: var(--color-text-primary, #111827);
        text-align: left;
        cursor: default;
        pointer-events: none;
      }
      .total-value {
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }
      .free {
        color: #16a34a;
        font-weight: 600;
      }
      .stores-summary-box {
        background: var(--color-bg-subtle, #f9fafb);
        border: 1px solid var(--color-border, #e5e7eb);
        border-radius: var(--radius-sm, 6px);
        padding: 10px 12px;
        margin: 12px 0;
      }
      .stores-count-label {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12.5px;
        font-weight: 650;
      }
      .ship-hint {
        font-size: 11.5px;
        color: var(--color-muted, #6b7280);
        margin: 4px 0 0;
      }
      .btn-block {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      }
      .login-note {
        font-size: 12px;
        color: var(--color-muted, #6b7280);
        margin: 12px 0 0;
        display: flex;
        align-items: flex-start;
        gap: 6px;
        line-height: 1.4;
      }
      .trust-list {
        margin-top: 16px;
        padding-top: 16px;
        border-top: 1px solid var(--color-border, #e5e7eb);
        display: flex;
        flex-direction: column;
        gap: 8px;
        font-size: 12px;
        color: var(--color-muted-2, #6b7280);
      }
      .trust-list div {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .empty-cart {
        text-align: center;
        padding: 64px 20px;
        max-width: 520px;
        margin: 0 auto;
      }
      .empty-image {
        width: 72px;
        height: 72px;
        border-radius: 50%;
        margin: 0 auto 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--color-bg-subtle, #f3f4f6);
        color: var(--color-muted, #9ca3af);
      }
      .empty-cart h1 {
        font-size: 24px;
        margin-bottom: 8px;
      }
      .empty-cart p {
        color: var(--color-muted, #6b7280);
        font-size: 14px;
        line-height: 1.5;
        margin-bottom: 24px;
      }
      .empty-actions {
        display: flex;
        justify-content: center;
        gap: 12px;
      }
      .cart-suggestions {
        margin-top: 32px;
      }

      @media (max-width: 900px) {
        .cart-layout {
          /* minmax(0) so long store/product rows can't push the column wider than the screen */
          grid-template-columns: minmax(0, 1fr);
        }
        .group-footer {
          flex-direction: column;
          align-items: stretch;
        }
        .group-actions {
          align-items: stretch;
        }
        .checkout-store-btn {
          justify-content: center;
        }

        /* ---- Bottom sheet ---- */
        .summary {
          position: sticky;
          top: auto;
          bottom: 0;
          z-index: 30;
          /* bleed to the screen edges past .cart-layout's 32px side padding */
          margin: 8px -32px 0;
          padding: 0 20px calc(16px + env(safe-area-inset-bottom));
          border: 0;
          border-radius: 24px 24px 0 0;
          background: var(--color-surface);
          box-shadow: 0 -12px 40px rgba(15, 23, 42, 0.13);
        }
        .sheet-grabber {
          display: block;
          position: relative;
          width: 100%;
          height: 20px;
          min-height: 0;
          padding: 0;
          border: 0;
          background: none;
          cursor: pointer;
        }
        .sheet-grabber::before {
          content: '';
          position: absolute;
          left: 50%;
          top: 8px;
          width: 40px;
          height: 5px;
          margin-left: -20px;
          border-radius: 99px;
          background: var(--color-border-strong);
        }

        /* Auto-height reveal without measuring: grid rows 0fr -> 1fr. */
        .reveal {
          display: grid;
          grid-template-rows: 0fr;
          transition: grid-template-rows 230ms cubic-bezier(0.4, 0, 0.2, 1);
        }
        .reveal-inner {
          min-height: 0;
          overflow: hidden;
        }
        .summary.open .reveal {
          grid-template-rows: 1fr;
        }
        .collapsed-only {
          display: grid;
          grid-template-rows: 1fr;
        }
        .summary.open .collapsed-only {
          grid-template-rows: 0fr;
        }
        .summary h2 {
          margin: 6px 0 12px;
          font-size: 16px;
        }

        .summary .row.total {
          margin: 6px 0 2px;
          padding: 6px 0;
          border-top-color: transparent;
          font-size: 17px;
          cursor: pointer;
          pointer-events: auto;
          transition: font-size 230ms cubic-bezier(0.4, 0, 0.2, 1), border-color 230ms ease;
        }
        .summary.open .row.total {
          margin-top: 4px;
          padding-top: 12px;
          border-top-color: var(--color-border);
          font-size: 19px;
        }
        .chevron {
          display: grid;
          place-items: center;
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: var(--color-bg-alt);
          color: var(--color-text-secondary);
          transition: transform 230ms cubic-bezier(0.4, 0, 0.2, 1);
        }
        .summary.open .chevron {
          transform: rotate(180deg);
        }
        .sheet-hint {
          display: flex;
          align-items: center;
          gap: 5px;
          margin: 0 0 12px;
          font-size: 12.5px;
          color: var(--color-muted);
        }

        /* The panel grows while the button shrinks a little, so opening reads
           as the sheet expanding rather than the page being pushed around. */
        .checkout-btn {
          height: 52px;
          border-radius: 14px;
          transition: height 230ms cubic-bezier(0.4, 0, 0.2, 1);
        }
        .summary.open .checkout-btn {
          height: 48px;
        }
        .summary .stores-summary-box {
          margin-bottom: 4px;
        }
        .trust-list {
          margin-top: 12px;
          padding-top: 12px;
        }
      }

      /* Phone: give the item rows room; same content, tighter spacing. */
      @media (max-width: 600px) {
        .cart-layout {
          padding: 20px 16px 0;
        }
        .summary {
          margin: 8px -16px 0;
        }
        .store-group {
          padding: 14px;
        }
        .item-row {
          gap: 12px;
        }
        .item-thumb {
          width: 68px;
          height: 68px;
        }
        .item-main {
          min-width: 0;
        }
      }

      @media (max-width: 900px) and (prefers-reduced-motion: reduce) {
        .reveal,
        .summary .row.total,
        .chevron,
        .checkout-btn {
          transition-duration: 1ms;
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
  protected readonly translate = inject(TranslateService);
  private readonly seo = inject(SeoService);

  protected readonly isAuthenticated = this.auth.isAuthenticated;

  constructor() {
    this.seo.setPageTitle(this.translate.t('cart.title'));
  }

  protected readonly storeCount = computed(() => this.cart.groups().length);

  /** Phone bottom sheet: collapsed shows total + checkout, open shows the breakdown. */
  protected readonly sheetOpen = signal(false);
  private readonly summary = viewChild<ElementRef<HTMLElement>>('summary');

  protected toggleSheet(): void {
    this.sheetOpen.update((open) => !open);
  }

  /** Tapping anywhere outside the sheet closes it. */
  protected onDocumentClick(event: MouseEvent): void {
    if (this.sheetOpen() && !this.summary()?.nativeElement.contains(event.target as Node)) {
      this.sheetOpen.set(false);
    }
  }

  protected readonly readyStores = computed(() =>
    this.cart.groups().filter((g) => g.checkoutReady),
  );

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
        score:
          (stores.has(product.storeId) ? 2 : 0) +
          (categories.has(product.categorySlug) ? 1 : 0),
      }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score || b.product.soldCount - a.product.soldCount)
      .slice(0, 12)
      .map((entry) => entry.product);
  });

  protected optionEntries(options?: Record<string, string>): Array<[string, string]> {
    return options ? Object.entries(options) : [];
  }

  protected formatIssue(issue: string): string {
    if (issue.includes('Seller is not available')) {
      return this.translate.t('cart.issueSellerUnavailable');
    }
    if (issue.includes('delivery fee')) {
      return this.translate.t('cart.issueNoDeliveryPolicy');
    }
    if (issue.includes('unavailable or has insufficient stock')) {
      return this.translate.t('cart.issueStockInsufficient');
    }
    if (issue.includes('empty')) {
      return this.translate.t('cart.issueEmpty');
    }
    return issue;
  }

  protected moveToWishlist(line: StoreCartGroupLine): void {
    if (!this.wishlist.isWishlisted(line.product.id)) {
      this.wishlist.toggle(line.product.id);
    }
    this.cart.remove(line.product.id, line.variantId);
  }

  protected checkoutStore(storeId: string): void {
    this.cart.selectStoreForCheckout(storeId);
    void this.router.navigate(['/checkout'], {
      queryParams: { storeId },
    });
  }

  protected goToCheckout(): void {
    const ready = this.readyStores();
    if (ready.length > 0) {
      this.checkoutStore(ready[0].storeId);
    } else {
      void this.router.navigate(['/checkout']);
    }
  }
}
