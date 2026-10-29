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
import { SearchTelemetryService } from '../../../../core/telemetry/search-telemetry.service';
import { RentifyMarketplaceService } from '../../../../core/rentify/rentify-marketplace.service';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
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

const MAX_PRODUCTS = 6;
const MAX_STORES = 4;

/** One selectable row in the live results, in on-screen order. */
type ResultItem = { kind: 'product' | 'store'; id: string };

/**
 * Full-screen search panel.
 *
 * Opens over the page with the content behind it blurred, which keeps the
 * storefront visible as context while making it unmistakably inactive.
 *
 * Before typing it offers recent searches, popular terms and every category.
 * While typing it previews matching products first and matching stores
 * underneath; arrow keys move through both lists and Enter opens the
 * highlighted row (or runs the full search when nothing is highlighted).
 */
@Component({
  selector: 'app-search-overlay',
  imports: [FormsModule, IconComponent, TranslatePipe],
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
        <form class="head" (ngSubmit)="submit()">
          <label class="search-field">
            <ui-icon class="field-icon" name="search" [size]="18" />
            <input
              #field
              type="search"
              name="q"
              enterkeyhint="search"
              [(ngModel)]="term"
              (ngModelChange)="active.set(-1)"
              (keydown)="onKeydown($event)"
              [placeholder]="'nav.searchPlaceholder' | translate"
              [attr.aria-label]="'nav.search' | translate"
              [attr.aria-activedescendant]="active() >= 0 ? 'search-opt-' + active() : null"
              autocomplete="off"
            />
            @if (term()) {
              <button type="button" class="clear" (click)="clearTerm()" aria-label="Clear search">
                <ui-icon name="x" [size]="12" />
              </button>
            }
          </label>
          <button type="button" class="dismiss" (click)="close.emit()" aria-label="Close search">
            <kbd class="dismiss-key">Esc</kbd>
            <span class="dismiss-cancel">{{ 'search.cancel' | translate }}</span>
          </button>
        </form>

        <div class="body" #body>
          @if (catalog.productError()) {
            <!-- A failed product load only blocks product matches; stores,
                 recent, popular and categories still work, so they stay. -->
            <div class="notice" role="alert">
              <ui-icon name="alert-circle" [size]="16" />
              <span>{{ catalog.productError() }}</span>
              <button type="button" (click)="catalog.load()">{{ 'state.tryAgain' | translate }}</button>
            </div>
          }

          @if (query()) {
            @if (loading()) {
              <section aria-busy="true" [attr.aria-label]="'search.loading' | translate">
                <h3>{{ 'nav.products' | translate }}</h3>
                @for (n of skeletonRows; track n) {
                  <div class="row skeleton-row">
                    <span class="thumb skeleton"></span>
                    <span class="row-main">
                      <span class="skeleton line"></span>
                      <span class="skeleton line short"></span>
                    </span>
                  </div>
                }
              </section>
            } @else if (!products().length && !stores().length) {
              <div class="empty">
                <span class="empty-icon"><ui-icon name="search" [size]="20" /></span>
                <strong>{{ 'search.nothingFound' | translate:{ term: query() } }}</strong>
                <p>{{ 'search.nothingFoundHint' | translate }}</p>
                <button type="button" class="ghost-btn" (click)="clearTerm()">
                  {{ 'search.browseCategories' | translate }}
                </button>
              </div>
            } @else {
              <!-- Products first (what most people search for), stores underneath. -->
              @if (!catalog.productError()) {
                <section>
                  <h3>
                    <span>{{ 'nav.products' | translate }}</span>
                    <span class="count">{{ products().length }}</span>
                    @if (products().length) {
                      <button type="button" class="head-link" (click)="submit()">
                        {{ 'search.seeAll' | translate:{ term: query() } }}
                      </button>
                    }
                  </h3>
                  @if (products().length) {
                    <ul class="list" role="listbox">
                      @for (product of products(); track product.id; let i = $index) {
                        <li>
                          <button
                            type="button"
                            class="row"
                            role="option"
                            [id]="'search-opt-' + i"
                            [attr.data-index]="i"
                            [class.active]="active() === i"
                            [attr.aria-selected]="active() === i"
                            (mouseenter)="active.set(i)"
                            (click)="openProduct(product.id)"
                          >
                            @if (product.image) {
                              <img class="thumb" [src]="product.image" alt="" loading="lazy" />
                            } @else {
                              <span class="thumb img-placeholder"></span>
                            }
                            <span class="row-main">
                              <span class="row-title">
                                @for (part of highlight(product.name); track $index) {
                                  @if (part.hit) { <mark>{{ part.text }}</mark> } @else { {{ part.text }} }
                                }
                              </span>
                              <span class="row-meta">{{ product.categoryName }} · {{ product.sellerName }}</span>
                            </span>
                            <span class="price">\${{ product.price.toFixed(2) }}</span>
                          </button>
                        </li>
                      }
                    </ul>
                  } @else {
                    <p class="none">{{ 'search.noProductMatches' | translate:{ term: query() } }}</p>
                  }
                </section>
              }

              <section>
                <h3>
                  <span>{{ 'search.stores' | translate }}</span>
                  <span class="count">{{ stores().length }}</span>
                  <button type="button" class="head-link" (click)="openStores()">
                    {{ 'search.allStores' | translate }}
                  </button>
                </h3>
                @if (stores().length) {
                  <ul class="list stores" role="listbox">
                    @for (store of stores(); track store.id; let i = $index) {
                      @let index = products().length + i;
                      <li>
                        <button
                          type="button"
                          class="row store-row"
                          role="option"
                          [id]="'search-opt-' + index"
                          [attr.data-index]="index"
                          [class.active]="active() === index"
                          [attr.aria-selected]="active() === index"
                          (mouseenter)="active.set(index)"
                          (click)="openStore(store.id)"
                        >
                          @if (store.logoUrl) {
                            <img class="avatar" [src]="store.logoUrl" alt="" loading="lazy" />
                          } @else {
                            <span class="avatar initial" aria-hidden="true">{{ store.name.charAt(0) }}</span>
                          }
                          <span class="row-main">
                            <span class="row-title">
                              @for (part of highlight(store.name); track $index) {
                                @if (part.hit) { <mark>{{ part.text }}</mark> } @else { {{ part.text }} }
                              }
                            </span>
                            <span class="row-meta">
                              {{ store.categoryName }}@if (store.location) { · {{ store.location }} }
                            </span>
                          </span>
                          <ui-icon class="go" name="chevron-right" [size]="15" />
                        </button>
                      </li>
                    }
                  </ul>
                } @else {
                  <p class="none">{{ 'search.noStoreMatches' | translate:{ term: query() } }}</p>
                }
              </section>
            }
          } @else {
            @if (history.recent().length) {
              <section>
                <h3>
                  <span>{{ 'search.recentSearches' | translate }}</span>
                  <button type="button" class="head-link" (click)="history.clear()">
                    {{ 'search.clearHistory' | translate }}
                  </button>
                </h3>
                <div class="chips">
                  @for (entry of history.recent(); track entry) {
                    <span class="chip recent">
                      <button type="button" class="chip-run" (click)="run(entry)">
                        <ui-icon name="clock" [size]="13" /> {{ entry }}
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
              <h3><span>{{ 'search.popularSearches' | translate }}</span></h3>
              <div class="chips">
                @for (entry of popular; track entry) {
                  <button type="button" class="chip" (click)="run(entry)">
                    <ui-icon name="trending-up" [size]="13" /> {{ entry }}
                  </button>
                }
              </div>
            </section>

            <section>
              <h3><span>{{ 'search.allCategories' | translate }}</span></h3>
              <div class="categories">
                @for (category of categories; track category.slug) {
                  <button type="button" class="category" (click)="openCategory(category.slug)">
                    <span class="cat-icon"><ui-icon [name]="category.icon" [size]="17" /></span>
                    <span class="cat-text">
                      <span class="cat-name">{{ category.name }}</span>
                      @if (catalog.loaded() && !catalog.productError()) {
                        <span class="cat-count">{{
                          'category.productCount' | translate:{ count: catalog.countByCategory(category.slug) }
                        }}</span>
                      }
                    </span>
                  </button>
                }
              </div>
            </section>
          }
        </div>

        @if (query() && items().length) {
          <!-- Desktop only: the keys that actually work here. -->
          <footer class="keys" aria-hidden="true">
            <span><kbd>↑</kbd><kbd>↓</kbd> {{ 'search.hintNavigate' | translate }}</span>
            <span><kbd>↵</kbd> {{ 'search.hintOpen' | translate }}</span>
            <span><kbd>Esc</kbd> {{ 'search.hintClose' | translate }}</span>
          </footer>
        }
      </div>
    </div>
  `,
  styles: [
    `
      /* ---------- shell */
      .scrim {
        position: fixed;
        inset: 0;
        z-index: 200;
        display: flex;
        justify-content: center;
        align-items: flex-start;
        padding: 9vh 20px 20px;
        background: rgba(15, 23, 42, 0.32);
        /* The blur is the point: the storefront stays visible as context but
           is unmistakably not the thing you are interacting with. */
        backdrop-filter: blur(10px) saturate(1.1);
        -webkit-backdrop-filter: blur(10px) saturate(1.1);
        animation: fade 140ms var(--ease-out);
      }
      @keyframes fade {
        from { opacity: 0; }
      }
      .scrim-leave {
        animation: fade-out 160ms var(--ease-standard) both;
      }
      @keyframes fade-out {
        to { opacity: 0; }
      }
      .panel {
        width: min(100%, 720px);
        max-height: min(680px, 82vh);
        display: flex;
        flex-direction: column;
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-lg);
        overflow: hidden;
        animation: rise 200ms var(--ease-out);
      }
      @keyframes rise {
        from { transform: translateY(-10px) scale(0.99); opacity: 0; }
      }
      .panel-leave {
        animation: sink 160ms var(--ease-standard) both;
      }
      @keyframes sink {
        to { transform: translateY(-8px); opacity: 0; }
      }
      button {
        min-width: 0;
        min-height: 0;
        font: inherit;
        cursor: pointer;
      }

      /* ---------- header */
      .head {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 14px 16px 14px 20px;
        border-bottom: 1px solid var(--color-border);
      }
      .search-field {
        flex: 1;
        min-width: 0;
        display: flex;
        align-items: center;
        gap: 12px;
        cursor: text;
      }
      .field-icon {
        color: var(--color-muted);
        flex-shrink: 0;
      }
      .search-field input {
        flex: 1;
        min-width: 0;
        height: 32px;
        padding: 0;
        border: 0;
        outline: none;
        background: transparent;
        font-size: 16.5px;
        color: var(--color-text);
      }
      .search-field input::placeholder {
        color: var(--color-muted-2);
      }
      .search-field input:focus,
      .search-field input:focus-visible {
        outline: none !important;
        box-shadow: none !important;
        border-color: transparent !important;
      }
      .search-field input::-webkit-search-cancel-button {
        -webkit-appearance: none;
      }
      .clear {
        display: grid;
        place-items: center;
        width: 22px;
        height: 22px;
        padding: 0;
        flex-shrink: 0;
        border: 0;
        border-radius: 50%;
        background: var(--color-bg-hover);
        color: var(--color-text-secondary);
        transition: background 150ms ease, color 150ms ease;
      }
      .clear:hover {
        background: var(--color-border-strong);
        color: var(--color-text);
      }
      .dismiss {
        flex-shrink: 0;
        padding: 0;
        border: 0;
        background: none;
      }
      .dismiss-cancel {
        display: none;
      }
      kbd {
        display: inline-grid;
        place-items: center;
        min-width: 22px;
        height: 22px;
        padding: 0 6px;
        border: 1px solid var(--color-border-strong);
        border-bottom-width: 2px;
        border-radius: var(--radius-xs);
        background: var(--color-surface);
        color: var(--color-muted);
        font-family: inherit;
        font-size: 11px;
        font-weight: 600;
        line-height: 1;
      }
      .dismiss:hover kbd {
        color: var(--color-text);
        border-color: var(--color-muted-2);
      }

      /* ---------- body + sections */
      .body {
        flex: 1;
        overflow-y: auto;
        overscroll-behavior: contain;
        padding: 6px 10px 12px;
      }
      section {
        padding: 10px 0 6px;
      }
      section + section {
        margin-top: 4px;
        border-top: 1px solid var(--color-border);
      }
      h3 {
        display: flex;
        align-items: baseline;
        gap: 6px;
        margin: 0 0 6px;
        padding: 0 10px;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: var(--color-muted);
      }
      h3 .count {
        font-weight: 600;
        color: var(--color-muted-2);
      }
      .head-link {
        margin-left: auto;
        max-width: 62%;
        padding: 0;
        border: 0;
        background: none;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: var(--color-accent);
        font-size: 12px;
        font-weight: 600;
        letter-spacing: 0;
        text-transform: none;
      }
      .head-link:hover {
        text-decoration: underline;
      }
      .none {
        margin: 2px 0 6px;
        padding: 0 10px;
        font-size: 13px;
        color: var(--color-muted);
      }
      .notice {
        display: flex;
        align-items: center;
        gap: 10px;
        margin: 8px 6px 4px;
        padding: 10px 12px;
        border-radius: var(--radius-md);
        background: var(--color-danger-soft);
        color: var(--color-text-secondary);
        font-size: 12.5px;
        line-height: 1.4;
      }
      .notice ui-icon {
        color: var(--color-danger);
        flex-shrink: 0;
      }
      .notice span {
        flex: 1;
      }
      .notice button {
        padding: 0;
        border: 0;
        background: none;
        color: var(--color-accent);
        font-size: 12.5px;
        font-weight: 700;
      }

      /* ---------- result rows */
      .list {
        display: grid;
        /* minmax(0) so a long name truncates instead of widening the row */
        grid-template-columns: minmax(0, 1fr);
        gap: 2px;
        margin: 0;
        padding: 0;
        list-style: none;
      }
      .list.stores {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .row {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 8px 10px;
        border: 0;
        border-radius: var(--radius-md);
        background: none;
        text-align: left;
        color: var(--color-text);
        transition: background 120ms ease;
      }
      .row.active {
        background: var(--color-bg-alt);
      }
      .thumb {
        width: 44px;
        height: 44px;
        flex-shrink: 0;
        padding: 0;
        border-radius: 10px;
        object-fit: cover;
        background: var(--color-bg-alt);
        box-shadow: inset 0 0 0 1px var(--color-border);
      }
      .avatar {
        width: 40px;
        height: 40px;
        flex-shrink: 0;
        border-radius: 50%;
        object-fit: cover;
        background: var(--color-bg-alt);
        box-shadow: inset 0 0 0 1px var(--color-border);
      }
      .avatar.initial {
        display: grid;
        place-items: center;
        box-shadow: none;
        background: var(--color-accent-soft);
        color: var(--color-accent);
        font-size: 15px;
        font-weight: 700;
        text-transform: uppercase;
      }
      .row-main {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .row-title,
      .row-meta {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .row-title {
        font-size: 14px;
        font-weight: 500;
        color: var(--color-text-secondary);
      }
      /* The typed part reads strongest, the rest steps back. */
      .row-title mark {
        background: none;
        color: var(--color-text);
        font-weight: 700;
      }
      .row-meta {
        font-size: 12px;
        color: var(--color-muted);
      }
      .price {
        flex-shrink: 0;
        font-size: 14px;
        font-weight: 600;
        font-variant-numeric: tabular-nums;
        color: var(--color-text);
      }
      .go {
        flex-shrink: 0;
        color: var(--color-muted-2);
        transition: transform 150ms ease, color 150ms ease;
      }
      .row.active .go {
        color: var(--color-accent);
        transform: translateX(2px);
      }

      /* ---------- loading */
      .skeleton-row {
        pointer-events: none;
      }
      .skeleton {
        display: block;
        border-radius: var(--radius-xs);
        background: linear-gradient(90deg, var(--color-bg-alt) 25%, var(--color-bg-hover) 50%, var(--color-bg-alt) 75%);
        background-size: 200% 100%;
        animation: shimmer 1.2s linear infinite;
      }
      .thumb.skeleton {
        border-radius: 10px;
        box-shadow: none;
      }
      .skeleton.line {
        width: 60%;
        height: 11px;
      }
      .skeleton.line.short {
        width: 35%;
        margin-top: 6px;
      }
      @keyframes shimmer {
        to { background-position: -200% 0; }
      }

      /* ---------- nothing found */
      .empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        padding: 40px 16px 32px;
        text-align: center;
      }
      .empty-icon {
        display: grid;
        place-items: center;
        width: 48px;
        height: 48px;
        margin-bottom: 6px;
        border-radius: 50%;
        background: var(--color-bg-alt);
        color: var(--color-muted);
      }
      .empty strong {
        font-size: 15px;
        color: var(--color-text);
      }
      .empty p {
        max-width: 34ch;
        margin: 0;
        font-size: 13px;
        line-height: 1.5;
        color: var(--color-muted);
      }
      .ghost-btn {
        margin-top: 12px;
        height: 36px;
        padding: 0 16px;
        border: 1px solid var(--color-border-strong);
        border-radius: var(--radius-full);
        background: var(--color-surface);
        color: var(--color-text);
        font-size: 13px;
        font-weight: 600;
        transition: border-color 150ms ease, color 150ms ease;
      }
      .ghost-btn:hover {
        border-color: var(--color-accent);
        color: var(--color-accent);
      }

      /* ---------- chips */
      .chips {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        padding: 2px 10px 6px;
      }
      .chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        height: 32px;
        padding: 0 12px;
        border: 1px solid var(--color-border);
        border-radius: var(--radius-full);
        background: var(--color-surface);
        color: var(--color-text-secondary);
        font-size: 13px;
        transition: border-color 150ms ease, color 150ms ease, background 150ms ease;
      }
      .chip ui-icon {
        color: var(--color-muted-2);
      }
      .chip:hover {
        border-color: var(--color-accent);
        background: var(--color-accent-soft);
        color: var(--color-accent);
      }
      .chip:hover ui-icon {
        color: inherit;
      }
      .chip.recent {
        padding: 0;
        overflow: hidden;
      }
      .chip-run {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        height: 100%;
        padding: 0 4px 0 12px;
        border: 0;
        background: none;
        color: inherit;
        font-size: 13px;
      }
      .chip-x {
        display: grid;
        place-items: center;
        height: 100%;
        padding: 0 10px 0 4px;
        border: 0;
        background: none;
        color: var(--color-muted-2);
      }
      .chip-x:hover {
        color: var(--color-danger);
      }

      /* ---------- categories */
      .categories {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 6px;
        padding: 2px 4px 4px;
      }
      .category {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 10px;
        border: 0;
        border-radius: var(--radius-md);
        background: none;
        text-align: left;
        transition: background 120ms ease;
      }
      .category:hover {
        background: var(--color-bg-alt);
      }
      .cat-icon {
        display: grid;
        place-items: center;
        width: 36px;
        height: 36px;
        flex-shrink: 0;
        border-radius: 10px;
        background: var(--color-accent-soft);
        color: var(--color-accent);
      }
      .cat-text {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 1px;
      }
      .cat-name {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 13px;
        font-weight: 600;
        color: var(--color-text);
      }
      .cat-count {
        font-size: 11.5px;
        color: var(--color-muted);
      }

      /* ---------- keyboard footer */
      .keys {
        display: flex;
        align-items: center;
        gap: 18px;
        padding: 10px 20px;
        border-top: 1px solid var(--color-border);
        background: var(--color-bg-alt);
        font-size: 11.5px;
        color: var(--color-muted);
      }
      .keys span {
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }
      .keys kbd {
        min-width: 20px;
        height: 20px;
        padding: 0 5px;
        font-size: 10.5px;
      }

      /* ---------- tablet */
      @media (max-width: 760px) {
        .categories {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }

      /* ---------- phone: full-screen search screen */
      @media (max-width: 620px) {
        .scrim {
          padding: 0;
          background: var(--color-surface);
          backdrop-filter: none;
          -webkit-backdrop-filter: none;
        }
        .panel {
          width: 100%;
          height: 100dvh;
          max-height: 100dvh;
          border: 0;
          border-radius: 0;
          box-shadow: none;
          animation: none;
        }
        .head {
          gap: 10px;
          padding: 10px 12px 10px 14px;
          padding-top: calc(10px + env(safe-area-inset-top));
        }
        .search-field {
          gap: 8px;
          height: 40px;
          padding: 0 8px 0 12px;
          border: 1px solid transparent;
          border-radius: var(--radius-full);
          background: var(--color-bg-alt);
          transition: border-color 150ms ease, background 150ms ease, box-shadow 150ms ease;
        }
        .search-field:focus-within {
          border-color: var(--color-accent);
          background: var(--color-surface);
          box-shadow: var(--shadow-focus);
        }
        .search-field input {
          font-size: 16px; /* below 16px iOS zooms the page on focus */
        }
        .search-field input::placeholder {
          font-size: 14px;
        }
        /* No Escape key on phones, so the way out is a plain "Cancel" link. */
        .dismiss {
          height: 40px;
          padding: 0 4px;
          color: var(--color-accent);
          font-size: 14px;
          font-weight: 600;
        }
        .dismiss-key {
          display: none;
        }
        .dismiss-cancel {
          display: inline;
        }
        .body {
          padding: 4px 6px calc(24px + env(safe-area-inset-bottom));
        }
        .list.stores {
          grid-template-columns: minmax(0, 1fr);
        }
        .row {
          padding: 8px;
        }
        .row.active {
          background: none;
        }
        .row:active {
          background: var(--color-bg-alt);
        }
        .thumb {
          width: 48px;
          height: 48px;
        }
        .row-title {
          font-size: 14px;
        }
        .chips {
          gap: 6px;
        }
        .categories {
          gap: 8px;
          padding: 2px 10px 6px;
        }
        .category {
          flex-direction: column;
          align-items: flex-start;
          gap: 10px;
          padding: 12px;
          border: 1px solid var(--color-border);
        }
        .category:active {
          background: var(--color-bg-alt);
        }
        .keys {
          display: none;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .scrim,
        .panel,
        .scrim-leave,
        .panel-leave,
        .skeleton {
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
  private readonly telemetry = inject(SearchTelemetryService);
  private readonly rentify = inject(RentifyMarketplaceService);
  private readonly router = inject(Router);

  private readonly field = viewChild.required<ElementRef<HTMLInputElement>>('field');
  private readonly body = viewChild.required<ElementRef<HTMLElement>>('body');

  protected readonly term = signal('');
  protected readonly query = computed(() => this.term().trim());
  protected readonly popular = POPULAR_SEARCHES;
  protected readonly categories = this.catalog.categories;
  protected readonly skeletonRows = [0, 1, 2];

  /** Index into items() of the keyboard/hover highlighted row; -1 is none. */
  protected readonly active = signal(-1);

  /** Products are still on their way, so a "no matches" answer would be a lie. */
  protected readonly loading = computed(
    () => !this.catalog.loaded() && !this.catalog.productError(),
  );

  /** Live product matches, capped — this is a preview, not the results page. */
  protected readonly products = computed(() => {
    const needle = this.query();
    if (!needle || this.catalog.productError()) {
      return [];
    }
    return this.catalog.search({ search: needle }).slice(0, MAX_PRODUCTS);
  });

  /** Stores whose name, category or location contains the term. */
  protected readonly stores = computed(() => {
    const needle = this.query().toLowerCase();
    if (!needle) {
      return [];
    }
    return this.catalog.stores
      .filter((store) =>
        [store.name, store.categoryName, store.location].some((value) =>
          value?.toLowerCase().includes(needle),
        ),
      )
      .slice(0, MAX_STORES);
  });

  /** Every selectable row, in the order they appear on screen. */
  protected readonly items = computed<ResultItem[]>(() => [
    ...this.products().map((p) => ({ kind: 'product' as const, id: p.id })),
    ...this.stores().map((s) => ({ kind: 'store' as const, id: s.id })),
  ]);

  constructor() {
    // Focus once the panel is in the DOM, so typing works immediately.
    effect(() => this.field().nativeElement.focus());
  }

  /** Splits text around the typed term so the match can be emphasised. */
  protected highlight(text: string): { text: string; hit: boolean }[] {
    const needle = this.query();
    const at = needle ? text.toLowerCase().indexOf(needle.toLowerCase()) : -1;
    if (at < 0) {
      return [{ text, hit: false }];
    }
    return [
      { text: text.slice(0, at), hit: false },
      { text: text.slice(at, at + needle.length), hit: true },
      { text: text.slice(at + needle.length), hit: false },
    ].filter((part) => part.text);
  }

  protected onKeydown(event: KeyboardEvent): void {
    const count = this.items().length;
    if (!count || (event.key !== 'ArrowDown' && event.key !== 'ArrowUp')) {
      return;
    }
    event.preventDefault();
    const step = event.key === 'ArrowDown' ? 1 : -1;
    const next = Math.min(count - 1, Math.max(-1, this.active() + step));
    this.active.set(next);
    this.body()
      .nativeElement.querySelector(`[data-index="${next}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }

  protected clearTerm(): void {
    this.term.set('');
    this.active.set(-1);
    this.field().nativeElement.focus();
  }

  /** Enter: open the highlighted row, otherwise run the full search. */
  protected submit(): void {
    const item = this.items()[this.active()];
    if (item) {
      if (item.kind === 'product') {
        this.openProduct(item.id);
      } else {
        this.openStore(item.id);
      }
      return;
    }
    this.run(this.term());
  }

  protected run(term: string): void {
    const cleaned = term.trim();
    if (!cleaned) {
      return;
    }
    const metric = this.telemetry.recordSearch({
      queryLength: cleaned.length,
      filterCount: 0,
      durationMs: 1.0,
      resultCount: this.products().length,
    });
    this.rentify.recordAnalyticsEvent({
      eventName: 'marketplace.search_performed', occurredAt: new Date(metric.timestamp).toISOString(),
      properties: { channel: 'marketplace', locale: document.documentElement.lang === 'km' ? 'km' : 'en', hasResults: metric.hasResults },
      measures: { queryLength: metric.queryLength, filterCount: metric.filterCount,
        resultCount: metric.resultCount, durationMs: metric.durationMs },
    });
    this.history.record(cleaned);
    void this.router.navigate(['/products'], {
      queryParams: { search: cleaned },
    });
    this.close.emit();
  }

  protected openProduct(id: string): void {
    // Record the term too: they searched, then acted on it.
    this.history.record(this.term());
    const metric = this.telemetry.recordSearch({
      queryLength: this.query().length,
      filterCount: 0,
      durationMs: 1.0,
      resultCount: 1,
    });
    this.rentify.recordAnalyticsEvent({
      eventName: 'marketplace.search_performed', occurredAt: new Date(metric.timestamp).toISOString(),
      properties: { channel: 'marketplace', locale: document.documentElement.lang === 'km' ? 'km' : 'en', hasResults: true },
      measures: { queryLength: metric.queryLength, filterCount: metric.filterCount,
        resultCount: metric.resultCount, durationMs: metric.durationMs },
    });
    void this.router.navigate(['/product', id]);
    this.close.emit();
  }

  protected openStore(id: string): void {
    this.history.record(this.term());
    void this.router.navigate(['/stores', id]);
    this.close.emit();
  }

  protected openStores(): void {
    void this.router.navigate(['/stores']);
    this.close.emit();
  }

  protected openCategory(slug: string): void {
    void this.router.navigate(['/products'], { queryParams: { category: slug } });
    this.close.emit();
  }
}
