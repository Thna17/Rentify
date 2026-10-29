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
        <p>{{ catalog.productError() }}</p>
        <button class="btn btn-primary" type="button" (click)="catalog.load()">{{ 'state.tryAgain' | translate }}</button>
      </section>
    } @else if (product(); as p) {
      <section class="container detail">
        <nav class="crumbs">
          <a routerLink="/">{{ 'nav.home' | translate }}</a> <span>›</span>
          <a routerLink="/products">{{ 'nav.products' | translate }}</a> <span>›</span>
          <a routerLink="/products" [queryParams]="{ category: p.categorySlug }">{{
            p.categoryName
          }}</a>
          <span>›</span> <span>{{ p.name }}</span>
        </nav>

        <div class="product-layout">
          <div class="gallery">
            @if (galleryShots(p).length > 1) {
              <div class="shot-rail" role="group" aria-label="Product photos">
                @for (shot of galleryShots(p); track shot; let i = $index) {
                  <button
                    type="button"
                    class="shot"
                    [class.active]="shownImage(p) === shot"
                    (click)="pickImage(shot)"
                    [attr.aria-label]="'Photo ' + (i + 1)"
                  >
                    <img [src]="shot" alt="" />
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
                  title="Click to zoom photo"
                  aria-label="Product photo, click to zoom"
                />
              } @else {
                <div class="main-image img-placeholder error-img">
                  <ui-icon name="image" [size]="40" />
                  <span>{{ p.name }}</span>
                  <small>{{ 'state.imageLoadFailed' | translate }}</small>
                </div>
              }
            } @else {
              <div class="main-image img-placeholder">{{ p.name }}</div>
            }
          </div>

          <div class="info">
            <div class="product-title-group">
              <h1>{{ p.name }}</h1>
              <a class="seller-sub" [routerLink]="['/stores', p.storeId]">
                <ui-icon name="store" [size]="14" />
                <span>{{ p.sellerName }}</span>
              </a>
            </div>

            <div class="price-block">
              <span class="price">\${{ effectivePrice().toFixed(2) }}</span>
              @if (effectiveCompareAt(); as was) {
                <span class="was">\${{ was.toFixed(2) }}</span>
                <span class="badge badge-gold">-{{ effectiveDiscount() }}%</span>
              }
            </div>

            <app-variant-picker
              [product]="p"
              (variantChange)="onVariantChange($event)"
              (skuChange)="onSkuChange($event)"
            />

            <div class="qty-avail-row">
              <div>
                <strong>{{ 'product.quantity' | translate }}</strong>
                <div class="qty-stepper">
                  <button
                    type="button"
                    (click)="step(-1)"
                    [disabled]="quantity() <= 1 || effectiveStatus() === 'out-of-stock'"
                    [attr.aria-label]="'product.decreaseQty' | translate"
                  >
                    <ui-icon name="minus" [size]="14" />
                  </button>
                  <span aria-live="polite">{{ quantity() }}</span>
                  <button
                    type="button"
                    (click)="step(1)"
                    [disabled]="quantity() >= effectiveStock()"
                    [attr.aria-label]="'product.increaseQty' | translate"
                  >
                    <ui-icon name="plus" [size]="14" />
                  </button>
                </div>
              </div>
              <div>
                <strong>{{ 'catalog.availability' | translate }}</strong>
                @if (effectiveStatus() === 'out-of-stock') {
                  <div class="avail out">{{ 'catalog.outOfStock' | translate }}</div>
                } @else {
                  <div class="avail">
                    <span class="dot"></span> {{ effectiveStock() }} {{ 'product.inStockItems' | translate:{ count: effectiveStock() } }}
                  </div>
                }
              </div>
            </div>

            <div class="buy-row">
              <button
                class="btn btn-primary btn-lg btn-block"
                [disabled]="effectiveStatus() === 'out-of-stock'"
                (click)="addToCart($event)"
              >
                <ui-icon name="cart" [size]="16" color="#fff" />
                {{ effectiveStatus() === 'out-of-stock' ? ('catalog.outOfStock' | translate) : ('product.addToCart' | translate) }}
              </button>
              <button
                class="btn btn-outline btn-lg wish"
                [class.saved]="saved()"
                (click)="toggleWishlist()"
                [attr.aria-pressed]="saved()"
                [attr.aria-label]="saved() ? ('product.removeFromWishlist' | translate) : ('product.saveToWishlist' | translate)"
              >
                <ui-icon name="heart" [size]="18" [filled]="saved()" />
              </button>
            </div>

            @if (effectiveReviewCount() > 0) {
              <a class="rating-row rating-link" href="#reviews">
                <ui-icon name="star" [size]="15" [filled]="true" class="stars" />
                <span>{{ effectiveRating().toFixed(1) }}</span>
                <span class="count">({{ effectiveReviewCount() }} {{ effectiveReviewCount() === 1 ? ('product.verifiedReview' | translate) : ('product.verifiedReviews' | translate) }})</span>
              </a>
            } @else {
              <a class="rating-row no-reviews rating-link" href="#reviews">{{ 'product.noReviewsYet' | translate }}</a>
            }

            <p class="desc">{{ p.description }}</p>

            <div class="purchase-info" aria-label="Order information">
              <div><ui-icon name="store" [size]="16" /><span><strong>{{ 'product.shipsFromSeller' | translate }}</strong><small>{{ 'product.shipsFromSellerSub' | translate }}</small></span></div>
              <div><ui-icon name="credit-card" [size]="16" /><span><strong>{{ 'product.totalConfirmed' | translate }}</strong><small>{{ 'product.totalConfirmedSub' | translate }}</small></span></div>
            </div>

            @if (feedback(); as message) {
              <p class="feedback" role="status">
                <ui-icon name="check-circle" [size]="14" /> {{ message }}
                <a routerLink="/cart">View cart</a>
              </p>
            }

            <div class="report-action-row">
              <button
                type="button"
                class="btn-report-listing"
                (click)="showReportModal.set(true)"
                title="Report issue or policy concern about this listing"
              >
                <ui-icon name="flag" [size]="13" />
                <span>{{ 'product.reportListing' | translate }}</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- Customer Reviews & Ratings Section -->
      <section class="container reviews-section" id="reviews">
        <div class="reviews-section-header">
          <h2>Customer Reviews & Ratings</h2>
          <p class="section-subtitle">Real experiences shared by verified shoppers on Rentify Marketplace</p>
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
              <h3>Leave Feedback</h3>
              <p>Have you received this item? Help other buyers make informed choices.</p>
              <a href="#write-review" class="btn btn-outline btn-block">Write a Review</a>
            } @else {
              <h3>Reviewed by Real Buyers</h3>
              <p>Sign in to your Rentify account to submit a rating and verified review.</p>
              <a [href]="auth.getLoginUrl()" class="btn btn-primary btn-block">Sign In to Review</a>
            }
          </div>
        </div>

        @if (auth.isAuthenticated()) {
          <div class="review-form-card card" id="write-review">
            <h3>Write a Review</h3>
            <p class="form-desc">Share details about the craftsmanship, fit, or delivery from this seller.</p>

            @if (reviewFeedback()) {
              <div class="alert-box alert-success" role="status">
                <ui-icon name="check-circle" [size]="16" />
                <span>{{ reviewFeedback() }}</span>
              </div>
            }
            @if (reviewError()) {
              <div class="alert-box alert-danger" role="alert">
                <ui-icon name="alert-circle" [size]="16" />
                <span>{{ reviewError() }}</span>
              </div>
            }

            <form (submit)="handleReviewSubmit($event)" class="review-form">
              <div class="form-field">
                <label class="field-label">Overall Rating</label>
                <div class="star-picker" role="radiogroup" aria-label="Select star rating">
                  @for (star of [1, 2, 3, 4, 5]; track star) {
                    <button
                      type="button"
                      class="star-pick-btn"
                      [class.active]="star <= newRating()"
                      (click)="setNewRating(star)"
                      [attr.aria-label]="star + ' stars'"
                    >
                      <ui-icon name="star" [size]="22" [filled]="star <= newRating()" />
                    </button>
                  }
                  <span class="rating-label-text">{{ newRating() }} out of 5 stars</span>
                </div>
              </div>

              <div class="form-field">
                <label class="field-label" for="review-comment">Review Details</label>
                <textarea
                  id="review-comment"
                  rows="3"
                  class="review-textarea"
                  placeholder="Describe your experience with this item..."
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
          <h3>Recent Customer Reviews</h3>

          @if (reviewsLoading()) {
            <div class="feed-state">
              <ui-icon name="loader" class="spin" [size]="24" />
              <span>Loading reviews...</span>
            </div>
          } @else if (reviews().length === 0) {
            <div class="feed-empty card">
              <ui-icon name="star" [size]="32" class="empty-star" />
              <h4>No customer reviews yet</h4>
              <p>Be the first customer to purchase and review this item.</p>
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
                              <ui-icon name="check-circle" [size]="12" /> Verified Purchase
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
            [title]="'More from ' + p.categoryName"
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
        aria-label="Enlarged product image"
        (click)="zoomOpen.set(false)"
      >
        <div class="lightbox-content" (click)="$event.stopPropagation()">
          <button
            type="button"
            class="lightbox-close"
            (click)="zoomOpen.set(false)"
            aria-label="Close zoom"
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
      .detail {
        padding: 26px 32px 0;
      }
      .crumbs {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        font-size: 12.5px;
        color: var(--color-muted);
        margin-bottom: 20px;
      }
      .crumbs a:hover {
        color: var(--color-accent);
      }
      /* Thumbnail rail down the left of the main photo, the way a phone listing
         usually reads. Collapses above the image on narrow screens. */
      .gallery { display: grid; grid-template-columns: 68px minmax(0, 1fr); gap: 12px; align-items: start; }
      .gallery:has(.shot-rail) .main-image { grid-column: 2; }
      .gallery:not(:has(.shot-rail)) { grid-template-columns: minmax(0, 1fr); }
      .shot-rail {
        display: flex; flex-direction: column; gap: 9px;
        max-height: 520px; overflow-y: auto; scrollbar-width: none;
      }
      .shot-rail::-webkit-scrollbar { display: none; }
      .shot {
        background: var(--color-bg-alt); border: 1.5px solid var(--color-border);
        border-radius: 10px; cursor: pointer; overflow: hidden; padding: 0;
        aspect-ratio: 1; width: 100%;
        transition: border-color 150ms ease, transform 150ms ease;
      }
      .shot img { display: block; width: 100%; height: 100%; object-fit: contain; }
      .shot:hover { border-color: var(--color-muted); }
      .shot.active { border-color: var(--color-accent); transform: translateY(-1px); }

      /* Colour swatches: the photo itself is the swatch, so the shopper sees the
         finish rather than guessing from a name. */
      .variant-picker { display: flex; flex-direction: column; gap: 9px; margin: 4px 0 2px; }
      .variant-label {
        color: var(--color-text-secondary); font-size: 12.5px; font-weight: 650;
        letter-spacing: .02em; text-transform: uppercase;
      }
      .variant-chosen { color: var(--color-text); margin-left: 8px; text-transform: none; }
      .swatches { display: flex; flex-wrap: wrap; gap: 9px; }
      .swatch {
        background: none; border: 2px solid transparent; border-radius: 50%; cursor: pointer;
        height: 38px; width: 38px; padding: 3px;
        transition: border-color 150ms ease, transform 150ms ease;
      }
      .swatch-dot {
        display: block; width: 100%; height: 100%; border-radius: 50%;
        border: 1px solid rgba(0, 0, 0, .12); box-shadow: inset 0 0 0 2px rgba(255, 255, 255, .5);
      }
      .swatch:hover { transform: scale(1.08); }
      .swatch.active { border-color: var(--color-accent); }

      .product-layout {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 40px;
        align-items: start;
      }
      /* Same square box and same cover as the product card, so a product does
         not change shape when you click it. It used to be a fixed 460px tall
         with object-fit: contain, which showed the whole image letterboxed
         while the card showed a cropped one - the same photo looking like two
         different photos either side of a click. */
      .main-image {
        aspect-ratio: 1;
        height: auto;
        border-radius: var(--radius-lg);
        font-size: 13px;
        overflow: hidden;
        border: 1px solid var(--color-border);
      }
      .product-photo {
        display: block;
        object-fit: contain;
        object-position: center;
        width: 100%;
        height: 100%;
        padding: 16px;
        background: #ffffff;
      }
      .info {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .product-title-group {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      h1 {
        font-size: 30px;
        line-height: 1.15;
        margin: 2px 0 0;
      }
      .seller-sub {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        color: var(--color-muted, #7c7267);
        font-size: 13.5px;
        font-weight: 500;
        text-decoration: none;
        width: fit-content;
        transition: color 150ms ease;
      }
      .seller-sub ui-icon {
        color: var(--color-muted, #7c7267);
        opacity: 0.8;
      }
      .seller-sub:hover {
        color: var(--color-accent);
      }
      .seller-sub:hover ui-icon {
        color: var(--color-accent);
      }
      .store-row {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 14px;
        color: var(--color-text);
      }
      .store-row:hover {
        border-color: var(--color-border-strong);
      }
      .store-avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        flex-shrink: 0;
      }
      .store-row small {
        display: block;
        color: var(--color-muted);
        font-size: 11.5px;
      }
      .store-row strong {
        font-size: 14px;
      }
      .visit {
        margin-left: auto;
        display: inline-flex;
        align-items: center;
        gap: 5px;
        color: var(--color-accent);
        font-size: 13px;
        font-weight: 600;
      }
      .price-block {
        display: flex;
        align-items: baseline;
        gap: 10px;
        margin-top: 2px;
        margin-bottom: -2px;
      }
      .price {
        font-size: 28px;
        font-weight: 800;
        letter-spacing: -0.02em;
      }
      .was {
        color: var(--color-muted);
        font-size: 16px;
        text-decoration: line-through;
      }
      .desc {
        color: var(--color-text-secondary);
        font-size: 14.5px;
        line-height: 1.7;
      }
      .no-reviews { color: var(--color-muted); font-size: 12.5px; }
      .purchase-info { border-block: 1px solid var(--color-border); display: grid; gap: 10px; margin-top: 3px; padding: 12px 0; }
      .purchase-info > div { align-items: flex-start; color: var(--color-accent); display: flex; gap: 10px; }
      .purchase-info span { display: grid; gap: 2px; }
      .purchase-info strong { color: var(--color-text); font-size: 12.5px; }
      .purchase-info small { color: var(--color-muted); font-size: 11.5px; line-height: 1.4; }
      .qty-avail-row {
        display: flex;
        align-items: center;
        gap: 24px;
        margin: 2px 0 0;
        flex-wrap: wrap;
      }
      .qty-avail-row > div {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .qty-avail-row strong {
        font-size: 13px;
        font-weight: 600;
      }
      .qty-stepper {
        display: flex;
        align-items: center;
        gap: 12px;
        border: 1px solid var(--color-border-strong);
        border-radius: var(--radius-sm);
        padding: 5px 10px;
        margin-top: 0;
        width: fit-content;
      }
      .qty-stepper button {
        background: none;
        border: none;
        display: flex;
        color: var(--color-text-secondary);
      }
      .qty-stepper button:disabled {
        color: var(--color-muted-2);
        cursor: not-allowed;
      }
      .avail {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-top: 0;
        font-size: 13px;
        color: var(--color-text-secondary);
      }
      .avail.out {
        color: var(--color-danger);
        font-weight: 600;
      }
      .dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: var(--color-success);
      }
      .buy-row {
        display: flex;
        gap: 10px;
        margin-top: 4px;
      }
      .wish {
        width: 54px;
        flex-shrink: 0;
        padding: 0;
      }
      .wish.saved {
        color: var(--color-danger);
        border-color: var(--color-danger);
      }
      .feedback {
        display: flex;
        align-items: center;
        gap: 7px;
        color: var(--color-success);
        font-size: 13px;
        font-weight: 600;
      }
      .feedback a {
        color: var(--color-accent);
        text-decoration: underline;
      }
      .related-section {
        padding: 44px 32px 60px;
      }
      .related-section h2 {
        font-size: 19px;
        margin-bottom: 16px;
      }
      .product-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
        gap: 18px;
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
        gap: 12px;
        margin-top: 12px;
      }
      .main-image {
        cursor: zoom-in;
      }
      .error-img {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 8px;
        color: var(--color-muted);
        text-align: center;
        padding: 20px;
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
        top: -42px;
        right: 0;
        background: none;
        border: 0;
        color: #fff;
        cursor: pointer;
        padding: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .missing > ui-icon { color: var(--color-accent); }
      .spin { animation: spin 900ms linear infinite; }
      @keyframes spin { to { transform: rotate(360deg); } }
      /*
       * 680px, not 900px. A tablet is 768-834px wide in portrait, so at 900 it
       * fell into the phone layout: the image went full width and every detail
       * — price, stock, add to cart — dropped below the fold, with the space
       * beside the image left empty. Two columns still work comfortably here;
       * a 748px row splits into roughly 354px each side.
       */
      @media (max-width: 680px) {
        .gallery { grid-template-columns: minmax(0, 1fr); }
        .shot-rail { flex-direction: row; max-height: none; overflow-x: auto; }
        .shot { flex: 0 0 64px; width: 64px; }
        .gallery:has(.shot-rail) .main-image { grid-column: 1; grid-row: 1; }
        .gallery:has(.shot-rail) .shot-rail { grid-row: 2; }
        .product-layout {
          grid-template-columns: 1fr;
          gap: 24px;
        }
        .main-image {
          height: 320px;
        }
      }
      @media (max-width: 900px) {
        .product-grid {
          grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
        }
      }
      @media (max-width: 520px) {
        .product-grid {
          grid-template-columns: 1fr;
        }
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
        margin-top: 14px;
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
        padding: 4px 6px;
        border-radius: var(--radius-sm);
        transition: color 0.15s ease;
      }
      .btn-report-listing:hover {
        color: #ef4444;
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
    this.feedback.set(`${units} × ${current.name} added to your cart.`);
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
      this.reviewsError.set('Could not load reviews.');
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
      this.reviewError.set('Please provide a comment with at least 2 characters.');
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
      this.reviewFeedback.set('Thank you! Your review has been submitted.');
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
      const msg = err?.error?.error || 'Failed to submit review. Please ensure you are signed in.';
      this.reviewError.set(msg);
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
