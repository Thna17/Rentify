import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Product } from '../../../../core/catalog/catalog.models';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { ProductCardComponent } from '../product-card/product-card.component';

/**
 * A horizontally scrollable row of product cards.
 *
 * Used for the homepage discovery sections and related products, where the
 * point is to browse sideways through a curated set rather than scan a full
 * grid. Scrolls by touch, trackpad, scrollbar and keyboard — the rail itself
 * is focusable so arrow keys work without a mouse.
 */
@Component({
  selector: 'app-product-rail',
  imports: [RouterLink, IconComponent, ProductCardComponent],
  template: `
    <div class="section-head">
      <h2>{{ title() }}</h2>

      @if (linkRoute()) {
        <a class="see-all" [routerLink]="linkRoute()" [queryParams]="linkParams()">
          {{ linkLabel() }} <ui-icon name="arrow-right" [size]="14" />
        </a>
      }
    </div>

    <div
      class="rail"
      [class.editorial-rail]="variant() === 'editorial'"
      [class.as-grid]="layout() === 'grid'"
      [attr.tabindex]="layout() === 'grid' ? null : 0"
      role="region"
      [attr.aria-label]="title()"
    >
      @for (product of products(); track product.id) {
        <app-product-card [product]="product" [variant]="variant()" [badge]="badge()" />
      }
    </div>

    @if (layout() === 'grid' && linkRoute()) {
      <div class="rail-more">
        <a class="more-btn" [routerLink]="linkRoute()" [queryParams]="linkParams()">
          {{ linkLabel() }} <ui-icon name="arrow-right" [size]="14" />
        </a>
      </div>
    }
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .section-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 20px;
      }
      /* Grid layout: wrap into rows instead of scrolling sideways. */
      .rail.as-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(212px, 1fr));
        gap: 18px;
        overflow: visible;
      }
      .rail.as-grid > * { width: auto; min-width: 0; flex: none; scroll-snap-align: none; }
      .rail-more { display: flex; justify-content: center; margin-top: 26px; }
      .more-btn {
        align-items: center;
        border: 1px solid var(--color-border-strong, #d9cfc2);
        border-radius: 999px;
        color: var(--color-text, #2b2118);
        display: inline-flex;
        font-size: 13.5px;
        font-weight: 650;
        gap: 8px;
        padding: 11px 26px;
        text-decoration: none;
        transition: background 160ms ease, border-color 160ms ease, color 160ms ease;
      }
      .more-btn:hover {
        background: var(--color-accent, #8e3021);
        border-color: var(--color-accent, #8e3021);
        color: #fff;
      }
      @media (max-width: 640px) {
        .rail.as-grid { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; }
      }

      .section-head h2 {
        font-size: clamp(22px, 1.6vw, 28px);
      }
      .see-all {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        color: var(--color-accent);
        font-size: 14px;
        font-weight: 600;
        white-space: nowrap;
      }
      .see-all:hover {
        text-decoration: underline;
        text-underline-offset: 4px;
      }
      .see-all ui-icon { transition: transform 180ms ease; }
      .see-all:hover ui-icon { transform: translateX(3px); }

      .rail {
        display: flex;
        gap: clamp(11px, 1vw, 16px);
        overflow-x: auto;
        overflow-y: hidden;
        scroll-snap-type: x proximity;
        /* Room for the card's hover lift, focus ring and shadow, which the
           scroll container would otherwise clip — a card's top edge was
           getting cut off mid-hover. The negative margin cancels the added
           padding exactly, so this only adds clip-safe headroom; nothing
           else (the title above, the first row of cards, spacing below)
           moves. */
        padding: 18px 5px 8px;
        margin: -18px -4px 0;
        scrollbar-width: none;
      }
      .rail::-webkit-scrollbar {
        display: none;
      }
      .rail:focus-visible {
        outline: 2px solid var(--color-accent);
        outline-offset: 2px;
        border-radius: var(--radius-md);
      }
      /* Keep the scrollbar visible rather than overlay-only: with no arrow
         buttons it is the only cue that the row scrolls. */
      .rail::-webkit-scrollbar {
        height: 7px;
      }
      .rail::-webkit-scrollbar-track {
        background: transparent;
      }
      .rail::-webkit-scrollbar-thumb {
        background: var(--color-border-strong);
        border-radius: var(--radius-full);
      }
      .rail::-webkit-scrollbar-thumb:hover {
        background: var(--color-muted-2);
      }

      /* Dense discovery rails expose more choices before the shopper needs to
         scroll, while each card still has enough room for two-line names. */
      .rail app-product-card {
        flex: 0 0 clamp(190px, 13vw, 224px);
        scroll-snap-align: start;
      }
      .rail.editorial-rail app-product-card {
        flex-basis: clamp(260px, 20vw, 320px);
      }

      @media (max-width: 700px) {
        .rail app-product-card {
          flex-basis: min(62vw, 240px);
        }
        .rail.editorial-rail app-product-card {
          flex-basis: min(76vw, 300px);
        }
      }
      @media (max-width: 420px) {
        .rail app-product-card {
          flex-basis: min(72vw, 232px);
        }
        .rail.editorial-rail app-product-card {
          flex-basis: min(82vw, 292px);
        }
      }
    `,
  ],
})
export class ProductRailComponent {
  /**
   * 'rail' scrolls sideways; 'grid' wraps into rows instead, for sections that
   * should read as a full catalogue rather than a peek at one.
   */
  readonly layout = input<'rail' | 'grid'>('rail');

  readonly title = input.required<string>();
  readonly badge = input<'Best seller' | 'New' | null>(null);
  readonly products = input.required<Product[]>();
  readonly variant = input<'default' | 'editorial'>('default');
  readonly linkLabel = input('See all');
  readonly linkRoute = input<string | null>(null);
  readonly linkParams = input<Record<string, string>>({});
}
