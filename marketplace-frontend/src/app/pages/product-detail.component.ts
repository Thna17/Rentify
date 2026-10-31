import { Component, computed, effect, ElementRef, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { firstValueFrom, map } from 'rxjs';
import { CartService } from '../core/cart/cart.service';
import { FlyToCartService } from '../core/cart/fly-to-cart.service';
import { CatalogService } from '../core/catalog/catalog.service';
import { WishlistService } from '../core/wishlist/wishlist.service';
import { AuthService } from '../core/auth/auth.service';
import { SeoService } from '../core/seo/seo.service';
import { TranslateService } from '../core/i18n/translate.service';
import { ErrorSanitizerService } from '../core/i18n/error-sanitizer.service';
import { TranslatePipe } from '../core/i18n/translate.pipe';
import {
  RentifyMarketplaceService,
  ProductReview,
  ProductReviewSummary,
} from '../core/rentify/rentify-marketplace.service';
import { NavbarComponent } from '../components/shared/layout/navbar/navbar.component';
import { FooterComponent } from '../components/shared/layout/footer/footer.component';
import { IconComponent } from '../components/shared/ui/icon/icon.component';
import { ProductRailComponent } from '../components/user/catalog/product-rail/product-rail.component';
import { VariantPickerComponent } from '../components/user/catalog/variant-picker/variant-picker.component';
import { BuyerReportModalComponent } from '../components/shared/reports/buyer-report-modal.component';
import { Product, ProductVariantView, StockStatus } from '../core/catalog/catalog.models';

@Component({
  selector: 'app-product-detail',
  imports: [
    RouterLink,
    NavbarComponent,
    FooterComponent,
    IconComponent,
    ProductRailComponent,
    VariantPickerComponent,
    BuyerReportModalComponent,
    TranslatePipe,
  ],
  host: {
    '(document:keydown.escape)': 'onEscape()',
  },
  template: `
    <app-navbar />

    @if (!catalog.loaded()) {
      <section class="container missing" aria-live="polite">
        <ui-icon class="spin" name="loader" [size]="30" />
        <h1>{{ 'state.loadingProduct' | translate }}</h1>
      </section>
    } @else if (catalog.productError()) {
      <section class="container missing" role="alert">
        <ui-icon name="alert-circle" [size]="32" />
        <h1>{{ 'state.couldNotLoadProduct' | translate }}</h1>
        <p>{{ catalog.productError() | translate }}</p>
        <button class="btn btn-primary" type="button" (click)="catalog.load()">{{ 'state.tryAgain' | translate }}</button>
      </section>
    } @else if (product(); as p) {
      <section class="container detail">
        <nav class="crumbs" [attr.aria-label]="'common.breadcrumb' | translate">
          <a routerLink="/">{{ 'nav.home' | translate }}</a> <span class="sep" aria-hidden="true">›</span>
          <a routerLink="/products">{{ 'nav.products' | translate }}</a> <span class="sep" aria-hidden="true">›</span>
          <a routerLink="/products" [queryParams]="{ category: p.categorySlug }">{{
            p.categoryName
          }}</a>
          <span class="sep" aria-hidden="true">›</span> <span class="crumb-current" aria-current="page">{{ p.name }}</span>
        </nav>

        <div class="product-layout">
          <div class="gallery">
            @if (galleryShots(p).length > 1) {
              <div class="shot-rail" role="group" [attr.aria-label]="'product.productPhotos' | translate">
                @for (shot of galleryShots(p); track shot; let i = $index) {
                  <button
                    type="button"
                    class="shot"
                    [class.active]="shownImage(p) === shot"
                    [attr.aria-pressed]="shownImage(p) === shot"
                    (click)="pickImage(shot)"
                    [attr.aria-label]="'product.photoN' | translate: { n: i + 1 }"
                  >
                    <img [src]="shot" alt="" loading="lazy" />
                  </button>
                }
              </div>
            }

            @if (shownImage(p); as image) {
              @if (!imageError()) {
                <img
                  class="main-image product-photo"
                  [src]="image"
                  [alt]="p.name"
                  (error)="onMainImageError()"
                  (click)="zoomOpen.set(true)"
                  tabindex="0"
                  (keydown.enter)="zoomOpen.set(true)"
                  [title]="'product.clickToZoom' | translate"
                  [attr.aria-label]="'product.photoClickToZoom' | translate"
                />
              } @else {
                <div class="main-image img-placeholder error-img">
                  <ui-icon name="image" [size]="36" />
                  <span>{{ p.name }}</span>
                  <small>{{ 'state.imageLoadFailed' | translate }}</small>
                </div>
              }
            } @else {
              <div class="main-image img-placeholder">{{ p.name }}</div>
            }
          </div>

          <div class="info">
            <header class="title-block">
              <a class="seller-sub" [routerLink]="['/stores', p.storeId]">
                <ui-icon name="store" [size]="14" />
                <span>{{ p.sellerName }}</span>
                <ui-icon class="seller-chevron" name="chevron-right" [size]="12" />
              </a>
              <h1>{{ p.name }}</h1>
              @if (effectiveReviewCount() > 0) {
                <a class="rating-row rating-link" href="#reviews">
                  <ui-icon name="star" [size]="14" [filled]="true" class="stars" />
                  <span class="rating-value">{{ effectiveRating().toFixed(1) }}</span>
                  <span class="count">({{ effectiveReviewCount() }} {{ effectiveReviewCount() === 1 ? ('product.verifiedReview' | translate) : ('product.verifiedReviews' | translate) }})</span>
                </a>
              } @else {
                <a class="rating-row no-reviews rating-link" href="#reviews">{{ 'product.noReviewsYet' | translate }}</a>
              }
            </header>

            <div class="price-stock">
              <div class="price-block">
                <span class="price">\${{ effectivePrice().toFixed(2) }}</span>
                @if (effectiveCompareAt(); as was) {
                  <span class="was">\${{ was.toFixed(2) }}</span>
                  <span class="discount">-{{ effectiveDiscount() }}%</span>
                }
              </div>
              <!-- One stock line for the selected variant; the picker no longer
                   repeats it, so the shopper never reads two counts. -->
              <p
                class="stock"
                [class.low]="effectiveStatus() === 'low-stock'"
                [class.out]="effectiveStatus() === 'out-of-stock'"
                aria-live="polite"
              >
                <span class="dot" aria-hidden="true"></span>
                @if (effectiveStatus() === 'out-of-stock') {
                  {{ 'catalog.outOfStock' | translate }}
                } @else if (effectiveStatus() === 'low-stock') {
                  {{ 'catalog.lowStock' | translate:{ count: effectiveStock() } }}
                } @else {
                  {{ 'product.inStockItems' | translate:{ count: effectiveStock() } }}
                }
              </p>
            </div>

            <app-variant-picker
              class="options"
              [product]="p"
              (variantChange)="onVariantChange($event)"
              (skuChange)="onSkuChange($event)"
            />

            <div class="buy-row">
              <div class="qty-stepper" role="group" [attr.aria-label]="'product.quantity' | translate">
                <button
                  type="button"
                  (click)="step(-1)"
                  [disabled]="quantity() <= 1 || effectiveStatus() === 'out-of-stock'"
                  [attr.aria-label]="'product.decreaseQty' | translate"
                >
                  <ui-icon name="minus" [size]="14" />
                </button>
                <span class="qty-value" aria-live="polite">{{ quantity() }}</span>
                <button
                  type="button"
                  (click)="step(1)"
                  [disabled]="quantity() >= effectiveStock()"
                  [attr.aria-label]="'product.increaseQty' | translate"
                >
                  <ui-icon name="plus" [size]="14" />
                </button>
              </div>
              <button
                class="btn add-btn"
                [disabled]="effectiveStatus() === 'out-of-stock'"
                (click)="addToCart($event)"
              >
                <ui-icon name="cart" [size]="17" />
                {{ effectiveStatus() === 'out-of-stock' ? ('catalog.outOfStock' | translate) : ('product.addToCart' | translate) }}
              </button>
              <button
                class="btn wish"
                [class.saved]="saved()"
                (click)="toggleWishlist()"
                [attr.aria-pressed]="saved()"
                [attr.aria-label]="saved() ? ('product.removeFromWishlist' | translate) : ('product.saveToWishlist' | translate)"
                [title]="saved() ? ('product.removeFromWishlist' | translate) : ('product.saveToWishlist' | translate)"
              >
                <ui-icon name="heart" [size]="19" [filled]="saved()" />
              </button>
            </div>

            @if (feedback(); as message) {
              <p class="feedback" role="status">
                <ui-icon name="check-circle" [size]="15" />
                <span>{{ message }}</span>
                <a routerLink="/cart">{{ 'product.viewCart' | translate }}</a>
              </p>
            }

            <ul class="purchase-info" [attr.aria-label]="'product.orderInformation' | translate">
              <li><ui-icon name="store" [size]="16" /><span><strong>{{ 'product.shipsFromSeller' | translate }}</strong><small>{{ 'product.shipsFromSellerSub' | translate }}</small></span></li>
              <li><ui-icon name="info" [size]="16" /><span><strong>{{ 'product.totalConfirmed' | translate }}</strong><small>{{ 'product.totalConfirmedSub' | translate }}</small></span></li>
            </ul>

            @if (p.description) {
              <p class="desc">{{ p.description }}</p>
            }

            <div class="report-action-row">
              <button
                type="button"
                class="btn-report-listing"
                (click)="showReportModal.set(true)"
                [title]="'product.reportListing' | translate"
              >
                <ui-icon name="alert-circle" [size]="13" />
                <span>{{ 'product.reportListing' | translate }}</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- Customer Reviews & Ratings Section -->
      <section class="container reviews-section" id="reviews">
        <div class="reviews-section-header">
          <h2>{{ 'product.customerReviews' | translate }}</h2>
          <p class="section-subtitle">{{ 'product.verifiedShoppers' | translate }}</p>
        </div>

        <div class="reviews-summary-grid">
          <div class="summary-score-card card">
            <div class="score-number">{{ effectiveRating() ? effectiveRating().toFixed(1) : '0.0' }}</div>
            <div class="score-stars">
              @for (star of [1, 2, 3, 4, 5]; track star) {
                <ui-icon name="star" [size]="18" [filled]="star <= Math.round(effectiveRating())" class="star-icon" />
              }
            </div>
            <span class="score-count">Based on {{ effectiveReviewCount() }} {{ effectiveReviewCount() === 1 ? 'verified review' : 'verified reviews' }}</span>
          </div>

          <div class="summary-breakdown-card card">
            <div class="breakdown-list">
              @for (star of [5, 4, 3, 2, 1]; track star) {
                <div class="breakdown-row">
                  <span class="breakdown-star-label">{{ star }} <ui-icon name="star" [size]="12" [filled]="true" /></span>
                  <div class="breakdown-bar-track">
                    <div class="breakdown-bar-fill" [style.width.%]="getDistributionPercent(star)"></div>
                  </div>
                  <span class="breakdown-count">{{ getDistributionCount(star) }}</span>
                </div>
              }
            </div>
          </div>

          <div class="write-review-prompt card">
            @if (auth.isAuthenticated()) {
              <h3>{{ 'product.leaveFeedback' | translate }}</h3>
              <p>{{ 'product.leaveFeedbackSub' | translate }}</p>
              <a href="#write-review" class="btn btn-outline btn-block">{{ 'product.writeReview' | translate }}</a>
            } @else {
              <h3>{{ 'product.reviewedByRealBuyers' | translate }}</h3>
              <p>{{ 'product.signInToReviewSub' | translate }}</p>
              <a [href]="auth.getLoginUrl()" class="btn btn-primary btn-block">{{ 'product.signInToReview' | translate }}</a>
            }
          </div>
        </div>

        @if (auth.isAuthenticated()) {
          <div class="review-form-card card" id="write-review">
            <h3>{{ 'product.writeReview' | translate }}</h3>
            <p class="form-desc">{{ 'product.shareDetails' | translate }}</p>

            @if (reviewFeedback()) {
              <div class="alert-box alert-success" role="status">
                <ui-icon name="check-circle" [size]="16" />
                <span>{{ reviewFeedback() | translate }}</span>
              </div>
            }
            @if (reviewError()) {
              <div class="alert-box alert-danger" role="alert">
                <ui-icon name="alert-circle" [size]="16" />
                <span>{{ reviewError() | translate }}</span>
              </div>
            }

            <form (submit)="handleReviewSubmit($event)" class="review-form">
              <div class="form-field">
                <label class="field-label">{{ 'product.overallRating' | translate }}</label>
                <div class="star-picker" role="radiogroup" [attr.aria-label]="'product.selectStarRating' | translate">
                  @for (star of [1, 2, 3, 4, 5]; track star) {
                    <button
                      type="button"
                      class="star-pick-btn"
                      [class.active]="star <= newRating()"
                      (click)="setNewRating(star)"
                      [attr.aria-label]="'product.starsN' | translate: { count: star }"
                    >
                      <ui-icon name="star" [size]="22" [filled]="star <= newRating()" />
                    </button>
                  }
                  <span class="rating-label-text">{{ newRating() }} out of 5 stars</span>
                </div>
              </div>

              <div class="form-field">
                <label class="field-label" for="review-comment">{{ 'product.reviewDetails' | translate }}</label>
                <textarea
                  id="review-comment"
                  rows="3"
                  class="review-textarea"
                  [placeholder]="'product.reviewPlaceholder' | translate"
                  [value]="newComment()"
                  (input)="onCommentInput($event)"
                  maxlength="2000"
                  required
                ></textarea>
                <span class="char-count">{{ newComment().length }}/2000 characters</span>
              </div>

              <button
                type="submit"
                class="btn btn-primary"
                [disabled]="submittingReview() || !newComment().trim()"
              >
                @if (submittingReview()) {
                  <ui-icon name="loader" class="spin" [size]="15" /> Submitting...
                } @else {
                  Submit Review
                }
              </button>
            </form>
          </div>
        }

        <div class="reviews-feed">
          <h3>{{ 'product.recentReviews' | translate }}</h3>

          @if (reviewsLoading()) {
            <div class="feed-state">
              <ui-icon name="loader" class="spin" [size]="24" />
              <span>{{ 'product.loadingReviews' | translate }}</span>
            </div>
          } @else if (reviews().length === 0) {
            <div class="feed-empty card">
              <ui-icon name="star" [size]="32" class="empty-star" />
              <h4>{{ 'common.noReviewsYet' | translate }}</h4>
              <p>{{ 'product.beFirstReview' | translate }}</p>
            </div>
          } @else {
            <div class="reviews-list">
              @for (rev of reviews(); track rev.id) {
                <article class="review-item card">
                  <div class="review-header">
                    <div class="reviewer-info">
                      <div class="reviewer-avatar">{{ (rev.buyerName || 'B')[0].toUpperCase() }}</div>
                      <div>
                        <div class="reviewer-title">
                          <strong>{{ rev.buyerName || 'Verified Buyer' }}</strong>
                          @if (rev.isVerifiedPurchase) {
                            <span class="verified-tag">
                              <ui-icon name="check-circle" [size]="12" /> {{ 'product.verifiedPurchase' | translate }}
                            </span>
                          }
                        </div>
                        <span class="review-time">{{ formatDate(rev.createdAt) }}</span>
                      </div>
                    </div>
                    <div class="review-stars-row">
                      @for (star of [1, 2, 3, 4, 5]; track star) {
                        <ui-icon name="star" [size]="14" [filled]="star <= rev.rating" class="star-icon" />
                      }
                    </div>
                  </div>
                  <p class="review-text">{{ rev.comment }}</p>
                </article>
              }
            </div>
          }
        </div>
      </section>

      @if (related().length) {
        <section class="container related-section">
          <app-product-rail
            [title]="'product.moreFrom' | translate: { category: p.categoryName }"
            [products]="related()"
            linkRoute="/products"
            [linkParams]="{ category: p.categorySlug }"
          />
        </section>
      }
    } @else {
      <section class="container missing" role="alert">
        <ui-icon name="package" [size]="42" />
        <h1>{{ 'state.productNotFound' | translate }}</h1>
        <p>{{ 'state.productDelisted' | translate }}</p>
        <div class="missing-actions">
          <button class="btn btn-primary" routerLink="/products">
            {{ 'state.browseProducts' | translate }}
          </button>
          <button class="btn btn-outline" type="button" (click)="catalog.load()">
            {{ 'state.tryAgain' | translate }}
          </button>
        </div>
      </section>
    }

    @if (zoomOpen() && shownImage(product()!)) {
      <div
        class="lightbox"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="'product.enlargedImage' | translate"
        (click)="zoomOpen.set(false)"
      >
        <div class="lightbox-content" (click)="$event.stopPropagation()">
          <button
            type="button"
            class="lightbox-close"
            (click)="zoomOpen.set(false)"
            [attr.aria-label]="'product.closeZoom' | translate"
          >
            <ui-icon name="x" [size]="20" />
          </button>
          <img [src]="shownImage(product()!)" [alt]="product()?.name || ''" />
        </div>
      </div>
    }

    @if (showReportModal() && product(); as p) {
      <buyer-report-modal
        subjectType="product"
        [subjectId]="p.id"
        [subjectTitle]="p.name"
        (closed)="showReportModal.set(false)"
      />
    }

    <app-footer />
  `,
  styles: [
    `
      /* The product section takes Rentify's jade brand from the shared tokens.
         Scoped to .detail so the navbar and footer keep their own palette;
         the variant picker inherits it through --color-accent. */
      .detail {
        --color-accent: var(--rentify-color-brand-primary);
        --color-accent-hover: var(--rentify-color-brand-primary-hover);
        --color-accent-soft: var(--rentify-color-brand-primary-subtle);
        --pd-brand-active: var(--rentify-color-brand-primary-active);
        --pd-on-brand: var(--rentify-color-text-inverse);
        padding: 20px var(--page-gutter) 0;
      }
      .detail :focus-visible {
        outline: 2px solid var(--color-accent);
        outline-offset: 2px;
      }
      .crumbs {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12.5px;
        color: var(--color-muted);
        margin-bottom: 20px;
        min-width: 0;
        white-space: nowrap;
      }
      .crumbs a { flex-shrink: 0; transition: color var(--dur-fast) ease; }
      .crumbs a:hover { color: var(--color-accent); }
      .crumbs .sep { color: var(--color-muted-2); }
      .crumb-current {
        color: var(--color-text-secondary);
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .product-layout {
        display: grid;
        grid-template-columns: minmax(0, 1.08fr) minmax(0, 1fr);
        gap: clamp(28px, 4.5vw, 72px);
        align-items: start;
      }

      /* Thumbnail rail down the left of the main photo, the way a phone listing
         usually reads. Moves below the image on tablet and phone. */
      .gallery { display: grid; grid-template-columns: 64px minmax(0, 1fr); gap: 14px; align-items: start; }
      .gallery:has(.shot-rail) .main-image { grid-column: 2; }
      .gallery:not(:has(.shot-rail)) { grid-template-columns: minmax(0, 1fr); }
      .shot-rail {
        display: flex; flex-direction: column; gap: 10px;
        max-height: 560px; overflow-y: auto; scrollbar-width: none;
        padding: 2px;
      }
      .shot-rail::-webkit-scrollbar { display: none; }
      .shot {
        background: var(--color-surface); border: 1px solid var(--color-border);
        border-radius: var(--radius-sm); cursor: pointer; overflow: hidden; padding: 4px;
        aspect-ratio: 1; width: 100%; flex-shrink: 0;
        transition: border-color var(--dur-fast) ease, box-shadow var(--dur-fast) ease;
      }
      .shot img { display: block; width: 100%; height: 100%; object-fit: contain; }
      .shot:hover { border-color: var(--color-border-strong); }
      .shot.active { border-color: var(--color-accent); box-shadow: 0 0 0 1px var(--color-accent); }

      /* Same square box as the product card, so a product does not change
         shape when you click it. */
      .main-image {
        aspect-ratio: 1;
        width: 100%;
        height: auto;
        border-radius: var(--radius-lg);
        font-size: 13px;
        overflow: hidden;
        border: 1px solid var(--color-border);
        background: var(--color-surface);
        cursor: zoom-in;
      }
      .product-photo {
        display: block;
        object-fit: contain;
        object-position: center;
        padding: clamp(16px, 3vw, 36px);
        transition: transform var(--dur-slow) var(--ease-out);
      }
      @media (hover: hover) {
        .product-photo:hover { transform: scale(1.015); }
      }
      .img-placeholder {
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--color-muted);
        background: var(--color-bg-alt);
        text-align: center;
        padding: 20px;
      }
      .error-img {
        flex-direction: column;
        gap: 8px;
      }

      /* ---------------------------------------------------------- info */
      .info {
        display: flex;
        flex-direction: column;
        gap: 18px;
        min-width: 0;
        max-width: 540px;
      }
      @media (min-width: 1024px) {
        .info { position: sticky; top: calc(var(--header-h) + 24px); }
      }
      .title-block {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 6px;
      }
      .seller-sub {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        min-height: 28px;
        color: var(--color-text-secondary);
        font-size: 13px;
        font-weight: 600;
        text-decoration: none;
        max-width: 100%;
        transition: color var(--dur-fast) ease;
      }
      .seller-sub span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .seller-sub ui-icon { color: var(--color-muted); flex-shrink: 0; transition: color var(--dur-fast) ease, transform var(--dur-fast) ease; }
      .seller-sub:hover, .seller-sub:hover ui-icon { color: var(--color-accent); }
      .seller-sub:hover .seller-chevron { transform: translateX(2px); }
      .info h1 {
        font-size: clamp(22px, 2.3vw, 30px);
        font-weight: 700;
        line-height: 1.2;
        letter-spacing: -0.022em;
        margin: 0;
        overflow-wrap: anywhere;
      }
      .rating-row {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        min-height: 24px;
        font-size: 13px;
        color: var(--color-text-secondary);
      }
      .rating-row .stars { color: var(--color-gold); }
      .rating-value { color: var(--color-text); font-weight: 650; }
      .rating-row .count { color: var(--color-muted); }
      .no-reviews { color: var(--color-muted); font-size: 12.5px; }
      .rating-link { text-decoration: none; transition: color var(--dur-fast) ease; }
      .rating-link:hover, .rating-link:hover .count { color: var(--color-accent); }

      .price-stock {
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding-bottom: 18px;
        border-bottom: 1px solid var(--color-border);
      }
      .price-block {
        display: flex;
        align-items: baseline;
        flex-wrap: wrap;
        gap: 4px 10px;
      }
      .price {
        font-size: clamp(24px, 2.2vw, 28px);
        font-weight: 750;
        letter-spacing: -0.025em;
        font-variant-numeric: tabular-nums;
        color: var(--color-text);
      }
      .was {
        color: var(--color-muted);
        font-size: 15px;
        text-decoration: line-through;
        font-variant-numeric: tabular-nums;
      }
      .discount {
        align-self: center;
        padding: 2px 8px;
        border-radius: var(--radius-full);
        background: var(--color-accent-soft);
        color: var(--color-accent);
        font-size: 12px;
        font-weight: 700;
      }
      .stock {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        margin: 0;
        font-size: 13px;
        font-weight: 500;
        color: var(--color-success);
      }
      .stock .dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: currentColor;
        flex-shrink: 0;
      }
      .stock.low { color: var(--rentify-color-warning-text); }
      .stock.out { color: var(--color-danger); font-weight: 600; }

      /* --------------------------------------------------- purchase row */
      .buy-row {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr) auto;
        grid-template-areas: 'qty add wish';
        gap: 10px;
        align-items: stretch;
      }
      .qty-stepper {
        grid-area: qty;
        display: flex;
        align-items: center;
        height: 50px;
        border: 1px solid var(--color-border-strong);
        border-radius: var(--radius-md);
        background: var(--color-surface);
      }
      .qty-stepper button {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 44px;
        height: 100%;
        background: none;
        border: 0;
        border-radius: var(--radius-md);
        color: var(--color-text);
        cursor: pointer;
        transition: background var(--dur-fast) ease;
      }
      .qty-stepper button:hover:not(:disabled) { background: var(--color-bg-alt); }
      .qty-stepper button:disabled { color: var(--color-muted-2); cursor: not-allowed; }
      .qty-value {
        min-width: 28px;
        text-align: center;
        font-size: 15px;
        font-weight: 600;
        font-variant-numeric: tabular-nums;
      }
      .add-btn {
        grid-area: add;
        min-height: 50px;
        padding: 0 20px;
        border-radius: var(--radius-md);
        background: var(--color-accent);
        color: var(--pd-on-brand);
        font-size: 15px;
        transition: background var(--dur-fast) ease, box-shadow var(--dur-fast) ease, transform var(--dur-fast) ease;
      }
      .add-btn:hover:not(:disabled) { background: var(--color-accent-hover); box-shadow: var(--shadow-sm); }
      .add-btn:active:not(:disabled) { background: var(--pd-brand-active); transform: scale(0.99); }
      .add-btn:disabled {
        opacity: 1;
        background: var(--rentify-color-disabled-bg);
        color: var(--rentify-color-disabled-text);
      }
      .wish {
        grid-area: wish;
        width: 50px;
        min-height: 50px;
        padding: 0;
        border-radius: var(--radius-md);
        border: 1px solid var(--color-border-strong);
        background: var(--color-surface);
        color: var(--color-text-secondary);
        transition: color var(--dur-fast) ease, border-color var(--dur-fast) ease, background var(--dur-fast) ease;
      }
      .wish:hover { border-color: var(--color-muted); color: var(--color-text); }
      .wish.saved {
        color: var(--color-danger);
        border-color: var(--color-danger);
        background: var(--color-danger-soft);
      }

      .feedback {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 6px 8px;
        margin: -6px 0 0;
        color: var(--color-success);
        font-size: 13px;
        font-weight: 600;
        animation: fadeInUp var(--dur-base) var(--ease-out) both;
      }
      .feedback a {
        color: var(--color-accent);
        text-decoration: underline;
        text-underline-offset: 2px;
      }

      .purchase-info {
        list-style: none;
        margin: 0;
        padding: 4px 16px;
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
      }
      .purchase-info li {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 12px 0;
        color: var(--color-accent);
      }
      .purchase-info li + li { border-top: 1px solid var(--color-border); }
      .purchase-info ui-icon { flex-shrink: 0; margin-top: 1px; }
      .purchase-info span { display: grid; gap: 2px; }
      .purchase-info strong { color: var(--color-text); font-size: 13px; font-weight: 600; }
      .purchase-info small { color: var(--color-muted); font-size: 12px; line-height: 1.45; }

      .desc {
        margin: 0;
        color: var(--color-text-secondary);
        font-size: 14.5px;
        line-height: 1.7;
        white-space: pre-line;
        overflow-wrap: anywhere;
      }

      .related-section {
        padding: 44px var(--page-gutter) 60px;
      }
      .missing {
        padding: 70px 32px 90px;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 14px;
      }
      .missing-actions {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 12px;
        margin-top: 12px;
      }
      .lightbox {
        position: fixed;
        inset: 0;
        z-index: 1000;
        background: rgba(0, 0, 0, 0.88);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
        backdrop-filter: blur(6px);
      }
      .lightbox-content {
        position: relative;
        max-width: 90vw;
        max-height: 90vh;
      }
      .lightbox-content img {
        max-width: 100%;
        max-height: 85vh;
        object-fit: contain;
        border-radius: var(--radius-md);
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
      }
      .lightbox-close {
        position: absolute;
        top: -48px;
        right: 0;
        width: 44px;
        height: 44px;
        background: none;
        border: 0;
        color: var(--rentify-color-text-inverse);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .missing > ui-icon { color: var(--color-accent); }
      .spin { animation: spin 900ms linear infinite; }
      @keyframes spin { to { transform: rotate(360deg); } }

      /* Tablet: keep two columns, but give the photo the full column width
         by moving the thumbnails underneath it. */
      @media (max-width: 960px) {
        .gallery { grid-template-columns: minmax(0, 1fr); gap: 10px; }
        .gallery:has(.shot-rail) .main-image { grid-column: 1; grid-row: 1; }
        .gallery:has(.shot-rail) .shot-rail { grid-row: 2; }
        .shot-rail { flex-direction: row; max-height: none; overflow-x: auto; overflow-y: hidden; }
        .shot { width: 60px; flex: 0 0 60px; }
        .info { gap: 16px; }
      }
      /*
       * 680px, not 900px. A tablet is 768-834px wide in portrait, so at 900 it
       * fell into the phone layout with every detail below the fold. Two
       * columns still work comfortably here.
       */
      @media (max-width: 680px) {
        .detail { padding-top: 12px; }
        .crumbs { margin-bottom: 12px; font-size: 12px; }
        .product-layout { grid-template-columns: minmax(0, 1fr); gap: 20px; }
        .main-image { border-radius: var(--radius-md); }
        .shot { width: 56px; flex-basis: 56px; }
        .info { max-width: none; gap: 14px; }
        .price-stock { padding-bottom: 14px; }
        .desc { font-size: 14px; line-height: 1.65; }
        .related-section { padding: 32px var(--page-gutter) 44px; }
      }
      /* Narrow phones: the call to action gets the whole row so its label
         never truncates (Khmer runs longer than English). */
      @media (max-width: 400px) {
        .buy-row {
          grid-template-columns: auto minmax(0, 1fr);
          grid-template-areas: 'qty wish' 'add add';
        }
        .wish { justify-self: end; }
        .qty-stepper, .add-btn, .wish { height: 48px; min-height: 48px; }
        .wish { width: 48px; }
        .purchase-info { padding: 2px 14px; }
      }

      .rating-link {
        text-decoration: none;
        cursor: pointer;
        transition: opacity 150ms ease;
      }
      .rating-link:hover {
        opacity: 0.8;
      }
      .reviews-section {
        padding: 40px 32px 0;
        border-top: 1px solid var(--color-border);
        margin-top: 40px;
      }
      .reviews-section-header {
        margin-bottom: 24px;
      }
      .reviews-section-header h2 {
        font-size: 22px;
        font-weight: 700;
        color: var(--color-text);
        margin-bottom: 4px;
      }
      .section-subtitle {
        color: var(--color-muted);
        font-size: 13.5px;
        margin: 0;
      }
      .reviews-summary-grid {
        display: grid;
        grid-template-columns: 200px 1fr 280px;
        gap: 20px;
        align-items: stretch;
        margin-bottom: 30px;
      }
      .summary-score-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: 24px;
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
      }
      .score-number {
        font-size: 44px;
        font-weight: 800;
        color: var(--color-text);
        line-height: 1;
        margin-bottom: 8px;
      }
      .score-stars {
        display: flex;
        gap: 4px;
        color: var(--color-gold);
        margin-bottom: 8px;
      }
      .score-count {
        font-size: 12px;
        color: var(--color-muted);
      }
      .summary-breakdown-card {
        padding: 20px 24px;
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        display: flex;
        flex-direction: column;
        justify-content: center;
      }
      .breakdown-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .breakdown-row {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 12.5px;
      }
      .breakdown-star-label {
        display: inline-flex;
        align-items: center;
        gap: 3px;
        width: 36px;
        color: var(--color-text-secondary);
        font-weight: 600;
      }
      .breakdown-bar-track {
        flex: 1;
        height: 8px;
        background: var(--color-bg-alt);
        border-radius: var(--radius-full);
        overflow: hidden;
      }
      .breakdown-bar-fill {
        height: 100%;
        background: var(--color-gold);
        border-radius: var(--radius-full);
        transition: width 300ms ease;
      }
      .breakdown-count {
        width: 30px;
        text-align: right;
        color: var(--color-muted);
        font-size: 12px;
      }
      .write-review-prompt {
        padding: 20px 24px;
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        display: flex;
        flex-direction: column;
        justify-content: center;
        gap: 8px;
      }
      .write-review-prompt h3 {
        font-size: 16px;
        font-weight: 650;
        margin: 0;
      }
      .write-review-prompt p {
        font-size: 13px;
        color: var(--color-muted);
        margin: 0 0 8px;
        line-height: 1.4;
      }
      .review-form-card {
        padding: 24px;
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        margin-bottom: 30px;
      }
      .review-form-card h3 {
        font-size: 18px;
        font-weight: 700;
        margin-bottom: 4px;
      }
      .form-desc {
        font-size: 13px;
        color: var(--color-muted);
        margin-bottom: 18px;
      }
      .review-form {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .form-field {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .field-label {
        font-size: 13px;
        font-weight: 600;
        color: var(--color-text-secondary);
      }
      .star-picker {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .star-pick-btn {
        background: none;
        border: none;
        padding: 2px;
        cursor: pointer;
        color: var(--color-muted-2);
        transition: color 150ms ease, transform 150ms ease;
      }
      .star-pick-btn.active {
        color: var(--color-gold);
      }
      .star-pick-btn:hover {
        transform: scale(1.15);
      }
      .rating-label-text {
        margin-left: 10px;
        font-size: 13px;
        color: var(--color-muted);
        font-weight: 500;
      }
      .review-textarea {
        width: 100%;
        border: 1.5px solid var(--color-border-strong);
        border-radius: var(--radius-sm);
        padding: 10px 12px;
        font-family: inherit;
        font-size: 13.5px;
        color: var(--color-text);
        background: var(--color-surface);
        resize: vertical;
        min-height: 80px;
        box-sizing: border-box;
      }
      .review-textarea:focus {
        outline: none;
        border-color: var(--color-accent);
      }
      .char-count {
        font-size: 11.5px;
        color: var(--color-muted);
        text-align: right;
      }
      .alert-box {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 14px;
        border-radius: var(--radius-sm);
        font-size: 13px;
        margin-bottom: 14px;
      }
      .alert-box.alert-success {
        background: var(--color-success-soft);
        color: var(--color-success);
        border: 1px solid var(--color-success);
      }
      .alert-box.alert-danger {
        background: var(--color-danger-soft);
        color: var(--color-danger);
        border: 1px solid var(--color-danger);
      }
      .reviews-feed {
        margin-top: 24px;
      }
      .reviews-feed h3 {
        font-size: 18px;
        font-weight: 700;
        margin-bottom: 16px;
      }
      .reviews-list {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .review-item {
        padding: 18px 20px;
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
      }
      .review-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 10px;
      }
      .reviewer-info {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .reviewer-avatar {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: var(--color-accent-soft);
        color: var(--color-accent);
        font-weight: 700;
        font-size: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      .reviewer-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
      }
      .verified-tag {
        display: inline-flex;
        align-items: center;
        gap: 3px;
        font-size: 11px;
        font-weight: 600;
        color: var(--color-success);
        background: var(--color-success-soft);
        padding: 2px 7px;
        border-radius: var(--radius-full);
      }
      .review-time {
        font-size: 11.5px;
        color: var(--color-muted);
      }
      .review-stars-row {
        display: flex;
        gap: 3px;
        color: var(--color-gold);
      }
      .review-text {
        font-size: 14px;
        line-height: 1.6;
        color: var(--color-text-secondary);
        margin: 0;
      }
      .feed-state {
        display: flex;
        align-items: center;
        gap: 10px;
        color: var(--color-muted);
        padding: 24px 0;
      }
      .feed-empty {
        text-align: center;
        padding: 40px 20px;
        background: var(--color-surface);
        border: 1px dashed var(--color-border-strong);
        border-radius: var(--radius-md);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
      }
      .feed-empty h4 {
        font-size: 15px;
        margin: 0;
        font-weight: 650;
      }
      .feed-empty p {
        font-size: 13px;
        color: var(--color-muted);
        margin: 0;
      }
      .empty-star {
        color: var(--color-muted-2);
      }

      @media (max-width: 860px) {
        .reviews-summary-grid {
          grid-template-columns: 1fr;
        }
      }

      .report-action-row {
        margin-top: -6px;
        display: flex;
        justify-content: flex-start;
      }
      .btn-report-listing {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: transparent;
        border: 0;
        color: var(--color-muted);
        font-size: 12px;
        cursor: pointer;
        min-height: 32px;
        padding: 4px 0;
        border-radius: var(--radius-sm);
        transition: color 0.15s ease;
      }
      .btn-report-listing:hover {
        color: var(--color-danger);
      }
    `,
  ],
})
export class ProductDetailComponent {
  readonly showReportModal = signal(false);
  // --------------------------------------------------------------- gallery
  /**
   * Which photo the main frame is showing. Null means "whatever the product
   * leads with" — picking a colour or a thumbnail pins it until the shopper
   * navigates to a different product.
   */
  private readonly pinnedImage = signal<string | null>(null);
  private readonly pinnedVariant = signal<string | null>(null);

  protected pickImage(image: string): void {
    this.pinnedImage.set(image);
    this.pinnedVariant.set(null);
  }

  /** Real swatch colour for a variant label. Multi-word / unknown labels
   *  fall back to a neutral grey rather than guessing wrong. */
  private static readonly COLOR_MAP: Record<string, string> = {
    black: '#1c1c1e', white: '#f5f5f7', silver: '#e3e4e6', gold: '#f0dfc0',
    red: '#d6362c', blue: '#3f6fd1', green: '#4f8f5b', purple: '#8a63d2',
    pink: '#e58fb0', yellow: '#f2cf4a', orange: '#e08a3c', burgundy: '#5c2331',
    glacier: '#dfe6ea', lavender: '#c9b8e8', sage: '#a9b598',
    'cloud white': '#f2f1ec', 'light gold': '#e9dcc0', 'sky blue': '#a9c6de',
    'space black': '#2b2b2e',
  };

  protected swatchColor(label: string): string {
    return ProductDetailComponent.COLOR_MAP[label.toLowerCase()] ?? '#c7c7cc';
  }

  protected pickVariant(variant: { label: string; image: string }): void {
    this.pinnedImage.set(variant.image);
    this.pinnedVariant.set(variant.label);
  }

  protected shownImage(product: Product): string | null {
    return this.pinnedImage() ?? product.image ?? null;
  }

  protected chosenVariantLabel(product: Product): string {
    const pinned = this.pinnedVariant();
    if (pinned) return pinned;
    // Nothing picked yet: if the lead photo happens to be one of the variants,
    // show that as selected rather than leaving every swatch unlit.
    const match = product.variants?.find((v) => v.image === product.image);
    return match?.label ?? product.variants?.[0]?.label ?? '';
  }

  /** Lead photo first, then the extra shots, then any variant not already shown. */
  protected galleryShots(product: Product): string[] {
    const shots = [
      product.image,
      ...(product.images ?? []),
      ...(product.variants ?? []).map((variant) => variant.image),
    ].filter((shot): shot is string => Boolean(shot));
    return [...new Set(shots)];
  }

  private readonly route = inject(ActivatedRoute);
  protected readonly catalog = inject(CatalogService);
  private readonly cart = inject(CartService);
  private readonly flyToCart = inject(FlyToCartService);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly wishlist = inject(WishlistService);
  protected readonly auth = inject(AuthService);
  private readonly rentify = inject(RentifyMarketplaceService);
  private readonly seo = inject(SeoService);
  protected readonly translate = inject(TranslateService);
  private readonly errors = inject(ErrorSanitizerService);
  protected readonly Math = Math;

  // Variant & SKU resolution
  readonly currentVariant = signal<ProductVariantView | null>(null);
  readonly currentSku = signal<string>('');
  readonly imageError = signal(false);
  readonly zoomOpen = signal(false);

  // Reviews state
  protected readonly reviews = signal<ProductReview[]>([]);
  protected readonly reviewSummary = signal<ProductReviewSummary | null>(null);
  protected readonly reviewsLoading = signal(false);
  protected readonly reviewsLoaded = signal(false);
  protected readonly reviewsError = signal('');

  // Review Form state
  protected readonly newRating = signal(5);
  protected readonly newComment = signal('');
  protected readonly submittingReview = signal(false);
  protected readonly reviewFeedback = signal('');
  protected readonly reviewError = signal('');

  private readonly id = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('id') ?? '')),
    { initialValue: this.route.snapshot.paramMap.get('id') ?? '' },
  );

  readonly product = computed(() => this.catalog.productById(this.id()));

  readonly effectivePrice = computed(() => this.currentVariant()?.price ?? this.product()?.price ?? 0);
  readonly effectiveCompareAt = computed(() => this.currentVariant()?.compareAtPrice ?? this.product()?.compareAtPrice);
  readonly effectiveStock = computed(() => this.currentVariant()?.stockQuantity ?? this.product()?.stock ?? 0);
  readonly effectiveStatus = computed<StockStatus>(() => {
    const s = this.effectiveStock();
    return s === 0 ? 'out-of-stock' : s <= 5 ? 'low-stock' : 'in-stock';
  });
  readonly effectiveDiscount = computed(() => {
    const compare = this.effectiveCompareAt();
    const price = this.effectivePrice();
    if (!compare || compare <= price) return 0;
    return Math.round(((compare - price) / compare) * 100);
  });

  protected readonly effectiveRating = computed(() => {
    const summary = this.reviewSummary();
    if (summary && summary.total > 0) return summary.average;
    return this.product()?.rating ?? 0;
  });

  protected readonly effectiveReviewCount = computed(() => {
    const summary = this.reviewSummary();
    if (summary) return summary.total;
    return this.product()?.reviewCount ?? 0;
  });

  /** A pinned photo belongs to one product; drop it when the route changes. */
  private readonly resetGalleryOnNavigate = effect(() => {
    this.id();
    this.pinnedImage.set(null);
    this.pinnedVariant.set(null);
    this.currentVariant.set(null);
    this.imageError.set(false);
    this.zoomOpen.set(false);
  });
  protected readonly related = computed(() => {
    const current = this.product();
    return current ? this.catalog.related(current, 8) : [];
  });

  protected readonly quantity = signal(1);
  protected readonly feedback = signal('');

  protected readonly saved = computed(() => this.wishlist.isWishlisted(this.id()));

  protected readonly discount = computed(() => {
    const current = this.product();
    if (!current?.compareAtPrice) {
      return 0;
    }
    return Math.round(
      ((current.compareAtPrice - current.price) / current.compareAtPrice) * 100,
    );
  });

  constructor() {
    // Navigating between related products reuses this component instance, so
    // the quantity and any stale confirmation must reset when the id changes.
    effect(() => {
      this.id();
      this.quantity.set(1);
      this.feedback.set('');
    });
    effect(() => {
      const currentId = this.id();
      if (currentId && !this.catalog.productById(currentId)) {
        void this.catalog.loadProduct(currentId);
      }
    });
    effect(() => {
      const p = this.product();
      if (p) {
        this.seo.setProductMetadata(p);
        this.imageError.set(false);
      } else if (this.catalog.loaded()) {
        this.seo.setPageTitle(this.translate.t('state.productNotFound'));
      }
    });
    effect(() => {
      const currentId = this.id();
      if (currentId) {
        this.reviewFeedback.set('');
        this.reviewError.set('');
        this.newComment.set('');
        this.newRating.set(5);
        void this.loadProductReviews(currentId);
      }
    });
  }

  protected onVariantChange(variant: ProductVariantView): void {
    this.currentVariant.set(variant);
    this.quantity.set(1);
    if (variant.image) {
      this.pinnedImage.set(variant.image);
    }
  }

  protected onSkuChange(sku: string): void {
    this.currentSku.set(sku);
  }

  protected onMainImageError(): void {
    this.imageError.set(true);
  }

  protected onEscape(): void {
    this.zoomOpen.set(false);
  }

  protected step(delta: number): void {
    const stock = this.effectiveStock();
    if (stock <= 0) return;
    this.quantity.update((value) =>
      Math.max(1, Math.min(value + delta, stock)),
    );
  }

  protected async addToCart(event?: Event): Promise<void> {
    const current = this.product();
    if (!current) {
      return;
    }
    const units = this.quantity();
    const variant = this.currentVariant();

    const effectiveProduct: Product = {
      ...current,
      price: this.effectivePrice(),
      compareAtPrice: this.effectiveCompareAt(),
      stock: this.effectiveStock(),
      status: this.effectiveStatus(),
      sku: this.currentSku() || current.sku,
    };
    if (variant) {
      (effectiveProduct as any).variantId = variant.id;
    }

    const image = this.host.nativeElement.querySelector('.main-image') as HTMLElement | null;
    const trigger = event?.currentTarget as HTMLElement | undefined;
    const rect = image?.getBoundingClientRect();
    const imageOnScreen = Boolean(
      rect &&
        rect.bottom > 0 &&
        rect.top < window.innerHeight &&
        rect.right > 0 &&
        rect.left < window.innerWidth,
    );
    const source = imageOnScreen && image ? image : trigger;
    if (source) {
      this.flyToCart.fly(current.image, source, current.name);
    }

    if (!(await this.cart.add(effectiveProduct, units, variant?.id))) {
      // cart.error carries the server's reason, e.g. "Only 3 left in stock".
      this.feedback.set('');
      return;
    }
    this.feedback.set(this.t('product.addedToCart', { count: units, name: current.name }));
  }

  protected t(key: string, params?: Record<string, string | number>): string {
    return this.translate.t(key, params);
  }

  protected toggleWishlist(): void {
    this.wishlist.toggle(this.id());
  }

  protected async loadProductReviews(productId: string): Promise<void> {
    if (!productId) return;
    this.reviewsLoading.set(true);
    this.reviewsError.set('');
    try {
      const res = await firstValueFrom(this.rentify.reviews(productId));
      this.reviews.set(res.reviews || []);
      this.reviewSummary.set(res.summary || null);
      this.reviewsLoaded.set(true);
    } catch {
      this.reviewsError.set('product.reviewsLoadError');
    } finally {
      this.reviewsLoading.set(false);
    }
  }

  protected setNewRating(rating: number): void {
    this.newRating.set(rating);
  }

  protected onCommentInput(event: Event): void {
    const target = event.target as HTMLTextAreaElement | null;
    this.newComment.set(target?.value ?? '');
  }

  protected async handleReviewSubmit(event: Event): Promise<void> {
    event.preventDefault();
    const comment = this.newComment().trim();
    if (comment.length < 2) {
      this.reviewError.set('product.reviewMinChars');
      return;
    }
    const currentProduct = this.product();
    if (!currentProduct) return;

    this.submittingReview.set(true);
    this.reviewFeedback.set('');
    this.reviewError.set('');

    try {
      const res = await firstValueFrom(
        this.rentify.submitReview(currentProduct.id, this.newRating(), comment),
      );
      this.reviewFeedback.set('product.reviewSubmitted');
      this.newComment.set('');
      this.newRating.set(5);
      if (res?.summary) {
        this.reviewSummary.set(res.summary);
      }
      if (res?.review) {
        this.reviews.update((current) => [
          res.review,
          ...current.filter((r) => r.id !== res.review.id),
        ]);
      } else {
        await this.loadProductReviews(currentProduct.id);
      }
    } catch (err: any) {
      this.reviewError.set(this.errors.sanitize(err, this.translate.t('product.reviewSubmitFailed')));
    } finally {
      this.submittingReview.set(false);
    }
  }

  protected formatDate(dateStr: string): string {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  }

  protected getDistributionCount(star: number): number {
    return this.reviewSummary()?.distribution?.[star] ?? 0;
  }

  protected getDistributionPercent(star: number): number {
    const total = this.reviewSummary()?.total ?? 0;
    if (total === 0) return 0;
    const count = this.getDistributionCount(star);
    return Math.round((count / total) * 100);
  }
}
