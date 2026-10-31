import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, effect, HostListener, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CatalogService } from '../core/catalog/catalog.service';
import { isCuratedStore, Store } from '../core/catalog/catalog.models';
import { NavbarComponent } from '../components/shared/layout/navbar/navbar.component';
import { FooterComponent } from '../components/shared/layout/footer/footer.component';
import { IconComponent } from '../components/shared/ui/icon/icon.component';
import { TranslatePipe } from '../core/i18n/translate.pipe';

type SortKey = 'popular' | 'rating' | 'products' | 'name';
type SizeKey = '' | 'small' | 'medium' | 'large';

interface StoreRow {
  store: Store;
  cover: string | null;
  productCount: number;
}

const PAGE_SIZE = 12;

const SIZE_BUCKETS: { key: Exclude<SizeKey, ''>; label: string; test: (n: number) => boolean }[] = [
  { key: 'small', label: '1–10', test: (n) => n >= 1 && n <= 10 },
  { key: 'medium', label: '11–50', test: (n) => n >= 11 && n <= 50 },
  { key: 'large', label: '51+', test: (n) => n >= 51 },
];

@Component({
  selector: 'app-stores',
  imports: [TranslatePipe, FormsModule, RouterLink, NgTemplateOutlet, NavbarComponent, FooterComponent, IconComponent],
  template: `
    <app-navbar />

    <main class="stores-page">
      <div class="container chips-wrap">
        <div class="chips" role="tablist" [attr.aria-label]="'stores.storeCategories' | translate">
          <button type="button" class="chip" role="tab" [class.on]="!category()" [attr.aria-selected]="!category()" (click)="setCategory('')">
            <ui-icon name="grid" [size]="15" /> {{ 'homeHero.allCategories' | translate }}
          </button>
          @for (name of categoryNames(); track name) {
            <button type="button" class="chip" role="tab" [class.on]="category() === name" [attr.aria-selected]="category() === name" (click)="setCategory(name)">
              <ui-icon name="tag" [size]="15" /> {{ name }}
            </button>
          }
        </div>
      </div>

      <section class="container head">
        <div class="head-copy">
          <nav class="crumbs" [attr.aria-label]="'common.breadcrumb' | translate">
            <a routerLink="/">{{ 'nav.home' | translate }}</a><ui-icon name="chevron-right" [size]="12" /><span>{{ 'nav.stores' | translate }}</span>
          </nav>
          <h1>{{ 'stores.allStores' | translate }}</h1>
        </div>

        <div class="hero" [attr.aria-label]="'stores.supportLocalStores' | translate">
          <div class="hero-copy">
            <h2>{{ 'nav.support' | translate }}<br />{{ 'stores.localStores' | translate }}</h2>
            <p>{{ 'stores.localStoresBody' | translate }}</p>
            <a class="hero-cta" href="#store-directory" (click)="jumpToDirectory($event)">
              {{ 'stores.exploreStores' | translate }} <ui-icon name="arrow-right" [size]="14" />
            </a>
          </div>
          @if (heroImages().length) {
            <div class="hero-mosaic" aria-hidden="true">
              @for (img of heroImages(); track img) {
                <img [src]="img" alt="" loading="lazy" />
              }
            </div>
          }
          <div class="hero-badge">
            <ui-icon name="map-pin" [size]="16" />
            <span><b>{{ 'stores.localBusiness' | translate }}</b>{{ 'stores.strongerCommunities' | translate }}</span>
          </div>
        </div>
      </section>

      <div id="store-directory" class="container layout">
        <aside class="sidebar" [attr.aria-label]="'stores.storeFilters' | translate">
          <ng-container [ngTemplateOutlet]="filterPanel" />
        </aside>

        <section class="results">
          <div class="toolbar">
            <label class="mobile-search">
              <ui-icon name="search" [size]="16" />
              <input type="search" [ngModel]="term()" (ngModelChange)="onTerm($event)" name="mSearch" [placeholder]="'stores.searchStores' | translate" [attr.aria-label]="'stores.searchStores' | translate" />
            </label>
            <div class="toolbar-row">
              <strong class="count">{{ filteredRows().length }} {{ filteredRows().length === 1 ? 'store' : 'stores' }} found</strong>
              <div class="toolbar-actions">
                <button type="button" class="tool-btn filter-btn" (click)="filterOpen.set(true)">
                  <ui-icon name="filter" [size]="15" /> Filter
                  @if (activeFilterCount()) { <span class="dot">{{ activeFilterCount() }}</span> }
                </button>
                <label class="sort">
                  <span class="sort-label">{{ 'catalog.sortBy' | translate }}</span>
                  <select [ngModel]="sort()" (ngModelChange)="onSort($event)" name="sort" [attr.aria-label]="'stores.sortStores' | translate">
                    <option value="popular">{{ 'stores.popular' | translate }}</option>
                    <option value="rating">{{ 'catalog.sortRating' | translate }}</option>
                    <option value="products">{{ 'stores.mostProducts' | translate }}</option>
                    <option value="name">{{ 'stores.nameAZ' | translate }}</option>
                  </select>
                  <ui-icon class="sort-chev" name="chevron-down" [size]="14" />
                </label>
              </div>
            </div>
          </div>

          @if (!catalog.storesLoaded()) {
            <div class="grid" aria-busy="true" aria-live="polite">
              @for (n of skeletons; track n) {
                <div class="card skeleton"><div class="sk-cover"></div><div class="sk-line w60"></div><div class="sk-line w40"></div><div class="sk-btn"></div></div>
              }
            </div>
          } @else if (catalog.storeError()) {
            <div class="state" role="alert">
              <ui-icon name="alert-circle" [size]="30" />
              <h2>{{ 'stores.unavailable' | translate }}</h2>
              <p>{{ catalog.storeError() | translate }}</p>
              <button class="btn btn-primary" type="button" (click)="catalog.loadStores()">{{ 'state.tryAgain' | translate }}</button>
            </div>
          } @else if (pageRows().length) {
            <div class="grid">
              @for (row of pageRows(); track row.store.id) {
                <article class="card">
                  <a class="cover" [class.no-img]="!row.cover" [routerLink]="['/stores', row.store.id]" [attr.aria-label]="'Open ' + row.store.name">
                    @if (row.cover) {
                      <img [src]="row.cover" alt="" loading="lazy" />
                    }
                  </a>
                  <div class="body">
                    <div class="id-row">
                      @if (row.store.logoUrl) {
                        <img class="logo" [src]="row.store.logoUrl" [alt]="row.store.name + ' logo'" loading="lazy" />
                      } @else {
                        <span class="logo ph">{{ initials(row.store.name) }}</span>
                      }
                      <h3 class="name"><a [routerLink]="['/stores', row.store.id]">{{ row.store.name }}</a></h3>
                    </div>
                    <div class="meta-row">
                      @if (row.store.reviewCount > 0) {
                        <span class="rate"><ui-icon name="star" [size]="13" [filled]="true" color="var(--color-gold)" /> {{ row.store.rating }} <em>({{ row.store.reviewCount }})</em></span>
                      } @else {
                        <span class="new">{{ 'stores.newStore' | translate }}</span>
                      }
                      <span class="dotsep" aria-hidden="true">•</span>
                      <span class="prod">{{ row.productCount }} {{ row.productCount === 1 ? 'product' : 'products' }}</span>
                    </div>
                    <span class="tag">{{ row.store.categoryName }}</span>
                    <span class="loc"><ui-icon name="map-pin" [size]="13" /> {{ row.store.location }}</span>
                    <a class="view" [routerLink]="['/stores', row.store.id]">{{ 'stores.viewStore' | translate }}</a>
                  </div>
                </article>
              }
            </div>

            @if (totalPages() > 1) {
              <nav class="pager" [attr.aria-label]="'common.pagination' | translate">
                <button type="button" class="pg" [disabled]="page() === 1" (click)="goTo(page() - 1)" [attr.aria-label]="'common.previousPage' | translate"><ui-icon name="chevron-left" [size]="16" /></button>
                @for (p of pageList(); track $index) {
                  @if (p === 0) {
                    <span class="gap">…</span>
                  } @else {
                    <button type="button" class="pg" [class.on]="p === page()" [attr.aria-current]="p === page() ? 'page' : null" (click)="goTo(p)">{{ p }}</button>
                  }
                }
                <button type="button" class="pg" [disabled]="page() === totalPages()" (click)="goTo(page() + 1)" [attr.aria-label]="'common.nextPage' | translate"><ui-icon name="chevron-right" [size]="16" /></button>
              </nav>
            }
          } @else {
            <div class="state">
              <span class="state-ic"><ui-icon name="store" [size]="30" /></span>
              <h2>{{ 'stores.noStoresFound' | translate }}</h2>
              <p>{{ 'stores.noStoresBody' | translate }}</p>
              <button class="btn btn-primary" type="button" (click)="clearFilters()">{{ 'catalog.clearFilters' | translate }}</button>
            </div>
          }
        </section>
      </div>
    </main>

    @if (filterOpen()) {
      <div class="sheet-backdrop" (click)="filterOpen.set(false)"></div>
      <div class="sheet" role="dialog" aria-modal="true" [attr.aria-label]="'catalog.filters' | translate">
        <div class="sheet-grab" aria-hidden="true"></div>
        <div class="sheet-head">
          <h2>{{ 'catalog.filters' | translate }}</h2>
          <button type="button" class="sheet-x" (click)="filterOpen.set(false)" [attr.aria-label]="'common.closeFilters' | translate"><ui-icon name="x" [size]="18" /></button>
        </div>
        <div class="sheet-body">
          <ng-container [ngTemplateOutlet]="filterPanel" [ngTemplateOutletContext]="{ sheet: true }" />
        </div>
        <div class="sheet-foot">
          <button type="button" class="btn btn-outline" (click)="clearFilters()">{{ 'search.clearHistory' | translate }}</button>
          <button type="button" class="btn btn-primary" (click)="filterOpen.set(false)">Show {{ filteredRows().length }} stores</button>
        </div>
      </div>
    }

    <ng-template #filterPanel let-sheet="sheet">
      @if (!sheet) {
        <label class="side-search">
          <ui-icon name="search" [size]="16" />
          <input type="search" [ngModel]="term()" (ngModelChange)="onTerm($event)" name="dSearch" [placeholder]="'stores.searchPlaceholder' | translate" [attr.aria-label]="'stores.searchStores' | translate" />
        </label>
      }

      <fieldset class="group">
        <legend>{{ 'catalog.rating' | translate }}</legend>
        @for (r of ratingOptions; track r) {
          <label class="opt">
            <input type="radio" name="rating{{ sheet ? 'S' : 'D' }}" [checked]="minRating() === r" (click)="toggleRating(r)" />
            <span class="box"></span>
            <ui-icon name="star" [size]="14" [filled]="true" color="var(--color-gold)" />
            <span>{{ r }} &amp; up</span>
          </label>
        }
      </fieldset>

      <fieldset class="group">
        <legend>{{ 'stores.numberOfProducts' | translate }}</legend>
        @for (b of sizeBuckets; track b.key) {
          <label class="opt">
            <input type="radio" name="size{{ sheet ? 'S' : 'D' }}" [checked]="size() === b.key" (click)="toggleSize(b.key)" />
            <span class="box"></span>
            <span>{{ b.label }}</span>
          </label>
        }
      </fieldset>

      @if (!sheet) {
        <button type="button" class="clear" [disabled]="!hasFilters()" (click)="clearFilters()">{{ 'catalog.clearFilters' | translate }}</button>
      }
    </ng-template>

    <app-footer />
  `,
  styles: [
    `
      :host { display: block; }
      .stores-page { padding-bottom: 56px; overflow-x: clip; }
      .container { max-width: var(--container-max, 1280px); margin-inline: auto; }

      /* ---------- header + hero */
      .head { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.05fr); gap: clamp(20px, 3vw, 44px); align-items: stretch; padding-top: 20px; padding-bottom: 22px; }
      .crumbs { display: flex; align-items: center; gap: 6px; font-size: 12.5px; color: var(--color-muted); }
      .crumbs a:hover { color: var(--color-forest); }
      .head h1 { margin: 14px 0 0; font-size: clamp(30px, 4.2vw, 46px); line-height: 1.05; letter-spacing: -.02em; font-weight: 800; }
      .sub { margin: 10px 0 0; max-width: 52ch; font-size: clamp(13.5px, 1.3vw, 15.5px); line-height: 1.6; color: var(--color-text-secondary); }
      .stats { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 20px; }
      .stat { display: flex; align-items: center; gap: 10px; padding: 10px 16px 10px 12px; border-radius: 14px; background: var(--color-surface); border: 1px solid var(--color-border); }
      .stat-icon { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 10px; background: var(--color-success-soft); color: var(--color-forest); }
      .stat strong { display: block; font-size: 17px; line-height: 1.1; }
      .stat small { color: var(--color-muted); font-size: 12px; }

      .hero { position: relative; display: flex; align-items: center; min-height: 208px; overflow: hidden; border-radius: 20px; background: linear-gradient(120deg, #1f3329 0%, #2c4638 55%, #355443 100%); color: #fff; isolation: isolate; }
      .hero-copy { position: relative; z-index: 2; max-width: 46%; padding: clamp(20px, 2.6vw, 34px); }
      .hero-copy h2 { margin: 0; color: #fff; font-size: clamp(24px, 2.8vw, 34px); line-height: 1.1; font-weight: 800; letter-spacing: -.02em; }
      .hero-copy p { margin: 10px 0 0; font-size: 13px; line-height: 1.5; color: rgba(255,255,255,.82); }
      .hero-cta { display: inline-flex; align-items: center; gap: 8px; margin-top: 16px; min-height: 40px; padding: 0 16px; border-radius: 10px; background: #fff; color: var(--color-text); font-size: 13px; font-weight: 600; text-decoration: none; transition: transform 140ms ease; }
      .hero-cta:hover { transform: translateY(-1px); }
      .hero-mosaic { position: absolute; inset: 0 0 0 42%; z-index: 1; display: grid; grid-template-columns: repeat(2, 1fr); grid-auto-rows: 1fr; gap: 3px; -webkit-mask-image: linear-gradient(to right, transparent, #000 38%); mask-image: linear-gradient(to right, transparent, #000 38%); }
      .hero-mosaic img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .hero-badge { position: absolute; z-index: 2; right: 14px; bottom: 14px; display: flex; align-items: center; gap: 9px; padding: 9px 13px; border-radius: 12px; background: rgba(20,30,25,.62); backdrop-filter: blur(6px); font-size: 11.5px; line-height: 1.25; color: rgba(255,255,255,.85); }
      .hero-badge b { display: block; color: #fff; font-weight: 600; }

      /* ---------- featured (mobile / tablet swipe) */
      .featured { display: none; padding-bottom: 6px; }
      .featured-title { margin: 0 0 10px; font-size: 16px; font-weight: 700; }
      .featured-track { display: flex; gap: 12px; overflow-x: auto; padding: 2px 2px 10px; margin-inline: -2px; scroll-snap-type: x mandatory; scrollbar-width: none; -webkit-overflow-scrolling: touch; }
      .featured-track::-webkit-scrollbar { display: none; }
      .featured-card { flex: 0 0 min(72%, 260px); scroll-snap-align: start; overflow: hidden; border-radius: 16px; border: 1px solid var(--color-border); background: var(--color-surface); text-decoration: none; color: inherit; }
      .featured-cover { height: 96px; background: var(--color-bg-alt); }
      .featured-cover.no-img { background: linear-gradient(135deg, var(--color-success-soft), var(--color-bg-alt)); }
      .featured-cover img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .featured-info { display: flex; align-items: center; gap: 10px; padding: 10px 12px 12px; }
      .mini-logo { flex: 0 0 38px; width: 38px; height: 38px; border-radius: 50%; object-fit: cover; border: 2px solid #fff; box-shadow: 0 1px 4px rgba(0,0,0,.14); background: #fff; }
      .mini-logo.ph, .logo.ph { display: grid; place-items: center; background: var(--color-success-soft); color: var(--color-forest); font-weight: 700; font-size: 13px; }
      .featured-text { min-width: 0; }
      .featured-text strong { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 14px; }
      .featured-text small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--color-muted); font-size: 12px; }

      /* ---------- category chips */
      .chips-wrap { padding-bottom: 6px; }
      .chips { display: flex; gap: 10px; overflow-x: auto; padding: 4px 2px 14px; scrollbar-width: none; -webkit-overflow-scrolling: touch; border-bottom: 1px solid var(--color-border); }
      .chips::-webkit-scrollbar { display: none; }
      .chip { flex: 0 0 auto; display: inline-flex; align-items: center; gap: 7px; min-height: 38px; padding: 0 14px; border-radius: 999px; border: 1px solid var(--color-border); background: var(--color-surface); color: var(--color-text); font-size: 13px; font-weight: 500; white-space: nowrap; cursor: pointer; transition: background 140ms ease, color 140ms ease, border-color 140ms ease; }
      .chip:hover { border-color: var(--color-forest); }
      .chip.on { background: var(--color-forest); border-color: var(--color-forest); color: #fff; }

      /* ---------- layout */
      .layout { display: grid; grid-template-columns: 250px minmax(0, 1fr); gap: clamp(18px, 2.4vw, 32px); padding-top: 18px; align-items: start; }
      .sidebar { position: sticky; top: 84px; padding: 16px; border-radius: 16px; border: 1px solid var(--color-border); background: var(--color-surface); }
      .side-search, .mobile-search { display: flex; align-items: center; gap: 9px; height: 42px; padding: 0 12px; border-radius: 11px; border: 1px solid var(--color-border-strong); background: var(--color-bg); color: var(--color-muted); }
      .side-search:focus-within, .mobile-search:focus-within { border-color: var(--color-forest); box-shadow: 0 0 0 3px var(--color-success-soft); }
      .side-search input, .mobile-search input { flex: 1; min-width: 0; height: 100%; border: 0 !important; outline: none !important; box-shadow: none !important; background: transparent; font-size: 13.5px; color: var(--color-text); }
      .group { margin: 18px 0 0; padding: 0; border: 0; min-width: 0; }
      .group legend { padding: 0; margin-bottom: 8px; font-size: 13.5px; font-weight: 700; }
      .opt { display: flex; align-items: center; gap: 9px; min-height: 34px; font-size: 13.5px; color: var(--color-text-secondary); cursor: pointer; }
      .opt input { position: absolute; opacity: 0; pointer-events: none; }
      .box { flex: 0 0 18px; width: 18px; height: 18px; border-radius: 5px; border: 1.5px solid var(--color-border-strong); background: var(--color-bg); display: grid; place-items: center; transition: all 120ms ease; }
      .opt input:checked + .box { background: var(--color-forest); border-color: var(--color-forest); }
      .opt input:checked + .box::after { content: ''; width: 5px; height: 9px; margin-top: -2px; border: solid #fff; border-width: 0 2px 2px 0; transform: rotate(45deg); }
      .opt input:focus-visible + .box { outline: 2px solid var(--color-forest); outline-offset: 2px; }
      .clear { width: 100%; height: 42px; margin-top: 18px; border: 0; border-radius: 11px; background: var(--color-bg-alt); color: var(--color-text); font-size: 13.5px; font-weight: 600; cursor: pointer; }
      .clear:disabled { opacity: .55; cursor: default; }

      /* ---------- toolbar */
      .mobile-search { display: none; }
      .toolbar-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
      .count { font-size: 14px; }
      .toolbar-actions { display: flex; align-items: center; gap: 10px; }
      .tool-btn { display: none; align-items: center; gap: 7px; min-height: 40px; padding: 0 14px; border-radius: 10px; border: 1px solid var(--color-border-strong); background: var(--color-surface); color: var(--color-text); font-size: 13px; font-weight: 600; cursor: pointer; position: relative; }
      .dot { display: inline-grid; place-items: center; min-width: 18px; height: 18px; padding: 0 5px; border-radius: 999px; background: var(--color-forest); color: #fff; font-size: 11px; }
      .sort { position: relative; display: inline-flex; align-items: center; gap: 10px; font-size: 13px; color: var(--color-muted); }
      .sort select { appearance: none; -webkit-appearance: none; min-height: 40px; padding: 0 34px 0 12px; border-radius: 10px; border: 1px solid var(--color-border-strong); background: var(--color-surface); color: var(--color-text); font-size: 13px; cursor: pointer; }
      .sort-chev { position: absolute; right: 11px; pointer-events: none; color: var(--color-muted); }

      /* ---------- cards */
      .grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; }
      .card { display: flex; flex-direction: column; overflow: hidden; border-radius: 16px; border: 1px solid var(--color-border); background: var(--color-surface); transition: box-shadow 160ms ease, transform 160ms ease; }
      .card:hover { box-shadow: 0 8px 22px rgba(24,38,30,.1); transform: translateY(-2px); }
      .cover { display: block; aspect-ratio: 16 / 8; background: var(--color-bg-alt); overflow: hidden; }
      .cover.no-img { background: linear-gradient(135deg, var(--color-success-soft), var(--color-bg-alt)); }
      .cover img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .body { display: flex; flex-direction: column; flex: 1; gap: 8px; padding: 0 12px 12px; }
      .id-row { display: flex; align-items: flex-start; gap: 8px; min-width: 0; }
      .logo { flex: 0 0 48px; width: 48px; height: 48px; margin-top: -24px; border-radius: 50%; object-fit: cover; border: 3px solid #fff; background: #fff; box-shadow: 0 1px 5px rgba(0,0,0,.14); }
      .name { margin: 0; min-width: 0; padding-top: 8px; font-size: 14.5px; line-height: 1.25; font-weight: 700; }
      .name a { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; color: var(--color-text); text-decoration: none; word-break: break-word; }
      .meta-row { display: flex; align-items: center; flex-wrap: wrap; gap: 4px 6px; font-size: 12.5px; color: var(--color-text-secondary); }
      .rate { display: inline-flex; align-items: center; gap: 4px; font-weight: 600; color: var(--color-text); }
      .rate em { font-style: normal; font-weight: 400; color: var(--color-muted); }
      .new { color: var(--color-muted); }
      .dotsep { color: var(--color-muted-2, #b8b8b8); font-size: 9px; }
      .tag { align-self: flex-start; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding: 3px 9px; border-radius: 7px; background: var(--color-bg-alt); color: var(--color-text-secondary); font-size: 12px; }
      .loc { display: inline-flex; align-items: center; gap: 5px; font-size: 12.5px; color: var(--color-muted); }
      .view { display: grid; place-items: center; min-height: 40px; margin-top: auto; border-radius: 10px; background: var(--color-bg-alt); color: var(--color-text); font-size: 13px; font-weight: 600; text-decoration: none; transition: background 140ms ease, color 140ms ease; }
      .view:hover { background: var(--color-forest); color: #fff; }
      .body > .tag + .loc { margin-bottom: 4px; }

      .skeleton { padding-bottom: 12px; gap: 10px; }
      .sk-cover { aspect-ratio: 16 / 8; background: var(--color-bg-alt); }
      .sk-line { height: 12px; margin: 0 12px; border-radius: 6px; background: var(--color-bg-alt); }
      .sk-line.w60 { width: 60%; } .sk-line.w40 { width: 40%; }
      .sk-btn { height: 40px; margin: 6px 12px 0; border-radius: 10px; background: var(--color-bg-alt); }
      .skeleton > * { animation: pulse 1.3s ease-in-out infinite; }
      @keyframes pulse { 50% { opacity: .55; } }

      .state { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 56px 20px; text-align: center; color: var(--color-muted); }
      .state h2 { margin: 0; color: var(--color-text); font-size: 18px; }
      .state p { margin: 0 0 6px; font-size: 13.5px; max-width: 38ch; }
      .state-ic { display: grid; place-items: center; width: 68px; height: 68px; border-radius: 50%; background: var(--color-bg-alt); }

      .pager { display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 8px; margin-top: 28px; }
      .pg { display: inline-grid; place-items: center; min-width: 40px; height: 40px; padding: 0 8px; border-radius: 10px; border: 1px solid var(--color-border); background: var(--color-surface); color: var(--color-text); font-size: 13.5px; font-weight: 500; cursor: pointer; }
      .pg:hover:not(:disabled):not(.on) { border-color: var(--color-forest); }
      .pg.on { background: var(--color-forest); border-color: var(--color-forest); color: #fff; }
      .pg:disabled { opacity: .45; cursor: default; }
      .gap { color: var(--color-muted); padding: 0 2px; }

      /* ---------- bottom sheet (mobile) */
      .sheet-backdrop { position: fixed; inset: 0; z-index: 90; background: rgba(15,22,18,.45); animation: fade 160ms ease; }
      .sheet { position: fixed; z-index: 91; left: 0; right: 0; bottom: 0; display: flex; flex-direction: column; max-height: 86dvh; border-radius: 22px 22px 0 0; background: var(--color-surface); box-shadow: 0 -10px 40px rgba(0,0,0,.18); animation: rise 220ms cubic-bezier(.2,.8,.2,1); }
      .sheet-grab { width: 40px; height: 4px; margin: 10px auto 0; border-radius: 4px; background: var(--color-border-strong); }
      .sheet-head { display: flex; align-items: center; justify-content: space-between; padding: 10px 18px 6px; }
      .sheet-head h2 { margin: 0; font-size: 17px; }
      .sheet-x { display: grid; place-items: center; width: 40px; height: 40px; border: 0; border-radius: 50%; background: var(--color-bg-alt); cursor: pointer; color: var(--color-text); }
      .sheet-body { overflow-y: auto; padding: 0 18px 12px; }
      .sheet-body .group:first-child { margin-top: 6px; }
      .sheet-foot { display: grid; grid-template-columns: 1fr 2fr; gap: 10px; padding: 12px 18px calc(14px + env(safe-area-inset-bottom)); border-top: 1px solid var(--color-border); }
      .sheet-foot .btn { min-height: 46px; justify-content: center; }
      .sheet-foot .btn-primary, .state .btn-primary { background: var(--color-forest); border-color: var(--color-forest); color: #fff; }
      @keyframes rise { from { transform: translateY(100%); } }
      @keyframes fade { from { opacity: 0; } }

      /* ---------- tablet */
      @media (max-width: 1100px) {
        .layout { grid-template-columns: minmax(0, 1fr); }
        .sidebar { display: none; }
        .tool-btn { display: inline-flex; }
        .mobile-search { display: flex; margin-bottom: 12px; }
        .grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        .toolbar-row { flex-wrap: wrap; }
      }
      @media (min-width: 1101px) { .sheet, .sheet-backdrop { display: none; } }
      @media (max-width: 900px) {
        .head { grid-template-columns: minmax(0, 1fr); gap: 18px; }
        .hero { order: -1; min-height: 176px; }
        .head-copy { order: 2; }
        .featured { display: block; }
      }
      @media (max-width: 760px) {
        .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
      }

      /* ---------- mobile */
      @media (max-width: 640px) {
        .head { padding-top: 12px; padding-bottom: 14px; }
        .head h1 { margin-top: 10px; font-size: 28px; }
        .sub { margin-top: 6px; font-size: 13px; line-height: 1.5; }
        .stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin-top: 14px; }
        .stat { flex-direction: column; align-items: flex-start; gap: 6px; padding: 10px; border-radius: 12px; }
        .stat-icon { width: 30px; height: 30px; border-radius: 9px; }
        .stat strong { font-size: 15px; }
        .stat small { font-size: 11px; }
        .hero { min-height: 164px; border-radius: 16px; }
        .hero-copy { max-width: 58%; padding: 16px; }
        .hero-copy h2 { font-size: 22px; }
        .hero-copy p { margin-top: 6px; font-size: 12px; }
        .hero-cta { min-height: 38px; margin-top: 12px; padding: 0 13px; font-size: 12.5px; }
        .hero-mosaic { inset: 0 0 0 48%; }
        .hero-badge { display: none; }
        .chip { min-height: 38px; padding: 0 12px; font-size: 12.5px; }
        .chips { padding-bottom: 12px; margin-inline: calc(var(--page-gutter) * -1); padding-inline: var(--page-gutter); }
        .toolbar-row { gap: 8px; }
        .count { font-size: 13px; }
        .sort-label { display: none; }
        .sort select, .tool-btn { min-height: 40px; padding-inline: 11px; }
        .sort select { padding-right: 30px; }
        .body { padding: 0 10px 10px; gap: 7px; }
                .logo { flex-basis: 42px; width: 42px; height: 42px; margin-top: -21px; border-width: 2px; }
        .name { padding-top: 6px; }
        .name { font-size: 13.5px; }
        .meta-row, .loc { font-size: 12px; }
        .tag { font-size: 11.5px; }
        .view { min-height: 38px; font-size: 12.5px; }
        .pg { min-width: 38px; height: 38px; }
        .pager { gap: 6px; }
      }
      @media (max-width: 339px) {
        .grid { grid-template-columns: minmax(0, 1fr); }
        .stat small { font-size: 10.5px; }
        .hero-copy { max-width: 66%; }
      }
      @media (prefers-reduced-motion: reduce) { .sheet, .sheet-backdrop, .card, .skeleton > * { animation: none !important; transition: none !important; } }
      a:focus-visible, button:focus-visible, select:focus-visible { outline: 2px solid var(--color-forest); outline-offset: 2px; }
    `,
  ],
})
export class StoresComponent {
  protected readonly catalog = inject(CatalogService);

  protected readonly term = signal('');
  protected readonly category = signal('');
  protected readonly minRating = signal(0);
  protected readonly size = signal<SizeKey>('');
  protected readonly sort = signal<SortKey>('popular');
  protected readonly page = signal(1);
  protected readonly filterOpen = signal(false);

  protected readonly ratingOptions = [4.5, 4.0, 3.5, 3.0];
  protected readonly sizeBuckets = SIZE_BUCKETS;
  protected readonly skeletons = [1, 2, 3, 4, 5, 6, 7, 8];

  constructor() {
    effect(() => {
      document.body.style.overflow = this.filterOpen() ? 'hidden' : '';
    });
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.filterOpen.set(false);
  }

  private readonly rows = computed<StoreRow[]>(() => {
    const all = this.catalog.allStores();
    return all.map((store) => {
      const products = this.catalog.productsByStore(store.id);
      const cover = store.bannerUrl || products.find((p) => p.image)?.image || null;
      return { store, cover, productCount: products.length };
    });
  });

  protected readonly allStoresCount = computed(() => this.rows().length);
  protected readonly productCount = computed(() => this.catalog.allProducts().length);

  protected readonly categoryNames = computed(() =>
    [...new Set(this.rows().map((r) => r.store.categoryName).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
  );

  protected readonly heroImages = computed(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const row of this.rows()) {
      if (row.cover && !seen.has(row.cover)) {
        seen.add(row.cover);
        out.push(row.cover);
      }
      if (out.length === 4) break;
    }
    return out;
  });

  protected readonly filteredRows = computed(() => {
    const needle = this.term().trim().toLowerCase();
    const category = this.category();
    const minRating = this.minRating();
    const bucket = SIZE_BUCKETS.find((b) => b.key === this.size());
    const list = this.rows().filter(({ store, productCount }) => {
      if (needle && ![store.name, store.location, store.categoryName].join(' ').toLowerCase().includes(needle)) return false;
      if (category && store.categoryName !== category) return false;
      if (minRating && !(store.reviewCount > 0 && store.rating >= minRating)) return false;
      if (bucket && !bucket.test(productCount)) return false;
      return true;
    });
    const sort = this.sort();
    const byName = (a: StoreRow, b: StoreRow) => a.store.name.localeCompare(b.store.name);
    return [...list].sort((a, b) => {
      switch (sort) {
        case 'rating':
          return b.store.rating - a.store.rating || b.store.reviewCount - a.store.reviewCount || byName(a, b);
        case 'products':
          return b.productCount - a.productCount || byName(a, b);
        case 'name':
          return byName(a, b);
        default: {
          const ac = isCuratedStore(a.store) ? 1 : 0;
          const bc = isCuratedStore(b.store) ? 1 : 0;
          return bc - ac || b.store.reviewCount - a.store.reviewCount || b.productCount - a.productCount || byName(a, b);
        }
      }
    });
  });

  protected readonly popularRows = computed(() => this.filteredRows().slice(0, 6));

  protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filteredRows().length / PAGE_SIZE)));
  protected readonly pageRows = computed(() => {
    const start = (Math.min(this.page(), this.totalPages()) - 1) * PAGE_SIZE;
    return this.filteredRows().slice(start, start + PAGE_SIZE);
  });

  /** 0 marks an ellipsis. */
  protected readonly pageList = computed(() => {
    const total = this.totalPages();
    const current = Math.min(this.page(), total);
    const pages = new Set([1, total, current, current - 1, current + 1]);
    const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
    const out: number[] = [];
    sorted.forEach((p, i) => {
      if (i > 0 && p - sorted[i - 1] > 1) out.push(0);
      out.push(p);
    });
    return out;
  });

  protected readonly activeFilterCount = computed(
    () => (this.minRating() ? 1 : 0) + (this.size() ? 1 : 0) + (this.category() ? 1 : 0),
  );
  protected readonly hasFilters = computed(() => Boolean(this.term().trim()) || this.activeFilterCount() > 0);

  protected onTerm(value: string): void {
    this.term.set(value ?? '');
    this.page.set(1);
  }
  protected onSort(value: SortKey): void {
    this.sort.set(value);
    this.page.set(1);
  }
  protected setCategory(name: string): void {
    this.category.set(name);
    this.page.set(1);
  }
  protected toggleRating(value: number): void {
    this.minRating.set(this.minRating() === value ? 0 : value);
    this.page.set(1);
  }
  protected toggleSize(key: Exclude<SizeKey, ''>): void {
    this.size.set(this.size() === key ? '' : key);
    this.page.set(1);
  }
  protected clearFilters(): void {
    this.term.set('');
    this.category.set('');
    this.minRating.set(0);
    this.size.set('');
    this.page.set(1);
  }
  protected goTo(p: number): void {
    this.page.set(Math.min(Math.max(1, p), this.totalPages()));
    document.getElementById('store-directory')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  protected jumpToDirectory(event: Event): void {
    event.preventDefault();
    document.getElementById('store-directory')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  protected initials(name: string): string {
    return name.split(' ').slice(0, 2).map((word) => word[0]).join('').toUpperCase();
  }
}
