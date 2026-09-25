import {
  Component,
  ElementRef,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CartService } from '../../../../core/cart/cart.service';
import { FlyToCartService } from '../../../../core/cart/fly-to-cart.service';
import { WishlistService } from '../../../../core/wishlist/wishlist.service';
import { Product } from '../../../../core/catalog/catalog.models';
import { IconComponent } from '../../../shared/ui/icon/icon.component';

/**
 * The single product card used on the homepage, products page, wishlist,
 * store pages and related-products rows.
 *
 * Card behaviour, per spec: the whole card opens the detail page, but the
 * wishlist and cart buttons must not trigger that navigation — hence the
 * explicit stopPropagation in each handler.
 */
@Component({
  selector: 'app-product-card',
  imports: [RouterLink, IconComponent],
  template: `
    <article
      class="product-card card card-hover"
      [class.editorial]="variant() === 'editorial'"
      (click)="open()"
      (keydown.enter)="open()"
      tabindex="0"
      [attr.aria-label]="product().name"
    >
      <div class="thumb-wrap">
        @if (product().image; as image) {
          <img class="product-thumb product-photo" [src]="image" [alt]="product().name" (load)="matchBackdrop($event)" />
        } @else {
          <div class="product-thumb img-placeholder" aria-hidden="true">
            <span class="craft-mark">{{ product().name.charAt(0) }}</span>
            <span class="thumb-label">{{ product().name }}</span>
          </div>
        }

        @if (product().status === 'out-of-stock') {
          <span class="stock-badge badge badge-neutral">Out of stock</span>
        } @else if (product().status === 'low-stock') {
          <span class="stock-badge badge badge-low-stock"
            >Only {{ product().stock }} left</span
          >
        }

        @if (discount(); as off) {
          <span class="discount-badge badge badge-gold">-{{ off }}%</span>
        } @else if (badge(); as label) {
          <span class="context-badge">{{ label }}</span>
        }

        <button
          type="button"
          class="wish-btn"
          [class.saved]="saved()"
          [class.bounce]="wishBounce()"
          (click)="toggleWishlist($event)"
          (animationend)="wishBounce.set(false)"
          [attr.aria-pressed]="saved()"
          [attr.aria-label]="
            saved() ? 'Remove from wishlist' : 'Save to wishlist'
          "
        >
          <ui-icon name="heart" [size]="15" [filled]="saved()" />
        </button>
      </div>

      <div class="product-body">
        <div class="product-kicker">
          @if (product().reviewCount > 0) {
            <div class="rating-row" [attr.aria-label]="product().rating + ' out of 5 stars, ' + product().reviewCount + ' reviews'">
              <ui-icon name="star" [size]="12" [filled]="true" class="stars" />
              <span>{{ product().rating }}</span>
              <span class="count">({{ product().reviewCount }})</span>
            </div>
          }
        </div>
        <h3 class="name">{{ product().name }}</h3>
        <a
          class="seller"
          [routerLink]="['/stores', product().storeId]"
          (click)="$event.stopPropagation()"
          >{{ product().sellerName }}</a
        >

        <div class="price-row">
          <div class="prices">
            <span class="price">\${{ product().price.toFixed(2) }}</span>
            @if (discount()) {
              <span class="was">\${{ product().compareAtPrice!.toFixed(2) }}</span>
            }
          </div>

          <button
            type="button"
            class="cart-add"
            [class.popped]="justAdded()"
            [disabled]="product().status === 'out-of-stock'"
            (click)="addToCart($event)"
            [attr.aria-label]="
              product().status === 'out-of-stock'
                ? 'Out of stock'
                : 'Add ' + product().name + ' to cart'
            "
          >
            <span class="ring" aria-hidden="true"></span>
            <ui-icon [name]="justAdded() ? 'check' : 'cart'" [size]="14" color="#fff" />
            <span class="cart-label">{{ justAdded() ? 'Added' : 'Add to cart' }}</span>
          </button>
        </div>
      </div>
    </article>
  `,
  styles: [
    `
      .product-card {
        display: flex;
        flex-direction: column;
        min-width: 0;
        height: 100%;
        cursor: pointer;
        outline: none;
        transform: translateZ(0);
        transition:
          transform 200ms ease,
          box-shadow 200ms ease,
          border-color 220ms ease;
        will-change: transform;
      }
      .product-card:focus-visible {
        border-color: var(--color-accent);
        box-shadow: var(--shadow-focus);
      }
      .product-card.editorial {
        background: #302a24;
        border: 0;
        border-radius: 18px;
        min-height: clamp(350px, 30vw, 430px);
        overflow: hidden;
        position: relative;
      }
      .product-card.editorial .thumb-wrap {
        inset: 0;
        position: absolute;
      }
      .product-card.editorial .thumb-wrap::after {
        background: linear-gradient(0deg, rgba(18, 15, 12, .78) 0%, rgba(18, 15, 12, .2) 48%, transparent 72%);
        content: '';
        inset: 0;
        pointer-events: none;
        position: absolute;
        z-index: 1;
      }
      .product-card.editorial .product-thumb {
        aspect-ratio: auto;
        height: 100%;
        min-height: 100%;
        width: 100%;
      }
      .product-card.editorial .img-placeholder {
        background: linear-gradient(145deg, #8d7764, #3f352d);
      }
      .product-card.editorial .craft-mark,
      .product-card.editorial .thumb-label {
        color: #fff;
      }
      .product-card.editorial .stock-badge,
      .product-card.editorial .wish-btn {
        z-index: 2;
      }
      .product-card.editorial .badge-in-stock { display: none; }
      /* A "-22%" sticker is a discount-shelf cue, not a lookbook one — the
         same reasoning that hides the price hides this too. */
      .product-card.editorial .discount-badge { display: none; }
      .product-card.editorial .product-body {
        background: transparent;
        color: #fff;
        flex: 0 0 auto;
        gap: 6px;
        justify-content: flex-end;
        margin-top: auto;
        padding: 22px 20px 19px;
        position: relative;
        z-index: 2;
      }
      .product-card.editorial .product-kicker { display: none; }
      .product-card.editorial .name {
        color: #fff;
        font-family: var(--font-heading);
        font-size: clamp(21px, 1.65vw, 27px);
        font-weight: 600;
        line-height: 1.08;
        min-height: 0;
        text-shadow: 0 2px 14px rgba(0,0,0,.34);
      }
      .product-card.editorial .seller {
        color: rgba(255,255,255,.76);
        font-size: 11px;
      }
      /* A lookbook tile, not a price tag: the point of this variant is the
         photo and the name, the way a clothing brand's homepage teases a
         piece without selling it outright. Price stays visible everywhere
         else — the grid, the list view, the product page — this is the one
         spot that's deliberately quiet about it. */
      .product-card.editorial .price-row { justify-content: flex-end; padding-top: 3px; }
      .product-card.editorial .prices { display: none; }
      .product-card.editorial .cart-add {
        background: rgba(255,255,255,.16);
        border: 1px solid rgba(255,255,255,.48);
        backdrop-filter: blur(8px);
      }
      .thumb-wrap {
        position: relative;
        overflow: hidden;
        background: var(--color-bg-alt);
      }
      /* A packshot carries its own background — usually white — and the card's
         cream showed as a hard edge around it wherever the photo did not reach.
         Once loaded we sample the photo's own border pixels and paint the tile
         that colour, so the two meet invisibly. */
      .thumb-wrap.matched { background: var(--shot-bg); }
      /* Square, because the catalogue is square: 14 of 18 LyLy images, and
         most of Cloth and Skincare, are 800x800. A 4:3.15 box cropped 21% off
         the height of every one of them - and sellers put their Khmer
         headline along the top edge, so that is the first thing lost. Match
         the box to the source and nothing is cropped at all. */
      .product-thumb {
        aspect-ratio: 1;
        min-height: clamp(176px, 12vw, 222px);
        flex-direction: column;
        gap: 12px;
        transition: transform 220ms ease, filter 220ms ease;
      }
      /* cover, paired with the square box above: a square source now fills it
         exactly, with no crop and no letterboxed white rectangle floating in
         the middle of the tile. Only the minority of non-square uploads
         (3:4 and 4:5) lose anything, and they lose it evenly. */
      .product-photo {
        width: 100%; height: 100%; display: block;
        object-fit: cover; object-position: center;
      }
      @media (hover: hover) and (pointer: fine) {
        .product-card:hover {
          border-color: rgba(142, 48, 33, .26);
          box-shadow: 0 6px 18px rgba(60, 43, 28, .08);
          transform: translateY(-2px);
        }
        .product-card:hover .product-thumb {
          filter: saturate(1.035) contrast(1.015);
          transform: scale(1.02);
        }
        .product-card:hover .cart-add:not(:disabled) {
          box-shadow: 0 7px 16px rgba(142, 48, 33, .22);
          transform: translateY(-1px);
        }
      }
      .craft-mark {
        display: grid;
        place-items: center;
        width: clamp(48px, 4vw, 62px);
        aspect-ratio: 1;
        border: 1px solid rgba(142, 48, 33, .18);
        border-radius: 50% 50% 46% 54%;
        background: rgba(255, 253, 248, .7);
        color: var(--color-accent);
        font-family: var(--font-heading);
        font-size: clamp(23px, 2.5vw, 32px);
        box-shadow: 0 12px 32px rgba(82, 59, 34, .08);
      }
      .thumb-label {
        max-width: 76%;
        color: var(--color-text-secondary);
        font-size: 10px;
        font-weight: 700;
        letter-spacing: .09em;
        line-height: 1.4;
        text-align: center;
        text-transform: uppercase;
      }
      .stock-badge {
        position: absolute;
        top: 10px;
        left: 10px;
      }
      .discount-badge {
        position: absolute;
        bottom: 10px;
        left: 10px;
      }
      .discount-badge, .context-badge { background: #fff3eb; color: var(--color-accent); }
      .context-badge { position: absolute; bottom: 10px; left: 10px; padding: 4px 7px; border-radius: 5px; font-size: 9px; font-weight: 750; letter-spacing: .04em; text-transform: uppercase; }
      .product-card:not(.editorial) .product-body { background: #fff; border-top: 1px solid #e8ded2; }
      .wish-btn {
        position: absolute;
        top: 8px;
        right: 8px;
        width: 36px;
        height: 36px;
        display: grid;
        place-items: center;
        border: 1px solid var(--color-border);
        border-radius: var(--radius-full);
        background: rgba(255, 255, 255, 0.92);
        color: var(--color-muted);
        opacity: 0;
        pointer-events: none;
        transform: translateY(-5px) scale(.94);
        transition: opacity 160ms ease, transform 160ms ease, color 160ms ease, border-color 160ms ease;
      }
      .product-card:hover .wish-btn,
      .product-card:focus-within .wish-btn,
      .wish-btn.saved {
        opacity: 1;
        pointer-events: auto;
        transform: translateY(0) scale(1);
      }
      .wish-btn:hover {
        color: var(--color-danger);
        border-color: var(--color-border-strong);
      }
      .wish-btn.saved {
        color: var(--color-danger);
        border-color: var(--color-danger);
      }
      /* The heart itself pops — not the button chrome around it — so the
         emotion reads on the symbol, the way a "like" button does. */
      .wish-btn.bounce ui-icon {
        display: inline-flex;
        animation: heart-pop 900ms cubic-bezier(0.34, 1.56, 0.64, 1);
      }
      @keyframes heart-pop {
        0% { transform: scale(1); }
        30% { transform: scale(1.55); }
        55% { transform: scale(0.85); }
        80% { transform: scale(1.15); }
        100% { transform: scale(1); }
      }
      @media (prefers-reduced-motion: reduce) {
        .wish-btn.bounce ui-icon {
          animation: none;
        }
      }
      @media (hover: none), (pointer: coarse) {
        .wish-btn {
          opacity: 1;
          pointer-events: auto;
          transform: none;
        }
      }
      .product-body {
        display: flex;
        flex-direction: column;
        flex: 1;
        gap: 5px;
        padding: 12px 14px 13px;
      }
      .product-kicker {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }
      .tag {
        color: var(--color-muted);
        min-width: 0;
        overflow: hidden;
        font-size: 9.5px;
        font-weight: 600;
        letter-spacing: 0.04em;
        text-overflow: ellipsis;
        text-transform: uppercase;
        white-space: nowrap;
      }
      .rating-row {
        display: inline-flex;
        align-items: center;
        flex: 0 0 auto;
        gap: 4px;
        color: var(--color-text-secondary);
        font-size: 11px;
      }
      .rating-row .stars {
        color: var(--color-gold);
      }
      .rating-row .count {
        color: var(--color-muted);
      }
      .no-reviews {
        flex: 0 0 auto;
        color: var(--color-muted);
        font-size: 10.5px;
      }
      .name {
        min-height: 2.4em;
        font-family: var(--font-body);
        font-size: clamp(14px, .25vw + 12px, 16px);
        font-weight: 750;
        line-height: 1.35;
        /* Two-line clamp keeps every card in a row the same height. */
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .seller {
        color: var(--color-muted);
        overflow: hidden;
        font-size: 11.5px;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .seller:hover {
        color: var(--color-accent);
        text-decoration: underline;
      }
      .price-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-top: auto;
        padding-top: 5px;
      }
      .prices {
        display: flex;
        align-items: baseline;
        gap: 7px;
      }
      .price {
        font-size: 16px;
        font-weight: 800;
      }
      .was {
        color: var(--color-muted);
        font-size: 12.5px;
        text-decoration: line-through;
      }
      .cart-add {
        position: relative;
        width: 36px;
        height: 36px;
        display: grid;
        place-items: center;
        border: 0;
        border-radius: 12px;
        background: var(--color-accent);
        overflow: visible;
        transition: background 180ms ease, box-shadow 220ms ease, transform 220ms ease;
      }
      .cart-label {
        display: none;
      }
      .cart-add:hover:not(:disabled) {
        background: var(--color-accent-hover);
        transform: scale(1.02);
      }
      .cart-add:disabled {
        background: var(--color-border-strong);
        cursor: not-allowed;
      }
      /* The pop: a quick overshoot scale so the click reads as a satisfying
         "thunk" rather than a flat state change. */
      .cart-add.popped {
        animation: cart-pop 850ms cubic-bezier(0.34, 1.56, 0.64, 1);
        background: var(--color-success, #2f7a4f);
      }
      @keyframes cart-pop {
        0% { transform: scale(1); }
        35% { transform: scale(1.35) rotate(-6deg); }
        60% { transform: scale(0.92) rotate(3deg); }
        100% { transform: scale(1) rotate(0); }
      }
      /* The ring: expands and fades outward from the button, like a small
         shockwave — this is the "surprise" cue, distinct from the pop. */
      .ring {
        position: absolute;
        inset: 0;
        border-radius: 12px;
        border: 2px solid var(--color-success, #2f7a4f);
        opacity: 0;
        pointer-events: none;
      }
      .cart-add.popped .ring {
        animation: cart-ring 950ms ease-out;
      }
      @keyframes cart-ring {
        0% { opacity: 0.9; transform: scale(1); }
        100% { opacity: 0; transform: scale(1.9); }
      }
      @media (prefers-reduced-motion: reduce) {
        .product-card,
        .product-thumb,
        .cart-add,
        .wish-btn {
          transition-duration: 0.01ms;
        }
        .cart-add.popped,
        .cart-add.popped .ring {
          animation: none;
        }
      }

      /* Dense catalog grid: marketplace browsing should expose more products
         per viewport than editorial rails and store showcases. */
      :host-context(.product-grid) .product-thumb {
        min-height: clamp(145px, 10vw, 180px);
      }
      :host-context(.product-grid) .product-body {
        gap: 4px;
        padding: 10px 11px 11px;
      }
      :host-context(.product-grid) .name {
        font-size: 13.5px;
      }
      :host-context(.product-grid) .seller {
        font-size: 10.5px;
      }
      :host-context(.product-grid) .price {
        font-size: 15px;
      }
      :host-context(.product-grid) .cart-add {
        width: 33px;
        height: 33px;
        border-radius: 10px;
      }
      :host-context(.product-grid) .wish-btn {
        width: 32px;
        height: 32px;
      }

      /* Homepage and related-product rails favor rapid comparison. The same
         product information remains available, but decorative space is lower
         so six or more products fit across a typical desktop viewport. */
      :host-context(app-product-rail) .product-thumb {
        min-height: clamp(132px, 9vw, 158px);
      }
      :host-context(app-product-rail) .product-body {
        gap: 3px;
        padding: 9px 10px 10px;
      }
      :host-context(app-product-rail) .stock-badge {
        top: 7px;
        left: 7px;
        font-size: 9px;
        padding: 4px 7px;
      }
      :host-context(app-product-rail) .wish-btn {
        top: 7px;
        right: 7px;
        width: 30px;
        height: 30px;
      }
      :host-context(app-product-rail) .name {
        font-size: 13px;
        min-height: 2.35em;
      }
      :host-context(app-product-rail) .seller {
        font-size: 10px;
      }
      :host-context(app-product-rail) .rating-row {
        font-size: 10px;
        gap: 3px;
      }
      :host-context(app-product-rail) .price {
        font-size: 15px;
      }
      :host-context(app-product-rail) .cart-add {
        border-radius: 9px;
        width: 31px;
        height: 31px;
      }

      /* Category list view: a marketplace search-result row with a strong
         image column and all decision-making information beside it. Grid
         cards keep the compact vertical layout above. */
      :host-context(.product-list) .product-card {
        display: grid;
        grid-template-columns: clamp(190px, 26%, 270px) minmax(0, 1fr);
        min-height: 210px;
        height: auto;
        overflow: hidden;
      }
      :host-context(.product-list) .thumb-wrap {
        min-height: 210px;
        border-right: 1px solid var(--color-border);
        background: var(--color-bg-alt);
      }
      :host-context(.product-list) .product-thumb {
        width: 100%;
        height: 100%;
        min-height: 210px;
        aspect-ratio: auto;
      }
      :host-context(.product-list) .product-body {
        display: flex;
        justify-content: flex-start;
        gap: 8px;
        padding: clamp(18px, 2.4vw, 28px);
      }
      :host-context(.product-list) .product-kicker {
        justify-content: flex-start;
        gap: 16px;
      }
      :host-context(.product-list) .tag {
        font-size: 10px;
      }
      :host-context(.product-list) .name {
        min-height: 0;
        max-width: 760px;
        font-size: clamp(17px, 1.4vw, 21px);
        line-height: 1.3;
      }
      :host-context(.product-list) .seller {
        width: fit-content;
        font-size: 12.5px;
      }
      :host-context(.product-list) .price-row {
        justify-content: flex-start;
        gap: 24px;
        margin-top: 7px;
        padding-top: 0;
      }
      :host-context(.product-list) .price {
        font-size: 22px;
      }
      :host-context(.product-list) .cart-add {
        display: inline-flex;
        width: auto;
        min-width: 126px;
        height: 38px;
        padding: 0 16px;
        gap: 8px;
        border-radius: var(--radius-full);
        color: #fff;
        font-size: 12px;
        font-weight: 700;
      }
      :host-context(.product-list) .cart-label {
        display: inline;
      }
      :host-context(.product-list) .wish-btn {
        width: 34px;
        height: 34px;
      }

      @media (max-width: 640px) {
        :host-context(.product-list) .product-card {
          grid-template-columns: 128px minmax(0, 1fr);
          min-height: 168px;
        }
        :host-context(.product-list) .thumb-wrap,
        :host-context(.product-list) .product-thumb {
          min-height: 168px;
        }
        :host-context(.product-list) .product-body {
          gap: 5px;
          padding: 13px;
        }
        :host-context(.product-list) .product-kicker .tag {
          display: none;
        }
        :host-context(.product-list) .name {
          font-size: 14px;
        }
        :host-context(.product-list) .price-row {
          gap: 12px;
        }
        :host-context(.product-list) .price {
          font-size: 17px;
        }
        :host-context(.product-list) .cart-add {
          min-width: 0;
          width: 36px;
          padding: 0;
        }
        :host-context(.product-list) .cart-label {
          display: none;
        }
      }
      @media (max-width: 520px) {
        :host-context(.product-grid) .product-thumb { min-height: 142px; }
        :host-context(.product-grid) .product-body { padding: 9px 9px 10px; }
        :host-context(.product-grid) .name { font-size: 12.5px; }
        :host-context(.product-grid) .seller { font-size: 9.5px; }
        :host-context(.product-grid) .price { font-size: 14px; }
        :host-context(.product-grid) .cart-add { height: 31px; width: 31px; }
      }

      /* ---------- minimal card */
      .product-card {
        border: 0 !important;
        box-shadow: none !important;
        background: transparent !important;
      }
      .thumb-wrap {
        border-radius: 16px;
        overflow: hidden;
        aspect-ratio: 1 / 1;
        background: var(--color-bg-alt);
      }
      .product-body { padding: 12px 2px 0 !important; gap: 2px !important; }
      .product-kicker { order: 3; min-height: 0 !important; margin: 0 !important; }
      .product-kicker:empty { display: none; }
      .name {
        font-size: 14px !important; font-weight: 500 !important; line-height: 1.35 !important;
        font-family: var(--font-body) !important; color: var(--color-text) !important;
        display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden;
      }
      .seller { font-size: 12.5px !important; color: var(--color-muted) !important; }
      .price-row { margin-top: 8px !important; align-items: center !important; }
      .price { font-size: 15px !important; font-weight: 700 !important; color: var(--color-text) !important; }
      .was { font-size: 12.5px !important; }
      .discount-badge {
        background: #ef4444 !important; color: #fff !important; border: 0 !important;
        border-radius: 999px !important; font-size: 11px !important; padding: 2px 8px !important;
      }
      .cart-add {
        width: 34px !important; height: 34px !important; min-width: 0 !important; padding: 0 !important;
        border-radius: 999px !important; background: var(--color-text) !important; justify-content: center;
      }
      .cart-add:hover:not(:disabled) { background: var(--color-accent) !important; }
      .cart-label { display: none !important; }
      .wish-btn { opacity: 0; transition: opacity 180ms ease; }
      .product-card:hover .wish-btn, .wish-btn.saved, .wish-btn:focus-visible { opacity: 1; }
      @media (hover: none) { .wish-btn { opacity: 1; } }
    `,
  ],
})
export class ProductCardComponent {
  /**
   * Paint the tile in the photo's own background colour.
   *
   * Averages the pixels around the photo's border — the frame, not the middle,
   * so the product itself does not drag the colour. Needs a clean canvas, so a
   * cross-origin image without CORS headers throws; that is caught and the card
   * keeps the default card colour rather than losing the image.
   */
  protected matchBackdrop(event: Event): void {
    const img = event.target as HTMLImageElement;
    const wrap = img.closest('.thumb-wrap') as HTMLElement | null;
    if (!wrap || !img.naturalWidth) return;

    try {
      const size = 32;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, size, size);
      const { data } = ctx.getImageData(0, 0, size, size);

      let r = 0, g = 0, b = 0, n = 0;
      for (let k = 0; k < size; k++) {
        const edges = [
          k * 4,                                  // top row
          (k * size) * 4,                         // left column
          (k * size + size - 1) * 4,              // right column
          ((size - 1) * size + k) * 4,            // bottom row
        ];
        for (const i of edges) {
          if (data[i + 3] < 8) continue;          // skip transparent padding
          r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
        }
      }
      if (!n) return;

      wrap.style.setProperty(
        '--shot-bg',
        `rgb(${Math.round(r / n)} ${Math.round(g / n)} ${Math.round(b / n)})`,
      );
      wrap.classList.add('matched');
    } catch {
      // tainted canvas — leave the card's own colour in place
    }
  }


  readonly product = input.required<Product>();
  readonly badge = input<'Best seller' | 'New' | null>(null);
  readonly variant = input<'default' | 'editorial'>('default');

  private readonly cart = inject(CartService);
  private readonly wishlist = inject(WishlistService);
  private readonly router = inject(Router);
  private readonly flyToCart = inject(FlyToCartService);
  private readonly host = inject(ElementRef<HTMLElement>);

  protected readonly justAdded = signal(false);
  protected readonly wishBounce = signal(false);

  protected readonly saved = computed(() =>
    this.wishlist.isWishlisted(this.product().id),
  );

  protected readonly discount = computed(() => {
    const { price, compareAtPrice } = this.product();
    if (!compareAtPrice || compareAtPrice <= price) {
      return null;
    }
    return Math.round(((compareAtPrice - price) / compareAtPrice) * 100);
  });

  protected open(): void {
    this.router.navigate(['/product', this.product().id]);
  }

  protected toggleWishlist(event: Event): void {
    event.stopPropagation();
    this.wishlist.toggle(this.product().id);
    // Retrigger even on rapid re-clicks: false then true forces the
    // animation class to re-apply instead of a no-op state change.
    this.wishBounce.set(false);
    requestAnimationFrame(() => this.wishBounce.set(true));
  }

  protected async addToCart(event: Event): Promise<void> {
    event.stopPropagation();

    // Fires immediately, independent of the server round-trip below, so the
    // click feels instant instead of waiting on a network response.
    const thumb = this.host.nativeElement.querySelector('.product-thumb') as HTMLElement | null;
    const trigger = event.currentTarget as HTMLElement;
    const thumbRect = thumb?.getBoundingClientRect();
    const thumbIsVisible = Boolean(
      thumbRect &&
      thumbRect.bottom > 0 &&
      thumbRect.top < window.innerHeight &&
      thumbRect.right > 0 &&
      thumbRect.left < window.innerWidth,
    );
    // A horizontal product rail can leave the image above the sticky header
    // while its Add button is still visible. Starting at that off-screen
    // image makes the whole first half of the flight invisible, so fall back
    // to the button the shopper actually clicked.
    this.flyToCart.fly(
      this.product().image,
      thumbIsVisible && thumb ? thumb : trigger,
      this.product().name,
    );

    // Adding is a server round-trip when signed in, so this awaits rather
    // than flashing "Added" before the server has agreed.
    if (!(await this.cart.add(this.product()))) {
      return;
    }
    this.justAdded.set(true);
    setTimeout(() => this.justAdded.set(false), 1000);
  }
}
