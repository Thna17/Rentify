import { Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { CatalogService } from '../core/catalog/catalog.service';
import { ProductSort } from '../core/catalog/catalog.models';
import { SearchTelemetryService } from '../core/telemetry/search-telemetry.service';
import { SeoService } from '../core/seo/seo.service';
import { TranslateService } from '../core/i18n/translate.service';
import { TranslatePipe } from '../core/i18n/translate.pipe';
import { CategoryTextPipe } from '../core/i18n/category-text.pipe';
import { NavbarComponent } from '../components/shared/layout/navbar/navbar.component';
import { FooterComponent } from '../components/shared/layout/footer/footer.component';
import { IconComponent } from '../components/shared/ui/icon/icon.component';
import { ProductCardComponent } from '../components/user/catalog/product-card/product-card.component';

const SORTS: { value: ProductSort; labelKey: string; defaultLabel: string }[] = [
  { value: 'featured', labelKey: 'catalog.sortFeatured', defaultLabel: 'Featured' },
  { value: 'price-asc', labelKey: 'catalog.sortPriceAsc', defaultLabel: 'Price: low to high' },
  { value: 'price-desc', labelKey: 'catalog.sortPriceDesc', defaultLabel: 'Price: high to low' },
  { value: 'rating', labelKey: 'catalog.sortRating', defaultLabel: 'Top rated' },
  { value: 'newest', labelKey: 'catalog.sortNewest', defaultLabel: 'Newest' },
];

@Component({
  selector: 'app-products',
  host: {
    '(document:keydown.escape)': 'closeMenu(); filtersOpen.set(false)',
    '(document:click)': 'onDocumentClick($event)',
  },
  imports: [CategoryTextPipe,
    RouterLink,
    NavbarComponent,
    FooterComponent,
    IconComponent,
    ProductCardComponent,
    TranslatePipe,
  ],
  template: `
    <app-navbar />

    <header class="container products-head">
      <nav class="crumbs" [attr.aria-label]="'common.breadcrumb' | translate">
        <a routerLink="/">{{ 'nav.home' | translate }}</a>
        <ui-icon name="chevron-right" [size]="12" />
        @if (categoryName(); as name) {
          <a routerLink="/products">{{ 'nav.products' | translate }}</a>
          <ui-icon name="chevron-right" [size]="12" />
          <span aria-current="page">{{ name }}</span>
        } @else {
          <span aria-current="page">{{ 'nav.products' | translate }}</span>
        }
      </nav>
      <div class="title-row">
        <h1>{{ heading() }}</h1>
        <span class="total">
          {{ results().length === 1 ? ('catalog.oneProductCount' | translate) : ('catalog.productsCount' | translate:{ count: results().length }) }}
          @if (search()) { {{ 'catalog.forSearch' | translate:{ term: search() } }} }
        </span>
      </div>
    </header>

    <div class="container toolbar" [attr.aria-label]="'products.productFilters' | translate">
      <button type="button" class="tool filters-btn" [class.active]="filtersOpen()" (click)="filtersOpen.set(!filtersOpen())" [attr.aria-expanded]="filtersOpen()">
        <ui-icon name="filter" [size]="15" /> {{ 'catalog.filters' | translate }}
        @if (sidebarCount()) { <span class="count">{{ sidebarCount() }}</span> }
      </button>
      <!-- Price -->
      <div class="dd" [class.open]="openMenu() === 'price'">
        <button
          type="button"
          class="tool dd-trigger"
          [class.active]="!!priceBand()"
          aria-haspopup="listbox"
          [attr.aria-expanded]="openMenu() === 'price'"
          (click)="toggleMenu('price')"
        >
          {{ priceLabel() }}
          <ui-icon class="dd-chevron" name="chevron-down" [size]="14" />
        </button>
        @if (openMenu() === 'price') {
          <div class="dd-backdrop" animate.enter="fade-in" animate.leave="fade-out" (click)="closeMenu()"></div>
          <div class="dd-menu" role="listbox" [attr.aria-label]="'catalog.price' | translate" animate.enter="menu-in" animate.leave="menu-out">
            <div class="dd-title">{{ 'catalog.price' | translate }}</div>
            <button type="button" class="dd-option" role="option" [class.on]="!priceBand()" [attr.aria-selected]="!priceBand()" (click)="pickPrice(null)">
              {{ 'catalog.anyPrice' | translate }} <ui-icon class="dd-check" name="check" [size]="15" />
            </button>
            @for (b of priceBands; track b.value) {
              <button type="button" class="dd-option" role="option" [class.on]="priceBand() === b.value" [attr.aria-selected]="priceBand() === b.value" (click)="pickPrice(b.value)">
                {{ b.labelKey | translate }} <ui-icon class="dd-check" name="check" [size]="15" />
              </button>
            }
          </div>
        }
      </div>

      <!-- Rating -->
      <div class="dd" [class.open]="openMenu() === 'rating'">
        <button
          type="button"
          class="tool dd-trigger"
          [class.active]="!!minRating()"
          aria-haspopup="listbox"
          [attr.aria-expanded]="openMenu() === 'rating'"
          (click)="toggleMenu('rating')"
        >
          @if (minRating(); as r) {
            <ui-icon name="star" [size]="13" [filled]="true" color="var(--color-gold)" /> {{ r }}+
          } @else {
            {{ 'catalog.rating' | translate }}
          }
          <ui-icon class="dd-chevron" name="chevron-down" [size]="14" />
        </button>
        @if (openMenu() === 'rating') {
          <div class="dd-backdrop" animate.enter="fade-in" animate.leave="fade-out" (click)="closeMenu()"></div>
          <div class="dd-menu" role="listbox" [attr.aria-label]="'catalog.rating' | translate" animate.enter="menu-in" animate.leave="menu-out">
            <div class="dd-title">{{ 'catalog.rating' | translate }}</div>
            <button type="button" class="dd-option" role="option" [class.on]="!minRating()" [attr.aria-selected]="!minRating()" (click)="pickRating(null)">
              {{ 'catalog.anyRating' | translate }} <ui-icon class="dd-check" name="check" [size]="15" />
            </button>
            @for (r of ratings; track r) {
              <button type="button" class="dd-option" role="option" [class.on]="minRating() === r" [attr.aria-selected]="minRating() === r" (click)="pickRating(r)">
                <span class="dd-stars"><ui-icon name="star" [size]="13" [filled]="true" color="var(--color-gold)" /> {{ r }} &amp; up</span>
                <ui-icon class="dd-check" name="check" [size]="15" />
              </button>
            }
          </div>
        }
      </div>
      <button type="button" class="tool" [class.active]="inStockOnly()" (click)="toggleInStock()">{{ 'catalog.inStock' | translate }}</button>
      <button type="button" class="tool" [class.active]="onSaleOnly()" (click)="toggleSale()">{{ 'catalog.onSaleOnly' | translate }}</button>
      @if (hasFilters()) {
        <button type="button" class="clear" (click)="clearAll()">{{ 'catalog.clearAll' | translate }}</button>
      }
      <div class="dd sort" [class.open]="openMenu() === 'sort'">
        <button
          type="button"
          class="tool dd-trigger"
          aria-haspopup="listbox"
          [attr.aria-expanded]="openMenu() === 'sort'"
          (click)="toggleMenu('sort')"
        >
          <span class="sort-label">{{ 'catalog.sort' | translate }}</span> {{ sortLabel() }}
          <ui-icon class="dd-chevron" name="chevron-down" [size]="14" />
        </button>
        @if (openMenu() === 'sort') {
          <div class="dd-backdrop" animate.enter="fade-in" animate.leave="fade-out" (click)="closeMenu()"></div>
          <div class="dd-menu right" role="listbox" [attr.aria-label]="'catalog.sortBy' | translate" animate.enter="menu-in" animate.leave="menu-out">
            <div class="dd-title">{{ 'catalog.sortBy' | translate }}</div>
            @for (option of sorts; track option.value) {
              <button type="button" class="dd-option" role="option" [class.on]="sort() === option.value" [attr.aria-selected]="sort() === option.value" (click)="pickSort(option.value)">
                {{ option.labelKey | translate }} <ui-icon class="dd-check" name="check" [size]="15" />
              </button>
            }
          </div>
        }
      </div>
    </div>

    <div class="container shop-layout" [class.with-side]="filtersOpen()">
      @if (filtersOpen()) {
        <aside class="side" [attr.aria-label]="'catalog.filters' | translate" animate.enter="side-in">
          <div class="side-head"><ui-icon name="filter" [size]="16" /> {{ 'catalog.filters' | translate }}</div>

          <div class="group">
            <h3>{{ 'catalog.category' | translate }}</h3>
            <button type="button" class="row" [class.on]="!category()" (click)="setCategory(null)">
              {{ 'catalog.all' | translate }} <span>{{ countFor({ category: undefined }) }}</span>
            </button>
            @for (cat of categories; track cat.slug) {
              <button type="button" class="row" [class.on]="category() === cat.slug" (click)="setCategory(cat.slug)">
                {{ cat | categoryText }} <span>{{ countFor({ category: cat.slug }) }}</span>
              </button>
            }
          </div>

          @if (subcategories().length) {
            <div class="group">
              <h3>{{ 'catalog.subCategory' | translate }}</h3>
              <button type="button" class="row" [class.on]="!subcategory()" (click)="setSub(null)">{{ 'catalog.all' | translate }}</button>
              @for (sub of subcategories(); track sub.slug) {
                <button type="button" class="row" [class.on]="subcategory() === sub.slug" (click)="setSub(sub.slug)">{{ sub | categoryText }}</button>
              }
            </div>
          }

          <div class="group">
            <h3>{{ 'catalog.price' | translate }}</h3>
            @for (b of priceBands; track b.value) {
              <label class="check">
                <input type="checkbox" [checked]="priceBand() === b.value" (change)="togglePrice(b.value)" />
                {{ b.labelKey | translate }}
              </label>
            }
            <div class="range">
              <input #min type="number" min="0" [placeholder]="'catalog.minPrice' | translate" [value]="minPrice() ?? ''" [attr.aria-label]="'catalog.minPrice' | translate" />
              <span>–</span>
              <input #max type="number" min="0" [placeholder]="'catalog.maxPrice' | translate" [value]="maxPrice() ?? ''" [attr.aria-label]="'catalog.maxPrice' | translate" />
              <button type="button" class="go" (click)="applyRange(min.value, max.value)" [attr.aria-label]="'catalog.applyPrice' | translate"><ui-icon name="arrow-right" [size]="14" /></button>
            </div>
          </div>

          <div class="group">
            <h3>{{ 'catalog.rating' | translate }}</h3>
            @for (r of ratings; track r) {
              <label class="check">
                <input type="checkbox" [checked]="minRating() === r" (change)="toggleRating(r)" />
                <ui-icon name="star" [size]="13" [filled]="true" color="var(--color-gold)" /> {{ r }} & up
              </label>
            }
          </div>

          <div class="group">
            <h3>{{ 'catalog.availability' | translate }}</h3>
            <label class="check"><input type="checkbox" [checked]="inStockOnly()" (change)="toggleInStock()" /> {{ 'catalog.inStockOnly' | translate }}</label>
            <label class="check"><input type="checkbox" [checked]="onSaleOnly()" (change)="toggleSale()" /> {{ 'catalog.onSaleOnly' | translate }}</label>
          </div>

          @if (hasFilters()) {
            <button type="button" class="side-clear" (click)="clearAll()">{{ 'catalog.clearAll' | translate }}</button>
          }
        </aside>
      }

    <section class="grid-section">
      @if (!catalog.loaded()) {
        <div class="catalog-state" aria-live="polite">
          <ui-icon class="spin" name="loader" [size]="28" />
          <h2>{{ 'state.loadingProducts' | translate }}</h2>
          <p>{{ 'state.checkingCatalog' | translate }}</p>
        </div>
      } @else if (catalog.productError()) {
        <div class="catalog-state error-state" role="alert">
          <div class="state-icon"><ui-icon name="alert-circle" [size]="30" /></div>
          <h2>{{ 'state.couldNotLoad' | translate }}</h2>
          <p>{{ catalog.productError() | translate }}</p>
          <button class="btn btn-primary" type="button" (click)="catalog.load()">
            {{ 'state.tryAgain' | translate }}
          </button>
        </div>
      } @else if (results().length) {
        <!-- Re-keyed on every filter/sort change so the cards play their
             entrance again; the stagger is capped so long lists stay snappy. -->
        @for (key of [filterKey()]; track key) {
          <div class="product-grid">
            @for (product of results(); track product.id; let i = $index) {
              <app-product-card class="card-in" [style.--i]="i < 12 ? i : 12" [product]="product" />
            }
          </div>
        }
      } @else {
        <div class="no-results" role="region" [attr.aria-label]="'search.zeroResultTitle' | translate">
          <div class="empty-image img-placeholder">
            <ui-icon name="search" [size]="34" />
          </div>
          <h2>{{ 'search.zeroResultTitle' | translate }}</h2>
          <p>
            {{ 'search.zeroResultBody' | translate }}
          </p>

          <div class="zero-recovery-block">
            <span class="recovery-label">{{ 'search.suggestedTerms' | translate }}</span>
            <div class="recovery-chips">
              @for (term of suggestedSearches; track term) {
                <button type="button" class="recovery-chip" (click)="runSuggestedSearch(term)">
                  <ui-icon name="search" [size]="12" /> {{ term }}
                </button>
              }
            </div>

            <span class="recovery-label">{{ 'search.suggestedCategories' | translate }}</span>
            <div class="recovery-chips">
              @for (cat of categories.slice(0, 6); track cat.slug) {
                <button type="button" class="recovery-chip" (click)="setCategory(cat.slug)">
                  <ui-icon [name]="cat.icon" [size]="12" /> {{ cat | categoryText }}
                </button>
              }
            </div>
          </div>

          <button class="btn btn-primary" (click)="clearAll()">
            {{ 'catalog.clearFilters' | translate }}
          </button>
        </div>
      }
    </section>
    </div>

    <app-footer />
  `,
  styles: [

    `
      /* Same tinted banner treatment as the category page — a plain white
         heading here was the odd one out next to every other listing page. */
      .products-intro {
        background: var(--color-bg-alt);
        border-bottom: 1px solid var(--color-border);
      }
      .products-intro-inner {
        padding: 18px 32px 20px;
      }
      .crumbs {
        display: flex;
        gap: 8px;
        font-size: 12.5px;
        color: var(--color-muted);
        margin-bottom: 14px;
      }
      .crumbs a:hover {
        color: var(--color-accent);
      }
      .intro-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
        flex-wrap: wrap;
      }
      .products-label {
        display: block;
        margin-bottom: 3px;
        color: var(--color-accent);
        font-size: 9px;
        font-weight: 800;
        letter-spacing: .1em;
        text-transform: uppercase;
      }
      h1 {
        font-size: clamp(22px, 2vw, 28px);
        letter-spacing: -.02em;
      }
      .products-total {
        padding: 7px 12px;
        border: 1px solid var(--color-border);
        border-radius: var(--radius-full);
        background: var(--color-surface);
        color: var(--color-muted);
        font-size: 11.5px;
        white-space: nowrap;
      }
      .filters-bar {
        padding: 18px 32px 0;
      }
      .filters-row {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 16px;
        flex-wrap: wrap;
        margin-top: 12px;
      }
      .sort {
        display: flex;
        align-items: center;
        gap: 9px;
        font-size: 13px;
        color: var(--color-muted);
      }
      .sort select {
        padding: 8px 11px;
        border: 1px solid var(--color-border-strong);
        border-radius: var(--radius-sm);
        background: #fff;
        font-size: 13px;
      }
      /* Only does anything at the mobile breakpoint below, where the row
         inside becomes a hidden-scrollbar horizontal scroller — the fade is
         the only remaining hint that there's more to the right. */
      .scroll-fade {
        position: relative;
      }
      .chips {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .chip {
        padding: 7px 14px;
        border: 1px solid var(--color-border-strong);
        border-radius: var(--radius-full);
        background: #fff;
        font-size: 12.5px;
        font-weight: 550;
        color: var(--color-text-secondary);
      }
      .chip:hover {
        border-color: var(--color-muted);
        background: var(--color-bg-alt);
      }
      .chip.active {
        background: var(--color-accent);
        border-color: var(--color-accent);
        color: #fff;
      }
      .clear {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 0;
        border: 0;
        background: none;
        color: var(--color-accent);
        font-size: 12.5px;
        font-weight: 600;
      }
      .clear:hover {
        text-decoration: underline;
      }
      .quick-filters { align-items: flex-end; display: flex; flex-wrap: wrap; gap: 8px; }
      .quick-filters label { display: grid; gap: 4px; }
      .quick-filters label > span { color: var(--color-muted); font-size: 10px; font-weight: 650; }
      .quick-filters select, .toggle-filter { min-height: 34px; border: 1px solid var(--color-border-strong); border-radius: var(--radius-full); background: #fff; color: var(--color-text-secondary); font: inherit; font-size: 11.5px; padding: 0 12px; }
      .toggle-filter { align-items: center; display: inline-flex; gap: 5px; }
      .toggle-filter.active { background: var(--color-accent-soft); border-color: var(--color-accent); color: var(--color-accent); }
      .grid-section {
        padding: 26px 32px 60px;
      }
      .product-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
        gap: 18px;
      }
      .no-results {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        padding: 50px 32px 70px;
        gap: 12px;
      }
      .catalog-state {
        align-items: center;
        display: flex;
        flex-direction: column;
        gap: 10px;
        min-height: 320px;
        justify-content: center;
        padding: 42px 24px;
        text-align: center;
      }
      .catalog-state h2 { font-size: 19px; }
      .catalog-state p { color: var(--color-muted); font-size: 13.5px; margin-bottom: 5px; }
      .state-icon { color: #9b6517; }
      .spin { animation: spin 900ms linear infinite; color: var(--color-accent); }
      @keyframes spin { to { transform: rotate(360deg); } }
      .empty-image {
        width: 140px;
        height: 140px;
        border-radius: 50%;
        color: var(--color-muted-2);
        margin-bottom: 8px;
      }
      .no-results h2 {
        font-size: 19px;
      }
      .no-results p {
        color: var(--color-muted);
        font-size: 14px;
        max-width: 400px;
        margin-bottom: 8px;
      }
      .zero-recovery-block {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        margin: 14px 0 20px;
        max-width: 580px;
      }
      .recovery-label {
        font-size: 12.5px;
        font-weight: 600;
        color: var(--color-text-secondary);
        margin-top: 6px;
      }
      .recovery-chips {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 8px;
      }
      .recovery-chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        border: 1px solid var(--color-border);
        border-radius: 999px;
        background: var(--color-surface);
        color: var(--color-text);
        font-size: 12.5px;
        cursor: pointer;
        transition: all 140ms ease;
      }
      .recovery-chip:hover {
        border-color: var(--color-accent);
        color: var(--color-accent);
        background: var(--color-accent-soft, rgba(200, 90, 40, 0.06));
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
        .products-intro-inner { padding-inline: 16px; }
        .filters-bar { padding-inline: 16px; }
        .chips { flex-wrap: nowrap; overflow-x: auto; padding-bottom: 4px; scrollbar-width: none; }
        .chips::-webkit-scrollbar { display: none; }
        .chip { flex: 0 0 auto; }
        .quick-filters { flex-wrap: nowrap; overflow-x: auto; padding-bottom: 5px; scrollbar-width: none; }
        .quick-filters::-webkit-scrollbar { display: none; }
        .quick-filters label, .toggle-filter { flex: 0 0 auto; }
        .scroll-fade::after {
          content: '';
          position: absolute;
          top: 0;
          right: 0;
          bottom: 4px;
          width: 28px;
          background: linear-gradient(to right, rgba(255, 253, 248, 0), var(--color-bg));
          pointer-events: none;
        }
        /* filters-row already wraps the "Clear filters" button onto its own
           line when the scrollable row above leaves no horizontal room. */
        .filters-row { row-gap: 10px; }
        .grid-section { padding-inline: 16px; }
        .product-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
      @media (max-width: 370px) {
        .product-grid { grid-template-columns: 1fr; }
      }

      /* ---------- redesigned header, toolbar and filter drawer */
      .products-head { padding-top: 22px; }
      .crumbs { display: flex; align-items: center; gap: 6px; font-size: 12.5px; color: var(--color-muted); margin-bottom: 10px; }
      .crumbs a { color: var(--color-muted); }
      .crumbs a:hover { color: var(--color-accent); }
      .crumbs span[aria-current] { color: var(--color-text); font-weight: 500; }
      .title-row { display: flex; align-items: baseline; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
      .title-row h1 { font-family: var(--font-body); font-size: clamp(24px, 2.4vw, 30px); font-weight: 700; letter-spacing: -.02em; }
      .total { font-size: 13.5px; color: var(--color-muted); }

      .toolbar {
        display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
        margin-top: 14px; padding-bottom: 14px; border-bottom: 1px solid var(--color-border);
      }
      .tool {
        position: relative; display: inline-flex; align-items: center; gap: 6px; height: 36px; padding: 0 13px;
        border: 1px solid var(--color-border); border-radius: 999px; background: var(--color-surface);
        color: var(--color-text); font-size: 13px; font-weight: 500; cursor: pointer; white-space: nowrap;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
        transition: border-color 150ms ease, background 150ms ease, color 150ms ease, box-shadow 150ms ease;
      }
      .tool:hover {
        border-color: var(--color-border-strong, #cbd5e1);
        background: var(--color-bg-alt);
        color: var(--color-text);
      }
      .tool.active {
        background: var(--color-forest, #1e392a);
        border-color: var(--color-forest, #1e392a);
        color: #fff;
        box-shadow: 0 2px 8px rgba(30, 57, 42, 0.2);
      }
      .filters-btn .count {
        display: grid; place-items: center; min-width: 18px; height: 18px; padding: 0 5px; border-radius: 999px;
        background: var(--color-accent); color: #fff; font-size: 11px; font-weight: 700;
        margin-left: 2px;
      }
      .tool.active.filters-btn .count {
        background: #fff;
        color: var(--color-forest, #1e392a);
      }
      .clear {
        border: 0; background: none; color: var(--color-accent); font-size: 13px; font-weight: 600; cursor: pointer;
        padding: 0 6px; white-space: nowrap; transition: opacity 140ms ease;
      }
      .clear:hover { text-decoration: underline; opacity: 0.85; }

      /* ---------- pill dropdowns: tap anywhere on the pill to open */
      .dd { position: relative; flex-shrink: 0; }
      .dd-trigger { padding-right: 11px; }
      .dd-chevron { color: var(--color-muted); transition: transform 220ms cubic-bezier(.2,.7,.2,1); }
      .tool.active .dd-chevron { color: inherit; }
      .dd.open .dd-trigger:not(.active) { border-color: var(--color-text); }
      .dd.open .dd-chevron { transform: rotate(180deg); }
      .sort { margin-left: auto; }
      .sort-label { color: var(--color-muted); font-size: 12.5px; }
      .dd-menu {
        position: absolute; z-index: 60; top: calc(100% + 8px); left: 0; min-width: 220px; padding: 6px;
        border: 1px solid var(--color-border); border-radius: 14px; background: var(--color-surface);
        box-shadow: var(--shadow-lg); transform-origin: top left;
      }
      .dd-menu.right { left: auto; right: 0; transform-origin: top right; }
      .dd-title { display: none; }
      .dd-option {
        display: flex; align-items: center; justify-content: space-between; gap: 12px; width: 100%;
        min-height: 40px; padding: 0 12px; border: 0; border-radius: 10px; background: none;
        font: inherit; font-size: 13.5px; color: var(--color-text-secondary); text-align: left; cursor: pointer;
        transition: background 120ms ease, color 120ms ease;
      }
      .dd-option:hover { background: var(--color-bg-alt); color: var(--color-text); }
      .dd-option.on { color: var(--color-text); font-weight: 600; }
      .dd-check { opacity: 0; transform: scale(.6); color: var(--color-accent); transition: opacity 150ms ease, transform 200ms cubic-bezier(.2,.7,.2,1); }
      .dd-option.on .dd-check { opacity: 1; transform: none; }
      .dd-stars { display: inline-flex; align-items: center; gap: 6px; }
      .dd-backdrop { display: none; }
      .menu-in { animation: menuIn 200ms cubic-bezier(.2,.8,.2,1) both; }
      .menu-out { animation: menuOut 140ms ease-in both; }
      @keyframes menuIn { from { opacity: 0; transform: translateY(-6px) scale(.96); } }
      @keyframes menuOut { to { opacity: 0; transform: translateY(-4px) scale(.98); } }
      .fade-in { animation: ddFade 200ms ease both; }
      .fade-out { animation: ddFade 160ms ease reverse both; }
      @keyframes ddFade { from { opacity: 0; } }

      /* ---------- product entrance: staggered rise on every filter change */
      .card-in { animation: cardIn 460ms cubic-bezier(.2,.75,.25,1) both; animation-delay: calc(var(--i, 0) * 40ms); }
      @keyframes cardIn {
        from { opacity: 0; transform: translateY(14px) scale(.98); filter: blur(2px); }
        to { opacity: 1; transform: none; filter: none; }
      }

      .grid-section { padding-top: 24px; }
      .product-grid { grid-template-columns: repeat(4, minmax(0, 1fr)) !important; gap: 28px 20px !important; }

      .shop-layout { display: block; }
      .shop-layout.with-side { display: grid; grid-template-columns: 260px minmax(0, 1fr); gap: 28px; align-items: start; }
      .with-side .product-grid { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
      .shop-layout > .grid-section { padding-inline: 0; }
      .side {
        position: sticky; top: calc(var(--header-h, 64px) + 60px); margin-top: 24px;
        max-height: calc(100vh - 150px); overflow-y: auto; scrollbar-width: thin;
        padding: 16px; border: 1px solid var(--color-border); border-radius: 16px; background: var(--color-surface-raised);
      }
      .side-in { animation: sideIn 200ms var(--ease-out); }
      @keyframes sideIn { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: none; } }
      .side-head { display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 700; padding-bottom: 12px; border-bottom: 1px solid var(--color-border); }
      .group { padding: 14px 0; border-bottom: 1px solid var(--color-border); }
      .group:last-of-type { border-bottom: 0; }
      .group h3 { margin: 0 0 8px; font-size: 11.5px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: var(--color-muted); }
      .row {
        display: flex; justify-content: space-between; align-items: center; width: 100%; padding: 8px 10px;
        border: 0; border-radius: 10px; background: none; font: inherit; font-size: 14px; text-align: left;
        color: var(--color-text-secondary); cursor: pointer;
      }
      .row span { font-size: 12.5px; color: var(--color-muted); }
      .row:hover { background: var(--color-bg-alt); }
      .row.on { background: var(--color-accent-soft); color: var(--color-accent); font-weight: 600; }
      .check { display: flex; align-items: center; gap: 10px; padding: 7px 2px; font-size: 14px; color: var(--color-text-secondary); cursor: pointer; }
      .check input { width: 16px; height: 16px; accent-color: var(--color-accent); }
      .range { display: flex; align-items: center; gap: 6px; margin-top: 8px; color: var(--color-muted); }
      .range input {
        width: 100%; min-width: 0; height: 36px; padding: 0 10px; border: 1px solid var(--color-border);
        border-radius: 10px; font: inherit; font-size: 13.5px; background: var(--color-surface); color: var(--color-text);
      }
      .range input:focus { outline: none; border-color: var(--color-accent); }
      .go { flex-shrink: 0; display: grid; place-items: center; width: 36px; height: 36px; border: 0; border-radius: 10px; background: var(--color-text); color: #fff; cursor: pointer; }
      .side-clear { margin-top: 12px; width: 100%; height: 40px; border: 1px solid var(--color-border-strong); border-radius: 999px; background: none; font: inherit; font-size: 13.5px; font-weight: 600; color: var(--color-text); cursor: pointer; }
      @media (max-width: 900px) {
        .shop-layout.with-side { grid-template-columns: 1fr; }
        .side { position: static; max-height: none; }
        .with-side .product-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
      }

      @media (max-width: 1100px) { .product-grid { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; } }
      @media (max-width: 820px) {
        .product-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; gap: 22px 14px !important; }
        .toolbar { flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none; }
        .toolbar::-webkit-scrollbar { display: none; }
        .toolbar > * { flex-shrink: 0; }
        .sort { margin-left: 0; }
        /* Phone: the option list is a bottom sheet (the toolbar scrolls sideways,
           so an attached popover would get clipped). */
        .dd-backdrop { display: block; position: fixed; inset: 0; z-index: 59; background: rgba(15, 23, 42, .38); }
        .dd-menu, .dd-menu.right {
          position: fixed; top: auto; left: 0; right: 0; bottom: 0; min-width: 0;
          padding: 8px 12px calc(14px + env(safe-area-inset-bottom)); border: 0; border-radius: 20px 20px 0 0;
          box-shadow: 0 -12px 40px rgba(15, 23, 42, .16);
        }
        .dd-menu::before { content: ''; display: block; width: 36px; height: 4px; margin: 2px auto 8px; border-radius: 99px; background: var(--color-border-strong); }
        .dd-title { display: block; padding: 2px 12px 8px; font-size: 15px; font-weight: 700; color: var(--color-text); }
        .dd-option { min-height: 48px; font-size: 14.5px; }
        .menu-in { animation: sheetUp 260ms cubic-bezier(.2,.8,.2,1) both; }
        .menu-out { animation: sheetDown 180ms ease-in both; }
        @keyframes sheetUp { from { transform: translateY(100%); } }
        @keyframes sheetDown { to { transform: translateY(100%); } }
      }
      @media (prefers-reduced-motion: reduce) {
        .card-in, .menu-in, .menu-out, .fade-in, .fade-out { animation-duration: 1ms; animation-delay: 0ms; }
      }
      @media (max-width: 370px) { .product-grid { grid-template-columns: 1fr !important; } }
    `,
  ],
})
export class ProductsComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly catalog = inject(CatalogService);
  private readonly telemetry = inject(SearchTelemetryService);
  private readonly seo = inject(SeoService);
  protected readonly translate = inject(TranslateService);

  protected readonly categories = this.catalog.categories;
  protected readonly sorts = SORTS;

  readonly suggestedSearches = [
    'silk scarf',
    'kampot pepper',
    'palm sugar',
    'bamboo basket',
    'jasmine rice',
    'pottery',
  ];

  // The URL is the single source of truth for filter state, so a filtered view
  // is shareable and the back button steps back through filters.
  private readonly params = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  protected readonly search = computed(() => this.params().get('search') ?? '');
  protected readonly category = computed(() => this.params().get('category'));
  protected readonly collection = computed(() =>
    this.params().get('collection'),
  );
  protected readonly sort = computed(
    () => (this.params().get('sort') as ProductSort | null) ?? 'featured',
  );
  protected readonly onSaleOnly = computed(() => this.params().get('sale') === '1');
  protected readonly inStockOnly = computed(() => this.params().get('stock') === '1');
  protected readonly minRating = computed(() => {
    const value = Number(this.params().get('rating'));
    return Number.isFinite(value) && value > 0 ? value : null;
  });
  protected readonly priceBand = computed(() => this.params().get('price') ?? '');
  protected readonly minPrice = computed(() => this.num(this.params().get('min')));
  protected readonly maxPrice = computed(() => this.num(this.params().get('max')));
  protected readonly priceRange = computed(() => {
    const min = this.minPrice();
    const max = this.maxPrice();
    if (min !== null || max !== null) {
      return { ...(min !== null ? { priceMin: min } : {}), ...(max !== null ? { priceMax: max } : {}) };
    }
    switch (this.priceBand()) {
      case 'under-5': return { priceMax: 5 };
      case '5-10': return { priceMin: 5, priceMax: 10 };
      case '10-20': return { priceMin: 10, priceMax: 20 };
      case 'over-20': return { priceMin: 20 };
      default: return {};
    }
  });
  protected readonly hasFilters = computed(() => Boolean(
    this.search() || this.category() || this.subcategory() || this.collection() || this.onSaleOnly() ||
    this.inStockOnly() || this.minRating() || this.priceBand() ||
    this.minPrice() !== null || this.maxPrice() !== null,
  ));

  protected readonly filtersOpen = signal(false);

  /** Which toolbar pill has its option list open. */
  protected readonly openMenu = signal<'price' | 'rating' | 'sort' | null>(null);

  /** Changes whenever the visible list changes, so the grid can replay its entrance. */
  protected readonly filterKey = computed(() => this.params().toString());

  protected readonly priceLabel = computed(() => {
    const band = this.priceBands.find((b) => b.value === this.priceBand());
    return this.translate.t(band ? band.labelKey : 'catalog.price');
  });
  protected readonly sortLabel = computed(() => {
    const option = SORTS.find((o) => o.value === this.sort()) ?? SORTS[0];
    return this.translate.t(option.labelKey);
  });

  protected toggleMenu(menu: 'price' | 'rating' | 'sort'): void {
    this.openMenu.update((open) => (open === menu ? null : menu));
  }

  protected closeMenu(): void {
    this.openMenu.set(null);
  }

  protected onDocumentClick(event: MouseEvent): void {
    if (this.openMenu() && !(event.target as HTMLElement).closest('.dd')) {
      this.closeMenu();
    }
  }

  protected pickPrice(value: string | null): void {
    this.merge({ price: value, min: null, max: null });
    this.closeMenu();
  }

  protected pickRating(value: number | null): void {
    this.merge({ rating: value === null ? null : String(value) });
    this.closeMenu();
  }

  protected pickSort(value: ProductSort): void {
    this.merge({ sort: value === 'featured' ? null : value });
    this.closeMenu();
  }
  protected readonly subcategory = computed(() => this.params().get('subcategory'));
  protected readonly subcategories = computed(() => {
    const slug = this.category();
    return slug ? this.catalog.category(slug)?.subcategories ?? [] : [];
  });
  protected readonly priceBands = [
    { value: 'under-5', labelKey: 'catalog.priceUnder5', defaultLabel: 'Under $5' },
    { value: '5-10', labelKey: 'catalog.price5To10', defaultLabel: '$5 – $10' },
    { value: '10-20', labelKey: 'catalog.price10To20', defaultLabel: '$10 – $20' },
    { value: 'over-20', labelKey: 'catalog.priceOver20', defaultLabel: 'Over $20' },
  ];
  protected readonly ratings = [4.5, 4, 3.5];

  constructor() {
    // Dynamic privacy-safe search telemetry
    effect(() => {
      const q = this.search();
      const list = this.results();
      const filterCount =
        (this.category() ? 1 : 0) +
        (this.subcategory() ? 1 : 0) +
        (this.onSaleOnly() ? 1 : 0) +
        (this.inStockOnly() ? 1 : 0) +
        (this.minRating() ? 1 : 0) +
        (this.priceBand() ? 1 : 0);

      this.telemetry.recordSearch({
        queryLength: q.length,
        filterCount,
        durationMs: 1.5,
        resultCount: list.length,
      });
    });

    // Dynamic SEO title updates
    effect(() => {
      const head = this.heading();
      this.seo.setPageTitle(head);
    });
  }

  /** How many products a category option would show with the other filters kept. */
  protected countFor(override: { category?: string }): number {
    return this.catalog.search({
      search: this.search(),
      category: override.category,
      onSaleOnly: this.onSaleOnly() || undefined,
      inStockOnly: this.inStockOnly() || undefined,
      minRating: this.minRating() ?? undefined,
      ...this.priceRange(),
    }).length;
  }

  protected runSuggestedSearch(term: string): void {
    this.merge({ search: term, category: null, subcategory: null });
  }

  protected setSub(slug: string | null): void {
    this.merge({ subcategory: slug });
  }

  protected togglePrice(value: string): void {
    this.merge({ price: this.priceBand() === value ? null : value, min: null, max: null });
  }

  protected toggleRating(value: number): void {
    this.merge({ rating: this.minRating() === value ? null : String(value) });
  }
  /** Filters set inside the sidebar (category, custom price range). */
  protected readonly sidebarCount = computed(() =>
    (this.category() ? 1 : 0) + (this.minPrice() !== null || this.maxPrice() !== null ? 1 : 0),
  );
  protected readonly categoryName = computed(() => {
    const slug = this.category();
    return slug ? this.catalog.category(slug)?.name ?? null : null;
  });

  readonly results = computed(() =>
    this.catalog.search({
      search: this.search(),
      category: this.category() ?? undefined,
      subcategory: this.subcategory() ?? undefined,
      collection: this.collection() ?? undefined,
      sort: this.sort(),
      onSaleOnly: this.onSaleOnly() || undefined,
      inStockOnly: this.inStockOnly() || undefined,
      minRating: this.minRating() ?? undefined,
      ...this.priceRange(),
    }),
  );

  protected readonly heading = computed(() => {
    const categorySlug = this.category();
    if (categorySlug) {
      return this.catalog.category(categorySlug)?.name ?? this.translate.t('nav.products');
    }
    const collection = this.collection();
    if (collection) {
      return collection
        .split('-')
        .map((word) => word[0].toUpperCase() + word.slice(1))
        .join(' ');
    }
    if (this.onSaleOnly()) {
      return this.translate.t('catalog.onSale');
    }
    return this.search() ? this.translate.t('catalog.searchResults') : this.translate.t('catalog.allProducts');
  });

  protected setCategory(slug: string | null): void {
    this.merge({ category: slug, subcategory: null });
  }

  protected applyRange(min: string, max: string): void {
    // A custom range replaces the quick price band.
    this.merge({ min: min.trim() || null, max: max.trim() || null, price: null });
  }

  private num(value: string | null): number | null {
    if (value === null || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 ? n : null;
  }

  protected toggleInStock(): void {
    this.merge({ stock: this.inStockOnly() ? null : '1' });
  }

  protected toggleSale(): void {
    this.merge({ sale: this.onSaleOnly() ? null : '1' });
  }

  protected clearAll(): void {
    this.router.navigate(['/products'], { queryParams: {} });
  }

  private merge(params: Record<string, string | null>): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: params,
      queryParamsHandling: 'merge',
    });
  }

  protected t(key: string, params?: Record<string, string | number>): string {
    return this.translate.t(key, params);
  }
}
