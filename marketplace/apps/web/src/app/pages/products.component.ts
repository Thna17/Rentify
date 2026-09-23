import { Component, computed, inject } from '@angular/core';
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
  imports: [
    RouterLink,
    NavbarComponent,
    FooterComponent,
    IconComponent,
    ProductCardComponent,
  ],
  template: `
    <app-navbar />

    <header class="products-intro">
      <div class="container products-intro-inner">
        <nav class="crumbs">
          <a routerLink="/">Home</a> <span>›</span> <span>Products</span>
        </nav>

        <div class="intro-row">
          <div>
            <span class="products-label">Shop products</span>
            <h1>{{ heading() }}</h1>
          </div>
          <span class="products-total">
            {{ results().length }}
            {{ results().length === 1 ? 'product' : 'products' }}
            @if (search()) {
              <span>for “{{ search() }}”</span>
            }
          </span>
        </div>
      </div>
    </header>

    <section class="container filters-bar">
      <!-- Category chips: the spec's primary filter affordance. The fade
           wrapper hints there's more to scroll on narrow screens, where the
           scrollbar itself is hidden. -->
      <div class="scroll-fade">
        <div class="chips">
          <button
            class="chip"
            [class.active]="!category()"
            (click)="setCategory(null)"
          >
            All
          </button>
          @for (cat of categories; track cat.slug) {
            <button
              class="chip"
              [class.active]="category() === cat.slug"
              (click)="setCategory(cat.slug)"
            >
              {{ cat.name }}
            </button>
          }
        </div>
      </div>

      <div class="filters-row">
        <div class="scroll-fade">
          <div class="quick-filters" aria-label="Product filters">
            <label>
              <span>Price</span>
              <select [value]="priceBand()" (change)="setPriceBand($event)">
                <option value="">Any price</option>
                <option value="under-5">Under $5</option>
                <option value="5-10">$5–$10</option>
                <option value="10-20">$10–$20</option>
                <option value="over-20">Over $20</option>
              </select>
            </label>
            <label>
              <span>Rating</span>
              <select [value]="minRating() ?? ''" (change)="setRating($event)">
                <option value="">Any rating</option>
                <option value="4.5">4.5 & up</option>
                <option value="4">4.0 & up</option>
              </select>
            </label>
            <button type="button" class="toggle-filter" [class.active]="inStockOnly()" (click)="toggleInStock()">
              <ui-icon name="check" [size]="12" /> In stock
            </button>
            <button type="button" class="toggle-filter" [class.active]="onSaleOnly()" (click)="toggleSale()">
              <ui-icon name="percent" [size]="12" /> On sale
            </button>
          </div>
        </div>

        <!-- Deliberately outside the scrollable row above — it must never be
             something a user has to discover by scrolling sideways. -->
        @if (hasFilters()) {
          <button class="clear" (click)="clearAll()">
            <ui-icon name="x" [size]="13" /> Clear filters
          </button>
        }

        <label class="sort">
          <span>Sort</span>
          <select [value]="sort()" (change)="setSort($event)">
            @for (option of sorts; track option.value) {
              <option [value]="option.value">{{ option.label }}</option>
            }
          </select>
        </label>
      </div>
    </section>

    <section class="container grid-section">
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
  protected readonly priceRange = computed(() => {
    switch (this.priceBand()) {
      case 'under-5': return { priceMax: 5 };
      case '5-10': return { priceMin: 5, priceMax: 10 };
      case '10-20': return { priceMin: 10, priceMax: 20 };
      case 'over-20': return { priceMin: 20 };
      default: return {};
    }
  });
  protected readonly hasFilters = computed(() => Boolean(
    this.search() || this.category() || this.collection() || this.onSaleOnly() ||
    this.inStockOnly() || this.minRating() || this.priceBand(),
  ));

  protected readonly results = computed(() =>
    this.catalog.search({
      search: this.search(),
      category: this.category() ?? undefined,
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
    this.merge({ category: slug });
  }

  protected setSort(event: Event): void {
    this.merge({ sort: (event.target as HTMLSelectElement).value });
  }

  protected setPriceBand(event: Event): void {
    this.merge({ price: (event.target as HTMLSelectElement).value || null });
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
