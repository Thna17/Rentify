import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { CatalogService } from '../core/catalog/catalog.service';
import { ProductSort } from '../core/catalog/catalog.models';
import { NavbarComponent } from '../components/shared/layout/navbar/navbar.component';
import { FooterComponent } from '../components/shared/layout/footer/footer.component';
import { IconComponent } from '../components/shared/ui/icon/icon.component';
import { ProductCardComponent } from '../components/user/catalog/product-card/product-card.component';

const SORTS: { value: ProductSort; label: string }[] = [
  { value: 'featured', label: 'Featured' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'rating', label: 'Top rated' },
  { value: 'newest', label: 'Newest' },
];

@Component({
  selector: 'app-products',
  host: { '(document:keydown.escape)': 'filtersOpen.set(false)' },
  imports: [
    RouterLink,
    NavbarComponent,
    FooterComponent,
    IconComponent,
    ProductCardComponent,
  ],
  template: `
    <app-navbar />

    <header class="container products-head">
      <nav class="crumbs" aria-label="Breadcrumb">
        <a routerLink="/">Home</a>
        <ui-icon name="chevron-right" [size]="12" />
        @if (categoryName(); as name) {
          <a routerLink="/products">Products</a>
          <ui-icon name="chevron-right" [size]="12" />
          <span aria-current="page">{{ name }}</span>
        } @else {
          <span aria-current="page">Products</span>
        }
      </nav>
      <div class="title-row">
        <h1>{{ heading() }}</h1>
        <span class="total">
          {{ results().length }} {{ results().length === 1 ? 'product' : 'products' }}
          @if (search()) { for “{{ search() }}” }
        </span>
      </div>
    </header>

    <div class="container toolbar" aria-label="Product filters">
      <button type="button" class="tool filters-btn" [class.active]="filtersOpen()" (click)="filtersOpen.set(!filtersOpen())" [attr.aria-expanded]="filtersOpen()">
        <ui-icon name="filter" [size]="15" /> Filters
        @if (sidebarCount()) { <span class="count">{{ sidebarCount() }}</span> }
      </button>
      <label class="tool select">
        <select [value]="priceBand()" (change)="setPriceBand($event)" aria-label="Price">
          <option value="">Price</option>
          <option value="under-5">Under $5</option>
          <option value="5-10">$5–$10</option>
          <option value="10-20">$10–$20</option>
          <option value="over-20">Over $20</option>
        </select>
        <ui-icon name="chevron-down" [size]="14" />
      </label>
      <label class="tool select">
        <select [value]="minRating() ?? ''" (change)="setRating($event)" aria-label="Rating">
          <option value="">Rating</option>
          <option value="4.5">4.5 & up</option>
          <option value="4">4.0 & up</option>
        </select>
        <ui-icon name="chevron-down" [size]="14" />
      </label>
      <button type="button" class="tool" [class.active]="inStockOnly()" (click)="toggleInStock()">In stock</button>
      <button type="button" class="tool" [class.active]="onSaleOnly()" (click)="toggleSale()">On sale</button>
      @if (hasFilters()) {
        <button type="button" class="clear" (click)="clearAll()">Clear all</button>
      }
      <label class="tool select sort">
        <span>Sort:</span>
        <select [value]="sort()" (change)="setSort($event)" aria-label="Sort">
          @for (option of sorts; track option.value) {
            <option [value]="option.value">{{ option.label }}</option>
          }
        </select>
        <ui-icon name="chevron-down" [size]="14" />
      </label>
    </div>


    <div class="container shop-layout" [class.with-side]="filtersOpen()">
      @if (filtersOpen()) {
        <aside class="side" aria-label="Filters" animate.enter="side-in">
          <div class="side-head"><ui-icon name="filter" [size]="16" /> Filters</div>

          <div class="group">
            <h3>Category</h3>
            <button type="button" class="row" [class.on]="!category()" (click)="setCategory(null)">
              All <span>{{ countFor({ category: undefined }) }}</span>
            </button>
            @for (cat of categories; track cat.slug) {
              <button type="button" class="row" [class.on]="category() === cat.slug" (click)="setCategory(cat.slug)">
                {{ cat.name }} <span>{{ countFor({ category: cat.slug }) }}</span>
              </button>
            }
          </div>

          @if (subcategories().length) {
            <div class="group">
              <h3>Sub-category</h3>
              <button type="button" class="row" [class.on]="!subcategory()" (click)="setSub(null)">All</button>
              @for (sub of subcategories(); track sub.slug) {
                <button type="button" class="row" [class.on]="subcategory() === sub.slug" (click)="setSub(sub.slug)">{{ sub.name }}</button>
              }
            </div>
          }

          <div class="group">
            <h3>Price</h3>
            @for (b of priceBands; track b.value) {
              <label class="check">
                <input type="checkbox" [checked]="priceBand() === b.value" (change)="togglePrice(b.value)" />
                {{ b.label }}
              </label>
            }
            <div class="range">
              <input #min type="number" min="0" placeholder="Min" [value]="minPrice() ?? ''" aria-label="Minimum price" />
              <span>–</span>
              <input #max type="number" min="0" placeholder="Max" [value]="maxPrice() ?? ''" aria-label="Maximum price" />
              <button type="button" class="go" (click)="applyRange(min.value, max.value)" aria-label="Apply price"><ui-icon name="arrow-right" [size]="14" /></button>
            </div>
          </div>

          <div class="group">
            <h3>Rating</h3>
            @for (r of ratings; track r) {
              <label class="check">
                <input type="checkbox" [checked]="minRating() === r" (change)="toggleRating(r)" />
                <ui-icon name="star" [size]="13" [filled]="true" color="var(--color-gold)" /> {{ r }} & up
              </label>
            }
          </div>

          <div class="group">
            <h3>Availability</h3>
            <label class="check"><input type="checkbox" [checked]="inStockOnly()" (change)="toggleInStock()" /> In stock only</label>
            <label class="check"><input type="checkbox" [checked]="onSaleOnly()" (change)="toggleSale()" /> On sale</label>
          </div>

          @if (hasFilters()) {
            <button type="button" class="side-clear" (click)="clearAll()">Clear all filters</button>
          }
        </aside>
      }

    <section class="grid-section">
      @if (!catalog.loaded()) {
        <div class="catalog-state" aria-live="polite">
          <ui-icon class="spin" name="loader" [size]="28" />
          <h2>Loading products</h2>
          <p>We’re checking the latest products and availability.</p>
        </div>
      } @else if (catalog.productError()) {
        <div class="catalog-state error-state" role="alert">
          <div class="state-icon"><ui-icon name="alert-circle" [size]="30" /></div>
          <h2>We couldn’t load the marketplace</h2>
          <p>{{ catalog.productError() }}</p>
          <button class="btn btn-primary" type="button" (click)="catalog.load()">
            Try again
          </button>
        </div>
      } @else if (results().length) {
        <div class="product-grid">
          @for (product of results(); track product.id) {
            <app-product-card [product]="product" />
          }
        </div>
      } @else {
        <div class="no-results">
          <div class="empty-image img-placeholder">
            <ui-icon name="search" [size]="34" />
          </div>
          <h2>No products match that search</h2>
          <p>
            Try a different keyword, or clear the filters to see everything we
            have.
          </p>
          <button class="btn btn-primary" (click)="clearAll()">
            Clear filters
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
        margin-top: 18px; padding-bottom: 18px; border-bottom: 1px solid var(--color-border);
      }
      .tool {
        position: relative; display: inline-flex; align-items: center; gap: 7px; height: 38px; padding: 0 14px;
        border: 1px solid var(--color-border); border-radius: 999px; background: var(--color-surface);
        color: var(--color-text); font-size: 13.5px; font-weight: 500; cursor: pointer; white-space: nowrap;
        transition: border-color 150ms ease, background 150ms ease, color 150ms ease;
      }
      .tool:hover { border-color: var(--color-text); }
      .tool.active { background: var(--color-text); border-color: var(--color-text); color: #fff; }
      .filters-btn .count {
        display: grid; place-items: center; min-width: 18px; height: 18px; padding: 0 5px; border-radius: 999px;
        background: var(--color-accent); color: #fff; font-size: 11px; font-weight: 700;
      }
      .select { padding-right: 34px; }
      .select select {
        appearance: none; -webkit-appearance: none; border: 0; background: transparent; font: inherit; color: inherit;
        cursor: pointer; outline: none; padding: 0;
      }
      .select ui-icon { position: absolute; right: 12px; pointer-events: none; color: var(--color-muted); }
      .sort { margin-left: auto; }
      .sort span { color: var(--color-muted); }
      .clear { border: 0; background: none; color: var(--color-accent); font-size: 13.5px; font-weight: 600; cursor: pointer; padding: 0 6px; }

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
        .sort { margin-left: 0; }
      }
      @media (max-width: 370px) { .product-grid { grid-template-columns: 1fr !important; } }
    `,
  ],
})
export class ProductsComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly catalog = inject(CatalogService);

  protected readonly categories = this.catalog.categories;
  protected readonly sorts = SORTS;

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
  protected readonly subcategory = computed(() => this.params().get('subcategory'));
  protected readonly subcategories = computed(() => {
    const slug = this.category();
    return slug ? this.catalog.category(slug)?.subcategories ?? [] : [];
  });
  protected readonly priceBands = [
    { value: 'under-5', label: 'Under $5' },
    { value: '5-10', label: '$5 – $10' },
    { value: '10-20', label: '$10 – $20' },
    { value: 'over-20', label: 'Over $20' },
  ];
  protected readonly ratings = [4.5, 4, 3.5];

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

  protected readonly results = computed(() =>
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
      return this.catalog.category(categorySlug)?.name ?? 'Products';
    }
    const collection = this.collection();
    if (collection) {
      return collection
        .split('-')
        .map((word) => word[0].toUpperCase() + word.slice(1))
        .join(' ');
    }
    if (this.onSaleOnly()) {
      return 'On Sale';
    }
    return this.search() ? 'Search results' : 'All products';
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

  protected setSort(event: Event): void {
    this.merge({ sort: (event.target as HTMLSelectElement).value });
  }

  protected setPriceBand(event: Event): void {
    this.merge({ price: (event.target as HTMLSelectElement).value || null, min: null, max: null });
  }

  protected setRating(event: Event): void {
    this.merge({ rating: (event.target as HTMLSelectElement).value || null });
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
}
