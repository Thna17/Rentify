import {
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CatalogService } from '../../../../core/catalog/catalog.service';
import { SearchHistoryService } from '../../../../core/search/search-history.service';
import { IconComponent } from '../../../shared/ui/icon/icon.component';

/** Curated, not computed — these are the terms worth steering people toward. */
const POPULAR_SEARCHES = [
  'palm sugar',
  'silk scarf',
  'jasmine rice',
  'pottery',
  'kampot pepper',
  'bamboo basket',
  'dried mango',
];

/**
 * Full-screen search panel.
 *
 * Opens over the page with the content behind it blurred, which keeps the
 * storefront visible as context while making it unmistakably inactive.
 *
 * Empty state shows recent searches, popular terms and every category — the
 * three things a shopper who has not decided yet can act on. Once they type,
 * it switches to live product matches so the panel is never a dead end.
 */
@Component({
  selector: 'app-search-overlay',
  imports: [FormsModule, IconComponent],
  template: `
    <div
      class="scrim"
      role="dialog"
      aria-modal="true"
      aria-label="Search Rentify Marketplace"
      animate.leave="scrim-leave"
      (click)="close.emit()"
    >
      <!-- Clicks inside the panel must not reach the scrim's close handler. -->
      <div class="panel" animate.leave="panel-leave" (click)="$event.stopPropagation()">
        <form class="search-row" (ngSubmit)="submit()">
          <ui-icon name="search" [size]="19" />
          <input
            #field
            type="search"
            name="q"
            [(ngModel)]="term"
            placeholder="Search products, stores and categories…"
            aria-label="Search products"
            autocomplete="off"
          />
          @if (term()) {
            <button
              type="button"
              class="clear"
              (click)="term.set('')"
              aria-label="Clear search"
            >
              <ui-icon name="x" [size]="15" />
            </button>
          }
          <button type="button" class="dismiss" (click)="close.emit()" aria-label="Close search">
            <ui-icon name="x" [size]="16" class="dismiss-icon" />
            <span class="dismiss-text">Esc</span>
          </button>
        </form>

        <div class="body">
          @if (catalog.productError()) {
            <div class="search-error" role="alert">
              <ui-icon name="alert-circle" [size]="18" />
              <span>{{ catalog.productError() }}</span>
              <button type="button" (click)="catalog.load()">Try again</button>
            </div>
          } @else if (term().trim()) {
            <!-- Typing: live matches, so the panel is never a dead end. -->
            <section>
              <h3>
                Products
                <span class="count">{{ matches().length }}</span>
              </h3>
              @if (matches().length) {
                <ul class="results">
                  @for (product of matches(); track product.id) {
                    <li>
                      <button type="button" (click)="openProduct(product.id)">
                        <span class="thumb img-placeholder"></span>
                        <span class="result-main">
                          <span class="result-name">{{ product.name }}</span>
                          <span class="result-meta"
                            >{{ product.categoryName }} ·
                            {{ product.sellerName }}</span
                          >
                        </span>
                        <span class="result-price"
                          >\${{ product.price.toFixed(2) }}</span
                        >
                      </button>
                    </li>
                  }
                </ul>
                <button type="button" class="see-all" (click)="submit()">
                  See all results for “{{ term().trim() }}”
                  <ui-icon name="arrow-right" [size]="13" />
                </button>
              } @else {
                <p class="none">
                  Nothing matches “{{ term().trim() }}”. Try a category below.
                </p>
              }
            </section>
          } @else {
            @if (history.recent().length) {
              <section>
                <h3>
                  Recent searches
                  <button type="button" class="link" (click)="history.clear()">
                    Clear
                  </button>
                </h3>
                <div class="chips">
                  @for (entry of history.recent(); track entry) {
                    <span class="chip recent">
                      <button type="button" (click)="run(entry)">
                        <ui-icon name="clock" [size]="12" /> {{ entry }}
                      </button>
                      <button
                        type="button"
                        class="chip-x"
                        (click)="history.remove(entry)"
                        [attr.aria-label]="'Remove ' + entry"
                      >
                        <ui-icon name="x" [size]="11" />
                      </button>
                    </span>
                  }
                </div>
              </section>
            }

            <section>
              <h3>Popular searches</h3>
              <div class="chips">
                @for (entry of popular; track entry) {
                  <button type="button" class="chip" (click)="run(entry)">
                    <ui-icon name="trending-up" [size]="12" /> {{ entry }}
                  </button>
                }
              </div>
            </section>

            <section>
              <h3>All categories</h3>
              <div class="category-grid">
                @for (category of categories; track category.slug) {
                  <button
                    type="button"
                    class="category"
                    (click)="openCategory(category.slug)"
                  >
                    <span class="cat-icon">
                      <ui-icon [name]="category.icon" [size]="17" />
                    </span>
                    <span class="cat-main">
                      <span class="cat-name">{{ category.name }}</span>
                      <span class="cat-count"
                        >{{ catalog.countByCategory(category.slug) }}
                        products</span
                      >
                    </span>
                  </button>
                }
              </div>
            </section>
          }
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .scrim {
        position: fixed;
        inset: 0;
        z-index: 200;
        display: flex;
        justify-content: center;
        padding: 8vh 20px 20px;
        background: rgba(24, 20, 18, 0.35);
        /* The blur is the point: the storefront stays visible as context but
           is unmistakably not the thing you are interacting with. */
        backdrop-filter: blur(10px) saturate(1.1);
        -webkit-backdrop-filter: blur(10px) saturate(1.1);
        animation: fade 140ms var(--ease-out);
      }
      @keyframes fade {
        from {
          opacity: 0;
        }
      }
      .scrim-leave {
        animation: fade-out 160ms var(--ease-standard) both;
      }
      @keyframes fade-out {
        to {
          opacity: 0;
        }
      }
      .panel {
        width: min(100%, 680px);
        max-height: 82vh;
        display: flex;
        flex-direction: column;
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-lg);
        overflow: hidden;
        animation: rise 180ms var(--ease-out);
      }
      @keyframes rise {
        from {
          transform: translateY(-8px);
          opacity: 0;
        }
      }
      .panel-leave {
        animation: sink 160ms var(--ease-standard) both;
      }
      @keyframes sink {
        to {
          transform: translateY(-8px);
          opacity: 0;
        }
      }

      .search-row {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px 18px;
        border-bottom: 1px solid var(--color-border);
        color: var(--color-muted);
      }
      .search-row input {
        flex: 1;
        border: 0;
        outline: none;
        background: transparent;
        font-size: 16px;
        color: var(--color-text);
      }
      .search-row input:focus {
        box-shadow: none !important;
        border-color: transparent !important;
      }
      .clear {
        display: grid;
        place-items: center;
        width: 24px;
        height: 24px;
        border: 0;
        border-radius: 50%;
        background: var(--color-bg-alt);
        color: var(--color-muted);
      }
      .clear:hover {
        background: var(--color-bg-hover);
        color: var(--color-text);
      }
      .dismiss {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 4px 8px;
        border: 1px solid var(--color-border-strong);
        border-radius: var(--radius-xs);
        background: transparent;
        color: var(--color-muted);
        font-size: 11px;
        font-weight: 600;
      }
      /* Desktop shows the "Esc" hint (the key actually works there); the icon
         stays hidden so the button doesn't show both. */
      .dismiss-icon {
        display: none;
      }

      .body {
        overflow-y: auto;
        padding: 6px 18px 20px;
      }
      section {
        padding: 14px 0;
      }
      .search-error { align-items: center; background: #fff8ed; border: 1px solid #ead7b7; border-radius: 10px; color: #7b5317; display: flex; font-size: 12px; gap: 8px; margin-top: 14px; padding: 12px; }
      .search-error span { flex: 1; }
      .search-error button { background: transparent; border: 0; color: var(--color-accent); font-size: 12px; font-weight: 700; }
      section + section {
        border-top: 1px solid var(--color-border);
      }
      h3 {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 11.5px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--color-muted);
        margin-bottom: 12px;
      }
      h3 .count {
        color: var(--color-muted-2);
        font-weight: 600;
      }
      .link {
        margin-left: auto;
        border: 0;
        background: none;
        color: var(--color-accent);
        font-size: 11.5px;
        font-weight: 700;
        text-transform: none;
        letter-spacing: 0;
      }
      .link:hover {
        text-decoration: underline;
      }

      .chips {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 7px 13px;
        border: 1px solid var(--color-border-strong);
        border-radius: var(--radius-full);
        background: #fff;
        font-size: 13px;
        color: var(--color-text-secondary);
      }
      .chip:hover {
        border-color: var(--color-accent);
        color: var(--color-accent);
        background: var(--color-accent-soft);
      }
      .chip.recent {
        padding: 0;
        overflow: hidden;
      }
      .chip.recent > button {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 7px 4px 7px 13px;
        border: 0;
        background: none;
        font-size: 13px;
        color: inherit;
      }
      .chip-x {
        display: grid;
        place-items: center;
        padding: 0 10px 0 4px;
        height: 100%;
        border: 0;
        background: none;
        color: var(--color-muted-2);
      }
      .chip-x:hover {
        color: var(--color-danger);
      }

      .results {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        gap: 2px;
      }
      .results button {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 9px 10px;
        border: 0;
        border-radius: var(--radius-sm);
        background: none;
        text-align: left;
      }
      .results button:hover {
        background: var(--color-bg-alt);
      }
      .thumb {
        width: 42px;
        height: 42px;
        border-radius: var(--radius-xs);
        flex-shrink: 0;
      }
      .result-main {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-width: 0;
      }
      .result-name {
        font-size: 14px;
        font-weight: 600;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .result-meta {
        color: var(--color-muted);
        font-size: 12px;
      }
      .result-price {
        font-weight: 700;
        font-size: 14px;
      }
      .see-all {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        margin-top: 10px;
        padding: 0 10px;
        border: 0;
        background: none;
        color: var(--color-accent);
        font-size: 13px;
        font-weight: 600;
      }
      .see-all:hover {
        text-decoration: underline;
      }
      .none {
        color: var(--color-muted);
        font-size: 13.5px;
        padding: 0 10px;
      }

      .category-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
        gap: 8px;
      }
      .category {
        display: flex;
        align-items: center;
        gap: 11px;
        padding: 10px 12px;
        border: 1px solid var(--color-border);
        border-radius: var(--radius-sm);
        background: #fff;
        text-align: left;
      }
      .category:hover {
        border-color: var(--color-accent);
        background: var(--color-accent-soft);
      }
      .cat-icon {
        display: grid;
        place-items: center;
        width: 32px;
        height: 32px;
        border-radius: var(--radius-xs);
        background: var(--color-bg-alt);
        color: var(--color-accent);
        flex-shrink: 0;
      }
      .cat-main {
        display: flex;
        flex-direction: column;
      }
      .cat-name {
        font-size: 13.5px;
        font-weight: 600;
      }
      .cat-count {
        color: var(--color-muted);
        font-size: 11.5px;
      }

      @media (max-width: 620px) {
        .scrim {
          padding: 0;
        }
        .panel {
          width: 100%;
          max-height: 100vh;
          height: 100%;
          border-radius: 0;
          border: 0;
        }
        .category-grid {
          grid-template-columns: 1fr;
        }
        /* There is no Escape key on mobile and the full-screen panel leaves no
           scrim to tap — this icon button is the only way out, so it must
           stay visible and be a real tap target, not the desktop text hint. */
        .dismiss {
          padding: 8px;
          border: 0;
          border-radius: 50%;
          width: 36px;
          height: 36px;
          justify-content: center;
          flex-shrink: 0;
        }
        .dismiss-icon {
          display: block;
        }
        .dismiss-text {
          display: none;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .scrim,
        .panel,
        .scrim-leave,
        .panel-leave {
          animation: none;
        }
      }
    `,
  ],
  host: {
    '(document:keydown.escape)': 'close.emit()',
  },
})
export class SearchOverlayComponent {
  /** Emitted whenever the panel should be dismissed. */
  readonly close = output<void>();

  protected readonly catalog = inject(CatalogService);
  protected readonly history = inject(SearchHistoryService);
  private readonly router = inject(Router);

  private readonly field =
    viewChild.required<ElementRef<HTMLInputElement>>('field');

  protected readonly term = signal('');
  protected readonly popular = POPULAR_SEARCHES;
  protected readonly categories = this.catalog.categories;

  /** Live matches, capped — this is a preview, not the results page. */
  protected readonly matches = computed(() => {
    const needle = this.term().trim();
    return needle ? this.catalog.search({ search: needle }).slice(0, 6) : [];
  });

  constructor() {
    // Focus once the panel is in the DOM, so typing works immediately.
    effect(() => this.field().nativeElement.focus());
  }

  protected submit(): void {
    this.run(this.term());
  }

  protected run(term: string): void {
    const cleaned = term.trim();
    if (!cleaned) {
      return;
    }
    this.history.record(cleaned);
    void this.router.navigate(['/products'], {
      queryParams: { search: cleaned },
    });
    this.close.emit();
  }

  protected openProduct(id: string): void {
    // Record the term too: they searched, then acted on it.
    this.history.record(this.term());
    void this.router.navigate(['/product', id]);
    this.close.emit();
  }

  protected openCategory(slug: string): void {
    void this.router.navigate(['/products'], { queryParams: { category: slug } });
    this.close.emit();
  }
}
