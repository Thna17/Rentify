import {
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CatalogService } from '../core/catalog/catalog.service';
import { NavbarComponent } from '../components/shared/layout/navbar/navbar.component';
import { FooterComponent } from '../components/shared/layout/footer/footer.component';
import { IconComponent } from '../components/shared/ui/icon/icon.component';
import { ProductRailComponent } from '../components/user/catalog/product-rail/product-rail.component';
import { PromoCardComponent } from '../components/shared/ui/promo-card/promo-card.component';
import { PROMO_SLOTS } from '../core/promos/promos.data';
import { HomeHeroComponent } from '../components/user/home/home-hero/home-hero.component';
import { ProductCardComponent } from '../components/user/catalog/product-card/product-card.component';
import { Category, Product, isCuratedProduct, isCuratedStore } from '../core/catalog/catalog.models';
import { SeoService } from '../core/seo/seo.service';
import { TranslatePipe } from '../core/i18n/translate.pipe';
import { CategoryTextPipe } from '../core/i18n/category-text.pipe';

interface CategoryShelf {
  slug: string;
  name: string;
  description: string;
  products: Product[];
  subcategories: { slug: string; name: string; count: number }[];
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CategoryTextPipe, TranslatePipe, CommonModule, RouterLink, NavbarComponent, FooterComponent, IconComponent, ProductRailComponent, ProductCardComponent, HomeHeroComponent, PromoCardComponent],
  template: `
  <app-navbar></app-navbar>

  <app-home-hero />

  <section class="container section category-section">
    <div class="section-head">
      <h2>{{ 'home.popularCategories' | translate }}</h2>
      <a routerLink="/categories" class="see-all">{{ 'home.viewAll' | translate }} <ui-icon name="arrow-right" [size]="14"></ui-icon></a>
    </div>
    <div
      class="category-rail"
      [class.more-left]="railMoreLeft()"
      [class.more-right]="railMoreRight()"
    >
      <div class="category-strip" #catRail (scroll)="onRailScroll()">
        @for (c of categories(); track c.slug) {
          <a
            class="category-poster"
            [attr.data-category]="c.slug"
            [routerLink]="['/categories', c.slug]"
            [attr.aria-label]="c | categoryText"
          >
            <span class="cat-visual">
              <span class="cat-copy">
                <span class="cat-name">{{ c | categoryText: (narrowTiles() ? 'shortName' : 'name') }}</span>
                <span class="cat-go"><ui-icon name="arrow-right" [size]="15"></ui-icon></span>
              </span>
              <span class="cat-art">
                @if (categoryPosterImage(c.slug); as image) {
                  <img [src]="image" alt="" loading="lazy" (error)="categoryPosterFailed(c.slug)" />
                } @else {
                  <ui-icon [name]="c.icon" [size]="46" [strokeWidth]="1.2"></ui-icon>
                }
              </span>
            </span>
            <span class="cat-caption" aria-hidden="true">{{ c | categoryText: (narrowTiles() ? 'shortName' : 'name') }}</span>
          </a>
        }
        <!-- Phone only: the category bar hides its Stores / Gifts / Discount
             pills on narrow screens, so they join this grid instead. -->
        @for (s of mobileShortcuts; track s.key) {
          <a
            class="category-poster cat-shortcut"
            [routerLink]="s.link"
            [queryParams]="s.params"
            [attr.aria-label]="s.label | translate"
          >
            <span class="cat-visual">
              <span class="cat-art">
                @if (categoryPosterImage(s.key); as image) {
                  <img [src]="image" alt="" loading="lazy" (error)="categoryPosterFailed(s.key)" />
                } @else {
                  <ui-icon [name]="s.icon" [size]="28" [strokeWidth]="1.6"></ui-icon>
                }
              </span>
            </span>
            <span class="cat-caption" aria-hidden="true">{{ s.label | translate }}</span>
          </a>
        }
      </div>
    </div>
  </section>




  @if (catalog.productError()) {
    <section class="container catalog-notice" role="alert">
      <ui-icon name="alert-circle" [size]="18" />
      <div>
        <strong>{{ 'home.productsUnavailable' | translate }}</strong>
        <span>{{ catalog.productError() | translate }}</span>
      </div>
      <button type="button" class="btn btn-outline btn-sm" (click)="catalog.load()">
        {{ 'state.tryAgain' | translate }}
      </button>
    </section>
  }

  <section class="container section" [attr.aria-label]="'home.sellerOffers' | translate">
    @if (flashDeals().length) {
      <div class="flash">
        <div class="flash-main">
          <div class="section-head flash-head">
            <div class="flash-title">
              <span class="flash-bolt"><ui-icon name="tag" [size]="18" /></span>
              <h2>{{ 'home.flashDeals' | translate }}</h2>
              <span class="flash-timer" [attr.aria-label]="'home.dealsRefresh' | translate">
                {{ 'home.endsIn' | translate }} <b>{{ countdown().h }}</b>:<b>{{ countdown().m }}</b>:<b>{{ countdown().s }}</b>
              </span>
            </div>
            <a routerLink="/products" [queryParams]="{ sale: '1' }" class="see-all">{{ 'home.viewAllDeals' | translate }} <ui-icon name="arrow-right" [size]="14"></ui-icon></a>
          </div>
          <div class="flash-grid">
            @for (product of flashDeals(); track product.id) {
              <a class="deal-card" [routerLink]="['/product', product.id]">
                <span class="deal-img">
                  @if (product.image) {
                    <img [src]="product.image" [alt]="product.name" loading="lazy" />
                  }
                  <span class="deal-off">-{{ discount(product) }}%</span>
                </span>
                <span class="deal-name">{{ product.name }}</span>
                <span class="deal-price">
                  <strong>\${{ product.price.toFixed(2) }}</strong>
                  <s>\${{ product.compareAtPrice!.toFixed(2) }}</s>
                </span>
                <span class="deal-bar"><i [style.width.%]="stockLeft(product)"></i></span>
                <small class="deal-left">{{ product.stock }} left</small>
              </a>
            }
          </div>
        </div>
        <div class="flash-promo"><app-promo-card [promo]="promoSlots.flashDeals" /></div>
      </div>
    } @else {

    @if (dealCategories().length) {
      <div class="section-head">
        <h2>{{ 'home.bestDeals' | translate }}</h2>
        <a routerLink="/products" [queryParams]="{ sale: '1' }" class="see-all">{{ 'home.shopAllDeals' | translate }} <ui-icon name="arrow-right" [size]="14"></ui-icon></a>
      </div>
      <div class="deals-strip">
        @for (deal of dealCategories(); track deal.category.slug) {
          <a
            class="deal-poster"
            [attr.data-category]="deal.category.slug"
            [routerLink]="['/products']"
            [queryParams]="deal.hasDeal ? { category: deal.category.slug, sale: '1' } : { category: deal.category.slug }"
          >
            <div class="deal-poster-inner" [class.has-poster]="dealPoster(deal.category.slug)">
              @if (dealPoster(deal.category.slug); as poster) {
                <img class="deal-photo" [src]="poster" alt="" aria-hidden="true" loading="lazy" />
              }
              <div class="deal-top">
                <span class="deal-icon"><ui-icon [name]="deal.category.icon" [size]="15"></ui-icon></span>
                @if (deal.hasDeal) {
                  <span class="deal-badge">{{ 'catalog.onSaleOnly' | translate }}</span>
                }
              </div>
              @if (!dealPoster(deal.category.slug)) {
                <span class="deal-name">{{ deal.category | categoryText }}</span>
              }
              <span class="deal-count">
                {{ deal.storeCount }} store{{ deal.storeCount === 1 ? '' : 's' }} ·
                {{ deal.productCount }} product{{ deal.productCount === 1 ? '' : 's' }}
              </span>
              <span class="deal-arrow"><ui-icon name="arrow-right" [size]="14"></ui-icon></span>
            </div>
          </a>
        }
      </div>
    } @else {
      <div class="offers-strip">
        <ui-icon name="tag" [size]="20" />
        <div><strong>{{ 'home.exploreSellerOffers' | translate }}</strong><p>{{ 'home.sellerOffersBody' | translate }}</p></div>
        <a class="see-all" routerLink="/products" [queryParams]="{ sale: '1' }">{{ 'home.shopDeals' | translate }} <ui-icon name="arrow-right" [size]="14" /></a>
      </div>
    }
    }
  </section>



  @if (phones().length) {
    <section class="container section" [attr.aria-label]="'home.smartphones' | translate">
      <app-product-rail
        [title]="'home.smartphones' | translate"
        [products]="phones()"
        linkRoute="/products"
        [linkParams]="promoSlots.smartphones.params ?? {}"
        [linkLabel]="'home.viewAll' | translate"
      />
    </section>
  }

  @if (trending().length) {
    <section class="container section">
      <app-product-rail
        [title]="'home.trendingProducts' | translate"
        [products]="trending()"
        linkRoute="/products"
        [linkParams]="{ sort: 'featured' }"
        linkLabel="View all"
      />
    </section>
  }

  <section class="container section discover">
    <header class="discover-head">
      <h2>{{ 'home.recommendedForYou' | translate }}</h2>
      <p>{{ catalog.allProducts().length }} products from {{ discoverStoreCount() }} Cambodian sellers</p>
    </header>

    <div class="discover-filters" role="group" [attr.aria-label]="'home.filterByDepartment' | translate">
      <button
        type="button"
        class="chip"
        [class.active]="discoverCategory() === 'all'"
        (click)="selectDiscoverCategory('all')"
      >{{ 'catalog.all' | translate }} <span>{{ catalog.allProducts().length }}</span></button>
      @for (c of discoverCategories(); track c.slug) {
        <button
          type="button"
          class="chip"
          [class.active]="discoverCategory() === c.slug"
          (click)="selectDiscoverCategory(c.slug)"
        >{{ c | categoryText }} <span>{{ c.count }}</span></button>
      }
    </div>

    @if (discoverSubcategories().length) {
      <div class="discover-filters subs" role="group" [attr.aria-label]="'home.filterBySubCategory' | translate">
        <button
          type="button"
          class="chip sub"
          [class.active]="discoverSubcategory() === 'all'"
          (click)="discoverSubcategory.set('all')"
        >All of {{ discoverCategoryName() }}</button>
        @for (sc of discoverSubcategories(); track sc.name) {
          <button
            type="button"
            class="chip sub"
            [class.active]="discoverSubcategory() === sc.name"
            (click)="discoverSubcategory.set(sc.name)"
          >{{ sc.name }} <span>{{ sc.count }}</span></button>
        }
      </div>
    }

    @if (discoverProducts().length) {
      <!-- Re-keyed per department so switching chips replays the entrance;
           "Show more" keeps the key, so only the new cards animate in. -->
      @for (key of [discoverCategory() + '/' + discoverSubcategory()]; track key) {
        <div class="discover-grid" #discoverGrid>
          @for (product of discoverProducts(); track product.id; let i = $index) {
            <app-product-card class="card-in" [style.--i]="i % 12" [product]="product" />
          }
        </div>
      }
      <div class="discover-more">
        @if (discoverHasMore()) {
          <button class="more-btn" type="button" (click)="showMoreRows()">
            {{ 'home.showMore' | translate }} <ui-icon name="arrow-right" [size]="14" />
          </button>
        }
        <a class="more-hint" routerLink="/products" [queryParams]="discoverLinkParams()">
          {{ discoverLinkLabel() }}
        </a>
      </div>
    } @else {
      <p class="discover-empty">{{ 'home.nothingInDepartment' | translate }}</p>
    }
  </section>


  <app-footer></app-footer>
  `,
  styles: [`
    .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }

    /* ---------- featured collections: three equal cards */
    .fc-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 20px; }
    @media (max-width: 900px) {
      .fc-grid { grid-template-columns: none; grid-auto-flow: column; grid-auto-columns: 78%; overflow-x: auto; scroll-snap-type: x mandatory; }
      .fc-grid app-promo-card { scroll-snap-align: start; }
    }



    /* ---------- flash deals */
    .flash { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 16px; }
    .flash-main {
      background: var(--color-surface-raised); border: 1px solid var(--color-border);
      border-radius: var(--radius-lg); padding: 18px 20px 20px;
    }

    .flash-head { margin-bottom: 14px; }
    .flash-title { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    .flash-bolt { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 10px; background: #fff1ec; color: #f0562b; }
    .flash-timer {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 5px 10px; border-radius: 999px; background: #fff1ec; color: #e0492a;
      font-size: 12.5px; font-variant-numeric: tabular-nums;
    }
    .flash-timer b { color: var(--color-text); font-weight: 700; }
    .flash-grid { display: grid; grid-auto-flow: column; grid-auto-columns: calc((100% - 5 * 12px) / 6); gap: 12px; overflow-x: auto; scroll-snap-type: x mandatory; scrollbar-width: none; }
    .flash-grid::-webkit-scrollbar { display: none; }
    .deal-card { scroll-snap-align: start; }
    .deal-card {
      display: flex; flex-direction: column; gap: 6px; min-width: 0; padding: 8px 8px 12px;
      border-radius: 14px; text-decoration: none; color: var(--color-text);
      transition: background 180ms var(--ease-standard);
    }
    .deal-card:hover { background: var(--color-bg-alt); }
    .deal-img {
      position: relative; display: block; aspect-ratio: 4 / 3; border-radius: 12px; overflow: hidden;
      background: var(--color-bg-alt); margin-bottom: 4px;
    }
    .deal-img img { width: 100%; height: 100%; object-fit: cover; transition: transform 400ms var(--ease-out); }
    .deal-card:hover .deal-img img { transform: scale(1.05); }
    .deal-off {
      position: absolute; top: 8px; left: 8px; padding: 2px 8px; border-radius: 999px;
      background: #ef4444; color: #fff; font-size: 11px; font-weight: 700;
    }
    .deal-name { font-size: 13px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .deal-price { display: flex; align-items: baseline; gap: 6px; }
    .deal-price strong { font-size: 16px; color: #e0492a; }
    .deal-price s { font-size: 12px; color: var(--color-muted); }
    .deal-bar { height: 4px; border-radius: 999px; background: #fde4dc; overflow: hidden; }
    .deal-bar i { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, #f97316, #ef4444); }
    .deal-left { font-size: 11px; color: var(--color-muted); }
    @media (max-width: 1400px) { .flash-grid { grid-auto-columns: calc((100% - 3 * 12px) / 4); } }
    @media (max-width: 1180px) {
      .flash { grid-template-columns: minmax(0, 1fr); }
      .flash-promo { display: none; }
    }
    @media (max-width: 900px) { .flash-grid { grid-auto-columns: 42%; } }

    /* ---------- newsletter */
    .newsletter {
      display: flex; align-items: center; justify-content: space-between; gap: 24px; flex-wrap: wrap;
      padding: clamp(24px, 4vw, 44px); border-radius: var(--radius-xl);
      background: linear-gradient(120deg, #eef0ff 0%, #f4f1ff 55%, #eaf3ff 100%);
      border: 1px solid var(--color-border);
    }
    .newsletter h2 { font-size: clamp(22px, 2.4vw, 28px); letter-spacing: -.01em; }
    .newsletter p { margin: 6px 0 0; color: var(--color-text-secondary); font-size: 14.5px; }
    .newsletter-form { display: flex; gap: 8px; flex: 1 1 360px; max-width: 480px; }
    .newsletter-form input {
      flex: 1; min-width: 0; height: 48px; padding: 0 18px; font: inherit; font-size: 14px;
      border: 1px solid var(--color-border-strong); border-radius: 999px; background: #fff; color: var(--color-text);
    }
    .newsletter-form input:focus { outline: none; border-color: var(--color-accent); box-shadow: var(--shadow-focus); }
    .newsletter-form button {
      height: 48px; padding: 0 24px; border: 0; border-radius: 999px; cursor: pointer;
      background: var(--color-text); color: #fff; font-weight: 600; font-size: 14px;
      transition: background 180ms var(--ease-standard);
    }
    .newsletter-form button:hover { background: var(--color-accent); }
    .newsletter-done { display: inline-flex; align-items: center; gap: 8px; color: var(--color-success) !important; font-weight: 600; }
    /* The hero band now holds only the trust strip; the slider above owns the
       headline space, so the old 56px top padding just left a gap. */
    .hero-inner { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; align-items: center; }
    .hero-copy h1 { font-size: 44px; line-height: 1.1; margin: 16px 0 18px; }
    .hero-copy p { color: var(--color-muted); font-size: 15.5px; margin-bottom: 26px; max-width: 460px; line-height: 1.6; }
    .hero-actions { display: flex; gap: 12px; }
    .hero-image { height: 340px; border-radius: var(--radius-lg); }
    .section { padding: 17px 32px; }
    .catalog-notice {
      align-items: center;
      background: #fff8ed;
      border: 1px solid #ead7b7;
      border-radius: 12px;
      color: var(--color-text);
      display: flex;
      gap: 12px;
      margin-top: 18px;
      padding: 14px 18px;
    }
    .catalog-notice > ui-icon { color: #9b6517; flex: 0 0 auto; }
    .catalog-notice div { display: grid; flex: 1; gap: 2px; }
    .catalog-notice strong { font-size: 13px; }
    .catalog-notice span { color: var(--color-muted); font-size: 12px; }
    .category-section { padding-top: 22px; padding-bottom: 14px; }
    .section-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
    .section-head h2 { font-size: 22px; }
    .see-all { color: var(--color-text-secondary); font-size: 13px; font-weight: 600; display: inline-flex; align-items: center; gap: 5px; }
    .see-all:hover { color: var(--color-accent); }

    /* Fixed tile size, not a fraction of the row — a fraction-based grid
       still stretches each tile wider on a wide screen even with lots of
       columns, since empty trailing tracks are invisible but still 1fr wide.
       auto-fill with a fixed track size means the tile is exactly this size
       on every screen; a wide screen just fits more per row, it never grows
       the tiles themselves. */
    .category-pill {
      border: 1px solid var(--color-border); border-radius: 8px; padding: 5px 3px;
      display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 2px; background: #fff;
      width: 104px;
      min-height: 50px;
      transition: all var(--dur-base) var(--ease-standard);
      color: inherit;
      cursor: pointer;
      font-family: inherit;
    }
    .category-pill[data-category="fashion"] { background: #fff3ed; }
    .category-pill[data-category="food-groceries"] { background: #f1f7ef; }
    .category-pill[data-category="home-living"] { background: #faf3e9; }
    .category-pill[data-category="arts-culture"] { background: #fff8e9; }
    .category-pill[data-category="beauty-wellness"] { background: #fcf1f3; }
    .category-pill[data-category="electronics"] { background: #eff5fa; }
    .category-pill[data-category="kids-family"] { background: #f5f1fa; }
    .category-pill { transition: transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease; }
    .category-pill:hover { border-color: var(--color-accent); box-shadow: var(--shadow-sm); transform: translateY(-2px); }
    /* width + min-width:0 are both needed: without them the aspect-ratio
       gives this a min-content width that overflows its (small) grid track,
       so the tile renders far wider than the track it sits in. */
    /* A horizontal rail. Cards keep a landscape ratio at a fixed width, so how
       many you see is just a function of viewport - no breakpoint juggling. */
    /* ---------------------------------------------------------- discover
       The one catalogue section, given more weight than a normal shelf so it
       reads as the centre of the page rather than another rail. */
    .discover { padding-top: clamp(40px, 5vw, 72px); }
    /* Sized like every other section heading on this page (.section-head h2,
       22px). It used to run to 60px with an eyebrow above it, a rule under it
       and a line of instructions below — four stacked pieces of chrome
       introducing a row of filter chips that explain themselves. The count is
       the only part carrying information, so it is the only part left. */
    .discover-head { max-width: 720px; margin-bottom: 10px; }
    .discover-head h2 { font-size: 22px; letter-spacing: -.01em; }
    .discover-head p {
      color: var(--color-text-secondary, #6b5f52);
      font-size: 13px;
      margin-top: 4px;
    }

    /* One swipeable row instead of a wall of wrapped chips. It bleeds to the
       page edge so the cut-off chip on the right signals "there's more". */
    .discover-filters {
      display: flex;
      flex-wrap: nowrap;
      gap: 8px;
      margin: 22px calc(var(--page-gutter, 16px) * -1) 0;
      padding: 2px var(--page-gutter, 16px) 4px;
      overflow-x: auto;
      overscroll-behavior-x: contain;
      scroll-snap-type: x proximity;
      scroll-padding-inline: var(--page-gutter, 16px);
      scrollbar-width: none;
    }
    .discover-filters::-webkit-scrollbar { display: none; }
    .discover-filters.subs { margin-top: 8px; }
    .discover-filters .chip {
      flex-shrink: 0;
      white-space: nowrap;
      scroll-snap-align: start;
      background: var(--color-surface, #fff);
      border: 1px solid var(--color-border, #e6ddd1);
      border-radius: 999px;
      color: var(--color-text, #2b2118);
      cursor: pointer;
      font: inherit;
      font-size: 13px;
      font-weight: 650;
      padding: 9px 16px;
      transition: background 150ms ease, border-color 150ms ease, color 150ms ease;
    }
    .discover-filters .chip span {
      color: var(--color-text-muted, #9b8f80);
      font-size: 11.5px;
      font-weight: 600;
      margin-left: 6px;
    }
    .discover-filters .chip:hover { border-color: var(--color-accent, #8e3021); }
    .discover-filters .chip.active {
      background: var(--color-accent, #8e3021);
      border-color: var(--color-accent, #8e3021);
      color: #fff;
    }
    .discover-filters .chip.active span { color: rgba(255, 255, 255, .72); }
    .discover-filters .chip.sub { font-size: 12.5px; padding: 7px 14px; }

    .discover-grid {
      display: grid;
      gap: 20px;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      margin-top: 28px;
    }
    .card-in { animation: cardIn 460ms cubic-bezier(.2,.75,.25,1) both; animation-delay: calc(var(--i, 0) * 40ms); }
    @keyframes cardIn {
      from { opacity: 0; transform: translateY(14px) scale(.98); filter: blur(2px); }
      to { opacity: 1; transform: none; filter: none; }
    }
    @media (prefers-reduced-motion: reduce) { .card-in { animation-duration: 1ms; animation-delay: 0ms; } }
    .discover-more {
      align-items: center;
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-top: 30px;
    }
    /* A quiet second way through to the same page - there for anyone who wants
       the whole catalogue rather than the next slice, without competing with
       the button above it. */
    .more-hint {
      color: var(--color-text, #2b2118);
      font-size: 12.5px;
      opacity: .42;
      text-decoration: none;
      transition: opacity 160ms ease;
    }
    .more-hint:hover { opacity: .85; text-decoration: underline; text-underline-offset: 3px; }
    .discover-more .more-btn {
      align-items: center;
      cursor: pointer;
      font-family: inherit;
      background: var(--color-accent, #8e3021);
      border: 1px solid var(--color-accent, #8e3021);
      border-radius: 999px;
      color: #fff;
      display: inline-flex;
      font-size: 14px;
      font-weight: 700;
      gap: 9px;
      padding: 13px 30px;
      text-decoration: none;
      transition: opacity 150ms ease;
    }
    .discover-more .more-btn:hover { opacity: .88; }
    .discover-empty { color: var(--color-text-muted, #9b8f80); margin-top: 28px; }

    @media (max-width: 640px) {
      .discover-grid { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; }
    }

    .category-rail { position: relative; margin-top: 6px; }
    .category-section { padding-top: 34px !important; }
    .category-section .section-head { margin-bottom: 14px; }

    /* Edge fades, shown only when there is more to scroll to, so the rail reads
       as "keep going" rather than always looking clipped. */
    .category-rail::before,
    .category-rail::after {
      content: ''; position: absolute; top: 0; bottom: 0; width: clamp(44px, 7vw, 92px);
      pointer-events: none; z-index: 3; opacity: 0; transition: opacity 260ms ease;
    }
    .category-rail::before {
      left: -1px;
      background: linear-gradient(to right, var(--color-bg) 10%, rgba(255, 253, 248, 0));
    }
    .category-rail::after {
      right: -1px;
      background: linear-gradient(to left, var(--color-bg) 10%, rgba(255, 253, 248, 0));
    }
    .category-rail.more-left::before,
    .category-rail.more-right::after { opacity: 1; }

    .category-strip {
      display: flex;
      gap: clamp(12px, 1.2vw, 18px);
      overflow-x: auto;
      overscroll-behavior-x: contain;
      scroll-snap-type: x proximity;
      scrollbar-width: none;
      padding-bottom: 2px;
    }
    .category-strip::-webkit-scrollbar { display: none; }

    .category-poster {
      display: block;
      flex: 0 0 clamp(200px, 21vw, 252px);
      scroll-snap-align: start;
      min-width: 0; padding: 0; border: 0; background: none;
      cursor: pointer; color: inherit; font-family: inherit; text-align: left;
    }
    .category-poster .cat-visual {
      position: relative; display: block; overflow: hidden;
      width: 100%; aspect-ratio: 2.15 / 1; border-radius: 16px;
      background: var(--color-muted, #f1ede4);
      transition: transform 200ms ease, box-shadow 200ms ease;
    }
    .category-poster:hover .cat-visual {
      box-shadow: 0 10px 24px -12px rgba(60, 40, 20, .45); transform: translateY(-3px);
    }
    .cat-copy {
      position: absolute; inset: 0; z-index: 2;
      display: flex; flex-direction: column; justify-content: space-between;
      padding: 13px 15px;
    }
    .cat-name {
      font-size: 14px; font-weight: 700; line-height: 1.3; color: #3d2b1a; max-width: 62%;
      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
    }
    .cat-go {
      display: grid; place-items: center; width: 30px; height: 30px; border-radius: 50%;
      background: rgba(255, 255, 255, .6); color: #3d2b1a;
      transition: background 180ms ease, transform 180ms ease;
    }
    .cat-go ui-icon { transform: rotate(-45deg); }
    .category-poster:hover .cat-go { background: #fff; transform: translateX(2px); }
    /* Transparent product photography sits over each category’s tinted card. */
    .cat-art {
      position: absolute; top: 0; right: 0; bottom: 0; width: 46%;
      display: grid; place-items: center; z-index: 1;
    }
    .cat-art img { width: 100%; height: 100%; object-fit: contain; display: block; transition: transform 220ms ease; }
    .cat-art ui-icon { color: #3d2b1a; opacity: .22; transform: scale(1.4); }
    .category-poster:hover .cat-art img { transform: scale(1.04); }
    .cat-caption { display: none; }
    .category-poster.cat-shortcut { display: none; }

    /* Phones and tablets (the navbar collapses at 980px too): small round
       tiles holding just the cut-out object, name below. Phones get two rows
       of five; wider screens one row. */
    @media (max-width: 980px) {
      .category-rail::before, .category-rail::after { display: none; }
      .category-strip {
        display: grid; grid-template-columns: repeat(5, minmax(0, 1fr));
        gap: 14px 6px; overflow: visible;
      }
      .category-poster {
        display: flex; flex-direction: column; align-items: center; gap: 6px;
        min-height: 44px; text-align: center;
      }
      .category-poster .cat-visual,
      .category-poster[data-category] .cat-visual {
        width: min(54px, 100%); aspect-ratio: 1; border-radius: 50%;
        background: transparent; border: 0;
      }
      .category-poster:hover .cat-visual { box-shadow: none; transform: none; }
      .cat-copy { display: none; }
      .cat-shortcut .cat-art ui-icon { color: var(--color-accent); opacity: 1; }
      .cat-art { inset: 0; width: auto; }
      .cat-art img { width: 78%; height: 78%; }
      .cat-art ui-icon { opacity: .5; transform: none; }
      .cat-caption {
        display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
        font-size: 11.5px; font-weight: 600; line-height: 1.25; color: var(--color-text);
      }
    }
    /* Stores / Gifts / Discount join the tiles exactly where the category bar
       drops its own pills (700px), so they never show twice. */
    @media (max-width: 700px) {
      .category-poster.cat-shortcut { display: flex; }
    }
    @media (min-width: 641px) and (max-width: 980px) {
      .category-strip {
        grid-template-columns: none; grid-auto-flow: column; grid-auto-columns: minmax(0, 1fr);
        gap: 10px;
      }
      .category-poster .cat-visual,
      .category-poster[data-category] .cat-visual { width: min(68px, 100%); }
      .cat-caption { font-size: 12.5px; }
    }

    @media (min-width: 981px) {
    .category-poster[data-category="food-groceries"] .cat-visual { background: linear-gradient(115deg, #e8f3e2, #c7e3ba); }
    .category-poster[data-category="home-living"] .cat-visual { background: linear-gradient(115deg, #faf0dd, #eed8b2); }
    .category-poster[data-category="arts-culture"] .cat-visual { background: linear-gradient(115deg, #fff4d9, #ffdf9e); }
    .category-poster[data-category="fashion"] .cat-visual { background: linear-gradient(115deg, #ffeae0, #ffcab1); }
    .category-poster[data-category="beauty-wellness"] .cat-visual { background: linear-gradient(115deg, #fdeaef, #f9c0d0); }
    .category-poster[data-category="electronics"] .cat-visual { background: linear-gradient(115deg, #e9f1fa, #c3daf0); }
    .category-poster[data-category="kids-family"] .cat-visual { background: linear-gradient(115deg, #f1ebfa, #d6c5ef); }
    }
    .offers-strip { display: flex; flex-wrap: wrap; align-items: center; gap: 12px 24px; padding: 16px 20px; border: 1px solid #e8ded2; border-radius: 12px; background: #fcf0e8; }
    .offers-strip strong { color: var(--color-accent); font-size: 14px; }
    .offers-strip p { margin: 4px 0 0; color: var(--color-text-secondary); font-size: 12px; }
    .offers-strip .see-all { margin-left: auto; color: var(--color-accent); }
    .deals-strip { display: flex; gap: 12px; overflow-x: auto; padding-bottom: 4px; scrollbar-width: none; }
    .deals-strip::-webkit-scrollbar { display: none; }
    /* A hairline-thin frame — barely there — so the color itself is what reads,
       not a white border around it. */
    .deal-poster {
      flex: 0 0 132px; scroll-snap-align: start; display: block;
      padding: 3px; border-radius: 16px; background: #fff;
      text-decoration: none; transition: transform 200ms ease, box-shadow 200ms ease;
    }
    /* After the base rule, not before it — an earlier media query loses to a
       later rule of equal specificity, which is why the first attempt at this
       silently did nothing. */
    @media (max-width: 640px) {
      .deal-poster { flex: 0 0 114px; }
    }
    .deal-poster:hover { transform: translateY(-3px); box-shadow: 0 12px 24px rgba(40, 32, 22, .16); }
    .deal-poster-inner {
      position: relative; overflow: hidden; min-height: 192px; border-radius: 13px;
      display: flex; flex-direction: column; justify-content: flex-end; gap: 4px;
      padding: 13px; color: #fff;
    }
    .deal-photo {
      position: absolute; inset: 0; width: 100%; height: 100%;
      object-fit: cover; z-index: 0;
    }
    /* Only where a poster is behind it: the artwork is busy at the bottom, and
       the live store/product count is the one thing on this card the poster
       cannot say for itself. */
    .deal-poster-inner.has-poster::after {
      content: ''; position: absolute; inset: 0; z-index: 1; pointer-events: none;
      background: linear-gradient(to top, rgba(0, 0, 0, .78) 0%, rgba(0, 0, 0, .34) 22%, transparent 42%);
    }
    .deal-top, .deal-name, .deal-count, .deal-arrow { position: relative; z-index: 2; }
    .deal-arrow, .deal-top { position: absolute; }
    .deal-poster[data-category="fashion"] .deal-poster-inner { background: #c0405c; }
    .deal-poster[data-category="food-groceries"] .deal-poster-inner { background: #34664f; }
    .deal-poster[data-category="home-living"] .deal-poster-inner { background: #b4632f; }
    .deal-poster[data-category="beauty-wellness"] .deal-poster-inner { background: #9d4a8c; }
    .deal-poster[data-category="electronics"] .deal-poster-inner { background: #3a6491; }
    .deal-poster[data-category="kids-family"] .deal-poster-inner { background: #6f5cb5; }
    .deal-poster[data-category="arts-culture"] .deal-poster-inner { background: #7d7b25; }
    .deal-top {
      position: absolute; top: 10px; left: 10px; right: 40px;
      display: flex; align-items: center; gap: 6px;
    }
    .deal-icon {
      flex: 0 0 auto; width: 26px; height: 26px; border-radius: 50%;
      background: rgba(255,255,255,.22); display: flex; align-items: center; justify-content: center;
    }
    .deal-badge {
      padding: 3px 7px; border-radius: 5px;
      background: rgba(255,255,255,.92); color: #28231f; font-size: 8.5px; font-weight: 800;
      letter-spacing: .04em; text-transform: uppercase; font-family: var(--font-body);
    }
    .deal-poster .deal-name {
      font-family: var(--font-body); font-weight: 600;
      font-size: 17px; line-height: 1.3; letter-spacing: -.01em;
    }
    .deal-count { font-size: 9.5px; color: rgba(255,255,255,.82); font-weight: 550; font-family: var(--font-body); }
    .deal-arrow {
      position: absolute; top: 10px; right: 10px; width: 26px; height: 26px; border-radius: 50%;
      background: rgba(255,255,255,.2); display: flex; align-items: center; justify-content: center;
      transition: transform 200ms ease, background 200ms ease;
    }
    .deal-poster:hover .deal-arrow { background: rgba(255,255,255,.32); transform: translate(2px, -2px); }
    .see-all ui-icon { transition: transform 180ms ease; }
    .see-all:hover { text-decoration: underline; text-underline-offset: 4px; }
    .see-all:hover ui-icon { transform: translateX(3px); }
    /* Matches the landscape category cards beside it so the row stays even. */
    @keyframes category-in { from { opacity: 0; transform: translateX(10px); } to { opacity: 1; transform: translateX(0); } }
    .cat-icon { color: var(--color-accent); }
    .category-pill span { font-size: 11px; font-weight: 650; line-height: 1.25; }
    .category-pill small { display: none; }

    .fashion-edit { padding-top: 24px; padding-bottom: 20px; }

    .marketplace-explorer { padding-top: 28px; }
    .marketplace-heading { border-bottom: 1px solid var(--color-border); padding-bottom: 17px; }
    .marketplace-eyebrow { color: var(--color-accent); font-size: 10px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; }
    .marketplace-heading h2 { font-size: clamp(26px, 2.4vw, 36px); margin-top: 5px; }
    .category-shelf { padding: 23px 0 15px; }
    .department-preview { display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: clamp(18px, 3vw, 32px); border-radius: 16px; background: var(--color-accent-soft); color: var(--color-text); }
    .department-preview-copy { min-width: 0; }
    .department-preview h3 { font-size: clamp(20px, 2vw, 28px); }
    .department-preview p { margin: 8px 0 16px; color: var(--color-text-secondary); line-height: 1.5; }
    .department-preview-cta { display: inline-flex; align-items: center; gap: 8px; color: var(--color-accent); font-weight: 600; }
    .department-preview img { width: clamp(88px, 20vw, 180px); height: clamp(88px, 20vw, 180px); object-fit: contain; flex: 0 0 auto; }
    .department-preview:hover .department-preview-cta { text-decoration: underline; }
    .department-preview:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 4px; }
    .category-shelf + .category-shelf { border-top: 1px solid var(--color-border); }
    .shelf-context { align-items: center; display: flex; gap: 16px; justify-content: flex-end; margin-bottom: 7px; }
    .subcategory-links { display: flex; gap: 7px; max-width: 62%; overflow-x: auto; padding: 2px 1px 5px; scrollbar-width: none; }
    .subcategory-links::-webkit-scrollbar { display: none; }
    .subcategory-links a { align-items: center; background: var(--color-bg-alt); border: 1px solid var(--color-border); border-radius: var(--radius-full); color: var(--color-text-secondary); display: inline-flex; flex: 0 0 auto; font-size: 10.5px; font-weight: 650; gap: 6px; padding: 6px 10px; transition: border-color .2s ease, color .2s ease, background .2s ease; }
    .subcategory-links a:hover { background: #fff; border-color: var(--color-border-strong); color: var(--color-accent); }
    .subcategory-links small { color: var(--color-muted); font-size: 9.5px; }

    .scroll-row { display: flex; gap: 16px; overflow-x: auto; padding-bottom: 10px; scroll-snap-type: x proximity; scrollbar-width: none; }
    .scroll-row::-webkit-scrollbar { display: none; }
    .product-card { min-width: 210px; flex-shrink: 0; scroll-snap-align: start; }
    .product-thumb { height: 150px; font-size: 11px; padding: 8px; }
    .product-body { padding: 14px; display: flex; flex-direction: column; gap: 4px; }
    .tag { font-size: 10px; color: var(--color-gold); font-weight: 700; text-transform: uppercase; letter-spacing: .03em; }
    .product-body h4 { font-size: 14px; }
    .store { font-size: 11.5px; color: var(--color-muted); }
    .price-row { display: flex; justify-content: space-between; align-items: center; margin-top: 8px; }
    .price { font-weight: 700; }
    .cart-add { background: var(--color-accent); border: none; border-radius: var(--radius-sm); width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; }
    .cart-add:hover { background: var(--color-accent-hover); }

    .stores-marquee { margin-inline: calc(50% - 50vw); overflow: hidden; padding-inline: max(32px, calc((100vw - var(--container-max, 1280px)) / 2)); }
    .stores-track { display: flex; width: max-content; animation: stores-marquee 48s linear infinite; will-change: transform; }
    .stores-marquee:hover .stores-track, .stores-marquee:focus-within .stores-track { animation-play-state: paused; }
    .stores-row { display: flex; flex: 0 0 auto; flex-wrap: nowrap; gap: 16px; padding-right: 16px; }
    .store-chip {
      align-items: center;
      box-sizing: border-box;
      display: flex;
      flex: 0 0 300px;
      gap: 10px;
      max-width: 300px;
      min-width: 300px;
      overflow: hidden;
      padding: 12px;
      width: 300px;
    }
    .store-chip:hover { background: var(--color-bg-alt); }
    /* min-width:0 is what actually lets this shrink inside the fixed-width
       chip — without it a long store name refuses to shrink and spills text
       into the next card instead of truncating. */
    .store-info { flex: 1 1 auto; max-width: calc(100% - 54px); min-width: 0; overflow: hidden; }
    .store-info strong {
      display: block;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .store-info .rating-row {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .store-logo { flex: 0 0 44px; width: 44px; height: 44px; border-radius: 50%; font-size: 10px; }
    img.store-logo { object-fit: cover; }
    @keyframes stores-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
    @media (prefers-reduced-motion: reduce) { .stores-track { animation-play-state: paused; } }

    /* Shop curated collections — one hero tile (full-bleed photo) plus two
       split tiles (tinted copy panel + photo) stacked beside it. */
    .collections-head { align-items: flex-start; }
    .collections-subtitle { color: var(--color-text-muted); font-size: 13px; margin: 4px 0 0; }
    .collections-grid { display: grid; grid-template-columns: 1.05fr 1fr; gap: 16px; height: 560px; }
    .collection-tile { border-radius: var(--radius-lg); display: block; overflow: hidden; position: relative; text-decoration: none; }
    .tile-image, .split-image img { height: 100%; object-fit: cover; transition: transform .5s var(--ease-out); width: 100%; }
    .collection-tile:hover .tile-image, .collection-tile:hover .split-image img { transform: scale(1.06); }
    .tile-badge { align-items: center; border-radius: var(--radius-full); display: inline-flex; font-size: 11px; font-weight: 700; gap: 6px; letter-spacing: .04em; padding: 7px 12px; text-transform: uppercase; width: max-content; }
    .tile-badge.forest { background: var(--color-forest); color: #fff; }
    .tile-badge.peach { background: var(--color-accent); color: #fff; }
    .tile-badge.sage { background: var(--color-forest); color: #fff; }
    .tile-cta { align-items: center; display: inline-flex; gap: 8px; transition: gap .25s var(--ease-standard); }
    .tile-cta ui-icon { transition: transform .25s var(--ease-standard); }
    .collection-tile:hover .tile-cta { gap: 12px; }

    /* Hero tile: full-bleed photo, dark scrim, white copy anchored bottom-left. */
    .hero-tile { grid-column: 1; grid-row: 1 / 3; }
    .hero-tile .tile-image { position: absolute; inset: 0; }
    .tile-scrim { background: linear-gradient(0deg, rgba(20, 16, 10, .78) 0%, rgba(20, 16, 10, .15) 55%, rgba(20, 16, 10, 0) 80%); inset: 0; position: absolute; }
    .tile-content { bottom: 0; color: #fff; left: 0; padding: clamp(20px, 3vw, 34px); position: absolute; right: 0; }
    .tile-content h3 { font-size: clamp(24px, 2.6vw, 34px); line-height: 1.12; margin: 14px 0 8px; }
    .tile-content p { color: rgba(255, 255, 255, .82); font-size: 13.5px; line-height: 1.5; margin: 0 0 18px; max-width: 360px; }
    .tile-cta.on-image { background: var(--color-bg); border-radius: var(--radius-sm); color: var(--color-text); font-size: 13px; font-weight: 700; padding: 11px 18px; }
    .hero-tile:hover .tile-cta.on-image ui-icon { transform: translateX(3px); }

    /* Split tiles: tinted copy panel on the left, photo bleeding in on the right. */
    .split-tile { align-items: stretch; display: flex; }
    .split-tile.peach { background: #f7ece0; }
    .split-tile.sage { background: #edf1e7; }
    .split-copy { display: flex; flex: 1 1 55%; flex-direction: column; gap: 10px; justify-content: center; padding: clamp(18px, 2.6vw, 28px); position: relative; z-index: 1; }
    .split-copy h3 { color: var(--color-text); font-size: clamp(19px, 2vw, 24px); line-height: 1.15; margin: 2px 0 0; }
    .split-copy p { color: var(--color-text-secondary); font-size: 12.5px; line-height: 1.5; margin: 0 0 4px; max-width: 220px; }
    .tile-cta.peach { background: var(--color-accent); color: #fff; }
    .tile-cta.sage { background: var(--color-forest); color: #fff; }
    .tile-cta.peach, .tile-cta.sage { border-radius: var(--radius-sm); font-size: 12.5px; font-weight: 700; padding: 10px 16px; width: max-content; }
    .split-image { flex: 1 1 45%; overflow: hidden; position: relative; }
    .split-image::before { background: inherit; content: ''; inset: 0; position: absolute; z-index: 1; }
    .split-tile.peach .split-image::before { background: linear-gradient(90deg, #f7ece0 0%, rgba(247, 236, 224, 0) 45%); }
    .split-tile.sage .split-image::before { background: linear-gradient(90deg, #edf1e7 0%, rgba(237, 241, 231, 0) 45%); }

    .purchase-confidence {
      background: var(--color-bg-alt);
      border: 1px solid var(--color-border);
      border-radius: 18px;
      margin-bottom: 0;
      margin-top: 18px;
      padding: clamp(24px, 3vw, 36px) !important;
    }
    .purchase-copy { margin-bottom: 24px; text-align: center; }
    .purchase-eyebrow { color: var(--color-accent); font-size: 10px; font-weight: 800; letter-spacing: .09em; text-transform: uppercase; }
    .purchase-copy h2 { color: var(--color-text); font-size: clamp(24px, 2vw, 32px); line-height: 1.1; margin: 7px 0 7px; }
    .purchase-copy p { color: var(--color-text-muted); font-size: 13px; line-height: 1.5; margin: 0; }
    .confidence-grid { display: grid; grid-template-columns: repeat(4, 1fr); }
    .confidence-item { align-items: center; border-right: 1px solid var(--color-border); display: flex; gap: 11px; min-width: 0; padding: 3px clamp(12px, 2vw, 26px); }
    .confidence-item:first-child { padding-left: 0; }
    .confidence-item:last-child { border-right: 0; padding-right: 0; }
    .confidence-icon { align-items: center; background: var(--color-accent-soft); border-radius: 50%; color: var(--color-accent); display: flex; flex: 0 0 36px; height: 36px; justify-content: center; }
    .confidence-item strong { color: var(--color-text); display: block; font-size: 12px; }
    .confidence-item small { color: var(--color-text-muted); display: block; font-size: 10px; line-height: 1.35; margin-top: 2px; }

    @media (max-width: 980px) {
      .hero-inner { grid-template-columns: 1fr; }
      .confidence-grid { grid-template-columns: 1fr 1fr; gap: 16px 0; }
      .confidence-item:nth-child(2) { border-right: 0; }
      .confidence-item:nth-child(3) { padding-left: 0; }
      .collections-grid { gap: 12px; grid-template-columns: 1fr 1fr; height: 420px; }
      .tile-content { padding: 18px; }
      .tile-content h3 { margin: 10px 0 6px; }
      .tile-content p { display: none; }
      .split-copy { gap: 8px; padding: 16px; }
      .split-copy p { display: none; }
    }
    @media (max-width: 560px) {
      .section { padding: 14px 16px; }
      .catalog-notice { align-items: flex-start; margin-inline: 16px; padding: 13px; }
      .catalog-notice button { flex: 0 0 auto; }
      .marketplace-explorer { padding-top: 20px; }
      .marketplace-heading { padding-bottom: 13px; }
      .category-shelf { padding: 18px 0 12px; }
      .subcategory-links { margin-inline: -16px; max-width: none; padding-inline: 16px; width: calc(100% + 32px); }
      .stores-marquee { padding-inline: 16px; }
      .store-chip { flex-basis: 250px; max-width: 250px; min-width: 250px; width: 250px; }
      .purchase-confidence { padding: 22px 18px !important; }
      .purchase-copy { margin-bottom: 18px; text-align: left; }
      .confidence-grid { grid-template-columns: 1fr; gap: 0; }
      .confidence-item, .confidence-item:nth-child(3) { border-bottom: 1px solid var(--color-border); border-right: 0; padding: 12px 0; }
      .confidence-item:last-child { border-bottom: 0; }

      /* Collections become a horizontal swipe carousel instead of stacked cards. */
      .collections-head { align-items: center; }
      .collections-grid { display: flex; gap: 12px; grid-template-columns: none; height: auto; overflow-x: auto; padding-bottom: 4px; scroll-padding-left: 16px; scroll-snap-type: x mandatory; scrollbar-width: none; }
      .collections-grid::-webkit-scrollbar { display: none; }
      .hero-tile, .split-tile { flex: 0 0 68%; scroll-snap-align: start; }
      .hero-tile { grid-row: auto; height: 230px; }
      .split-tile { flex-direction: column; height: 230px; }

      /* The 300px marquee chip is more than three-quarters of a phone screen
         width for a single store — shrink it so more than one is ever visible. */
      .store-chip { flex-basis: 210px; max-width: 210px; min-width: 210px; width: 210px; }
      .split-copy, .split-image { flex: 1 1 50%; }
      .split-copy p, .tile-content p { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; }
      .split-tile.peach .split-image::before { background: linear-gradient(0deg, #f7ece0 0%, rgba(247, 236, 224, 0) 35%); }
      .split-tile.sage .split-image::before { background: linear-gradient(0deg, #edf1e7 0%, rgba(237, 241, 231, 0) 35%); }
    }
  `]
})
export class HomeComponent {
  protected readonly catalog = inject(CatalogService);
  private readonly seo = inject(SeoService);

  constructor() {
    this.seo.setDefaultMetadata();
    // Categories arrive asynchronously, so the rail's scroll width is not known
    // at construction. Re-measure once the list lands (after the DOM has caught
    // up), and again whenever the viewport changes how many cards fit.
    effect(() => {
      this.categories();
      setTimeout(() => this.syncRail());
    });

    // The grid's column count comes from auto-fill, so it has to be read back
    // after layout - and again whenever the viewport changes it.
    effect(() => {
      this.discoverProducts();
      setTimeout(() => this.measureColumns());
    });

    const onResize = () => {
      this.syncRail();
      this.measureColumns();
      this.narrowTiles.set(this.narrowQuery?.matches ?? false);
    };
    window.addEventListener('resize', onResize, { passive: true });
    inject(DestroyRef).onDestroy(() => {
      window.removeEventListener('resize', onResize);
      clearInterval(this.clock);
    });
  }



  /** Products genuinely on sale (compareAtPrice above price), biggest discount first. */
  readonly flashDeals = computed(() =>
    this.catalog
      .allProducts()
      .filter((p) => p.status !== 'out-of-stock' && !!p.compareAtPrice && p.compareAtPrice > p.price)
      .sort((a, b) => {
        const aCurated = isCuratedProduct(a);
        const bCurated = isCuratedProduct(b);
        if (aCurated !== bCurated) return aCurated ? -1 : 1;
        return b.compareAtPrice! / b.price - a.compareAtPrice! / a.price;
      })
      .slice(0, 16),
  );

  protected discount(p: Product): number {
    return Math.round((1 - p.price / p.compareAtPrice!) * 100);
  }

  /** Stock bar: fuller when more is left, capped at 50 units. */
  protected stockLeft(p: Product): number {
    return Math.max(8, Math.min(100, (p.stock / 50) * 100));
  }

  /** Phones & Tablets in stock, best-ranked first. */
  readonly phones = computed(() =>
    this.catalog
      .allProducts()
      .filter((p) => p.subcategorySlug === 'phones-tablets' && p.status !== 'out-of-stock')
      .sort((a, b) => this.discoveryScore(b) - this.discoveryScore(a))
      .slice(0, 8),
  );

  readonly trending = computed(() =>
    [...this.catalog.allProducts()]
      .filter((p) => p.status !== 'out-of-stock')
      .sort((a, b) => this.discoveryScore(b) - this.discoveryScore(a))
      .slice(0, 12),
  );

  /** Deals refresh daily; count down to local midnight. */
  private readonly now = signal(Date.now());
  readonly countdown = computed(() => {
    const now = new Date(this.now());
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const left = Math.max(0, Math.floor((midnight.getTime() - now.getTime()) / 1000));
    const pad = (n: number) => String(n).padStart(2, '0');
    return { h: pad(Math.floor(left / 3600)), m: pad(Math.floor((left % 3600) / 60)), s: pad(left % 60) };
  });
  private readonly clock = setInterval(() => this.now.set(Date.now()), 1000);

  /** UI only for now — there is no newsletter endpoint in the Rentify APIs yet. */
  readonly subscribed = signal(false);
  protected subscribe(event: Event, email: string): void {
    event.preventDefault();
    if (email.trim()) this.subscribed.set(true);
  }



  // Keep the home tiles in the same canonical order as the navigation menu.
  readonly categories = computed(() => this.catalog.categories);
  readonly stores = computed(() => {
    const all = this.catalog.allStores();
    const curated = all.filter((s) => isCuratedStore(s));
    return curated.length > 0 ? curated : all;
  });

  /**
   * One poster per category that actually has real inventory — real product
   * and store counts, never an invented "up to 50% off". `hasDeal` is true
   * only when at least one product in that category genuinely has a
   * compareAtPrice above its price (the same "on sale" test the products
   * page filter uses), so a poster can honestly badge itself as having a
   * live deal without ever claiming one that doesn't exist.
   */
  readonly dealCategories = computed(() => {
    const products = this.catalog.allProducts();
    return this.categories()
      .map((category) => {
        const inCategory = products.filter((product) => product.categorySlug === category.slug);
        const hasDeal = inCategory.some(
          (product) => product.compareAtPrice !== undefined && product.compareAtPrice > product.price,
        );
        const storeCount = new Set(inCategory.map((product) => product.storeId)).size;
        return { category, productCount: inCategory.length, storeCount, hasDeal };
      })
      .filter((entry) => entry.productCount > 0)
      .sort((a, b) => b.productCount - a.productCount);
  });

  private readonly categoryIllustrations = new Set([
    'food-groceries', 'home-living', 'arts-culture', 'fashion',
    'beauty-wellness', 'electronics', 'kids-family',
    // Generated shortcut artwork uses the same transparent PNGs as category tiles.
    'stores', 'gifts', 'discount',
  ]);
  private readonly failedCategoryIllustrations = signal<ReadonlySet<string>>(new Set());

  /**
   * The designed promo poster for a category, used as the Best deals card
   * artwork. Six of the seven exist; Arts & Culture has none yet and keeps the
   * flat colour treatment, which is also what shows while a poster loads.
   */
  private readonly DEAL_POSTERS = new Set([
    'fashion',
    'food-groceries',
    'home-living',
    'beauty-wellness',
    'electronics',
    'kids-family',
  ]);

  protected dealPoster(slug: string): string | null {
    return this.DEAL_POSTERS.has(slug) ? `/categories/posters/${slug}.webp` : null;
  }

  /**
   * Short label on phones, where a tile is ~137px wide and the full name
   * either wraps to two lines or gets clipped mid-word. Matches the category
   * nav row, which does the same thing at its own breakpoint.
   */
  private readonly narrowQuery = globalThis.matchMedia?.('(max-width: 980px)');
  protected readonly narrowTiles = signal(this.narrowQuery?.matches ?? false);

  /** Bar shortcuts the category menu drops on phones (see category-menu). */
  protected readonly mobileShortcuts = [
    { key: 'stores', label: 'nav.stores', icon: 'store', link: '/stores', params: {} },
    { key: 'gifts', label: 'nav.gifts', icon: 'gift', link: '/categories/arts-culture', params: { sub: 'souvenirs-gifts' } },
    { key: 'discount', label: 'catMenu.discount', icon: 'percent', link: '/products', params: { sale: '1' } },
  ];

  protected categoryPosterImage(slug: string): string | null {
    return this.categoryIllustrations.has(slug) && !this.failedCategoryIllustrations().has(slug)
      ? `/categories/${slug}.png`
      : null;
  }

  protected categoryPosterFailed(slug: string): void {
    this.failedCategoryIllustrations.update(slugs => new Set([...slugs, slug]));
  }
  // ---------------------------------------------------------------- category rail
  private readonly railEl = viewChild<ElementRef<HTMLElement>>('catRail');

  /** Whether content is scrolled off each edge, so the fades only show when
   *  there is actually more to reach. */
  protected readonly railMoreLeft = signal(false);
  protected readonly railMoreRight = signal(false);

  protected onRailScroll(): void {
    this.syncRail();
  }

  private syncRail(): void {
    const el = this.railEl()?.nativeElement;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    this.railMoreLeft.set(el.scrollLeft > 4);
    this.railMoreRight.set(max > 4 && el.scrollLeft < max - 4);
  }


  // Computed, not plain fields: the catalog arrives from the API after this
  // component is constructed, so a snapshot taken here would stay empty.
  // Rails scroll horizontally, so they take more than a grid row would.
  // ------------------------------------------------------------- discover
  // One section in place of separate Best sellers / New arrivals rails: the
  // whole catalogue, filtered by department and then sub-category, ranked by
  // the same discovery score the shelves use.
  readonly discoverCategory = signal<string>('all');
  readonly discoverSubcategory = signal<string>('all');

  protected selectDiscoverCategory(slug: string): void {
    this.discoverCategory.set(slug);
    this.discoverSubcategory.set('all');
    this.discoverRows.set(6);
  }

  /** Departments present in live inventory, fullest first. */
  readonly discoverCategories = computed(() => {
    const counts = new Map<string, { slug: string; name: string; count: number }>();
    for (const product of this.catalog.allProducts()) {
      if (!product.categorySlug) continue;
      const entry = counts.get(product.categorySlug) ?? {
        slug: product.categorySlug,
        name: product.categoryName,
        count: 0,
      };
      entry.count += 1;
      counts.set(product.categorySlug, entry);
    }
    return [...counts.values()].sort((a, b) => b.count - a.count);
  });

  readonly discoverCategoryName = computed(
    () =>
      this.discoverCategories().find((c) => c.slug === this.discoverCategory())
        ?.name ?? 'all',
  );

  /** Sub-categories inside the selected department; empty while showing all. */
  readonly discoverSubcategories = computed(() => {
    const slug = this.discoverCategory();
    if (slug === 'all') return [];
    const counts = new Map<string, number>();
    for (const product of this.catalog.allProducts()) {
      if (product.categorySlug !== slug || !product.subcategory) continue;
      counts.set(product.subcategory, (counts.get(product.subcategory) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  });

  readonly discoverStoreCount = computed(
    () =>
      new Set(
        this.catalog
          .allProducts()
          .map((product) => product.sellerName)
          .filter(Boolean),
      ).size,
  );

  /** Everything matching the current filters, ranked - before the row cap. */
  private readonly discoverMatches = computed(() => {
    const category = this.discoverCategory();
    const subcategory = this.discoverSubcategory();
    return this.catalog
      .allProducts()
      .filter((product) => category === 'all' || product.categorySlug === category)
      .filter(
        (product) => subcategory === 'all' || product.subcategory === subcategory,
      )
      .sort((a, b) => this.discoveryScore(b) - this.discoveryScore(a));
  });

  /**
   * How many cards the grid actually fits per row, measured from the rendered
   * grid rather than guessed from a breakpoint - the track count comes from
   * auto-fill, so only the browser knows it.
   */
  private readonly discoverGrid = viewChild<ElementRef<HTMLElement>>('discoverGrid');
  readonly discoverColumns = signal(4);
  readonly discoverRows = signal(6);

  protected showMoreRows(): void {
    this.discoverRows.update((rows) => rows + 3);
  }

  private measureColumns(): void {
    const el = this.discoverGrid()?.nativeElement;
    if (!el) return;
    const tracks = getComputedStyle(el).gridTemplateColumns;
    const count = tracks && tracks !== 'none' ? tracks.split(' ').length : 1;
    if (count > 0 && count !== this.discoverColumns()) {
      this.discoverColumns.set(count);
    }
  }

  /**
   * Only ever whole rows. A trailing row holding two cards next to four gaps
   * reads as a rendering fault, so the count is rounded down to a multiple of
   * the column count; the remainder lives behind the full-catalogue link.
   */
  readonly discoverProducts = computed(() => {
    const matches = this.discoverMatches();
    const perRow = this.discoverColumns();
    if (matches.length <= perRow) return matches;
    const wanted = Math.min(perRow * this.discoverRows(), matches.length);
    const wholeRows = Math.floor(wanted / perRow) * perRow;
    return matches.slice(0, Math.max(perRow, wholeRows));
  });

  readonly discoverHasMore = computed(
    () => this.discoverProducts().length < this.discoverMatches().length,
  );

  /** The full-catalogue link carries whatever the shopper has already narrowed to. */
  readonly discoverLinkParams = computed(() => {
    const params: Record<string, string> = {};
    if (this.discoverCategory() !== 'all') params['category'] = this.discoverCategory();
    if (this.discoverSubcategory() !== 'all') {
      params['subcategory'] = this.discoverSubcategory();
    }
    return params;
  });

  readonly discoverLinkLabel = computed(() => {
    const total = this.discoverMatches().length;
    if (this.discoverSubcategory() !== 'all') {
      return `See all ${total} in ${this.discoverSubcategory()}`;
    }
    if (this.discoverCategory() !== 'all') {
      return `See all ${total} in ${this.discoverCategoryName()}`;
    }
    return `Open the full catalogue - ${total} products from ${this.discoverStoreCount()} stores`;
  });
  readonly fashionEdit = computed(() => {
    const fashionTerms = /fashion|clothing|scarf|krama|wear|jewelry|accessor|bag|hairpin|earring|necklace|bracelet|wallet|belt|shoe/i;
    // Matching on copy alone put a corn snack in here, because its description
    // mentioned a sharing "bag". Edible departments can never be fashion, so
    // they are excluded before the keywords run; the keywords still catch
    // genuinely wearable pieces filed under crafts, like a krama from Weaving.
    const edibleDepartments = new Set([
      'food-groceries',
      'food-drink',
      'dried-fruits',
      'local-food',
      'palm-sugar',
      'rice-products',
    ]);
    return this.catalog
      .allProducts()
      .filter((product) => !edibleDepartments.has(product.categorySlug))
      .filter((product) =>
        product.categorySlug === 'fashion-accessories' ||
        fashionTerms.test(
          [
            product.name,
            product.categoryName,
            product.subcategory ?? '',
            product.description,
          ].join(' '),
        ),
      )
      .sort((a, b) => this.discoveryScore(b) - this.discoveryScore(a))
      .slice(0, 8);
  });

  /** Every department stays discoverable, in navigation order, with live products where available. */
  readonly categoryShelves = computed<CategoryShelf[]>(() => {
    const products = this.catalog.allProducts();
    return this.categories()
      .map((category) => {
        const categoryProducts = products.filter(
          (product) => product.categorySlug === category.slug,
        );
        const rankedProducts = [...categoryProducts]
          .sort((a, b) => this.discoveryScore(b) - this.discoveryScore(a))
          .slice(0, 10);
        const subcategories = category.subcategories
          .map((subcategory) => ({
            ...subcategory,
            count: categoryProducts.filter(
              (product) => product.subcategorySlug === subcategory.slug,
            ).length,
          }))
          .filter((subcategory) => subcategory.count > 0)
          .sort((a, b) => b.count - a.count)
          .slice(0, 6);

        return {
          slug: category.slug,
          name: category.name,
          description: category.description,
          products: rankedProducts,
          subcategories,
        };
      });
  });

  readonly heroCollection = {
    eyebrow: 'Local pride',
    icon: 'leaf',
    title: 'Made in Cambodia',
    description: 'Support local makers and bring authentic craftsmanship home.',
    cta: 'Explore collection',
    image:
      'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=1200&q=80',
    alt: 'Handwoven basket, ceramics, and woodcarving on a wooden table',
    params: { collection: 'handmade-crafts' },
  };

  readonly sideCollections = [
    {
      tint: 'peach',
      eyebrow: 'Great gifts',
      icon: 'gift',
      title: 'Gifts under $20',
      description: "Thoughtful finds that won't break the bank.",
      cta: 'Shop gifts',
      image:
        'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=900&q=80',
      alt: 'Wrapped gift box with ribbon',
      // 'gifts under 20' as an exact phrase matches nothing — search() does a
      // literal substring match, not fuzzy/OR — so this card would otherwise
      // land on an empty results page. 'gift' actually matches real, affordably
      // priced listings (e.g. the $14.40 Cambodian Keepsake Gift Set).
      params: { search: 'gift' },
    },
    {
      tint: 'sage',
      eyebrow: 'Just in',
      icon: 'sparkles',
      title: 'New this week',
      description: 'Fresh arrivals from our talented sellers.',
      cta: 'Discover now',
      image:
        'https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=900&q=80',
      alt: 'Freshly arrived handmade ceramics',
      params: { sort: 'newest' },
    },
  ];

  readonly promoSlots = PROMO_SLOTS;

  initials(name: string): string {
    return name
      .split(' ')
      .slice(0, 2)
      .map((word) => word[0])
      .join('')
      .toUpperCase();
  }

  /**
   * Seed for the rotation term below. Held for the browsing session rather
   * than regenerated per render, so the shelves do not reshuffle underneath
   * someone who is reading them, and not shared across visitors, so two
   * shoppers browsing at the same moment see different products surfaced.
   */
  private readonly rotationSeed = ((): number => {
    const KEY = 'kc-rotation-seed';
    try {
      const stored = sessionStorage.getItem(KEY);
      if (stored) return Number(stored);
      const fresh = Math.floor(Math.random() * 2 ** 31);
      sessionStorage.setItem(KEY, String(fresh));
      return fresh;
    } catch {
      // Private window, blocked storage, or server-side render.
      return Math.floor(Math.random() * 2 ** 31);
    }
  })();

  /** Deterministic 0..1 from a product id, so one render orders consistently. */
  private rotationValue(id: string): number {
    let hash = this.rotationSeed;
    for (let index = 0; index < id.length; index += 1) {
      hash = Math.imul(hash ^ id.charCodeAt(index), 2_654_435_761) >>> 0;
    }
    return hash / 2 ** 32;
  }

  /**
   * Ranking for every showcase shelf.
   *
   * The rotation term exists because a young marketplace has almost no
   * ranking signal: of 156 products, 3 have a sale and none have a review, and
   * 128 were listed the same day — so sales, reviews and freshness were all
   * identical and a stable sort left the order frozen. The same handful sat at
   * the top of every shelf on every visit and nothing further down was ever
   * seen, which for a seller means their listing is invisible through no fault
   * of their own.
   *
   * Weighted at 60 deliberately: larger than freshness (12) so it decides the
   * order while everything is tied, smaller than sales (up to 400) so a
   * product that genuinely sells is never shuffled off the shelf. As real
   * sales and reviews arrive, the earned signals take over on their own.
   */
  private discoveryScore(product: Product): number {
    const isCurated = isCuratedProduct(product);
    // Prioritize products from user-created stores with real images; external image URL products are sent to the back
    const curatedBoost = isCurated ? 2000 : 0;
    const orderable = product.status === 'out-of-stock' ? -1000 : 100;
    const sales = Math.min(product.soldCount, 500) * 0.8;
    const reviewConfidence = product.reviewCount > 0
      ? product.rating * 12 + Math.min(product.reviewCount, 100) * 0.25
      : 0;
    const ageInDays = Math.max(
      0,
      (Date.now() - new Date(product.createdAt).getTime()) / 86_400_000,
    );
    // 0.15, not 0.4: at 0.4 a listing more than a few weeks old carried a
    // ~9 point handicap against the same-day bulk of the catalogue, which is
    // wider than the rotation headroom at the top-of-shelf cutoff — so it
    // could never appear, no matter how many visitors came. Measured across
    // 500 simulated visitors, 0.4 left one product permanently invisible and
    // 0.15 reaches every one of them.
    const freshness = Math.max(0, 30 - ageInDays) * 0.15;
    const rotation = this.rotationValue(product.id) * 60;
    return curatedBoost + orderable + sales + reviewConfidence + freshness + rotation;
  }


  purchaseReasons = [
    { icon: 'store', title: 'Local-first marketplace', desc: 'Discover Cambodian stores across many categories.' },
    { icon: 'shield', title: 'Clear order records', desc: 'Your confirmed purchases stay available in My Orders.' },
    { icon: 'package', title: 'Seller-grouped orders', desc: 'See which store is responsible for every item.' },
    { icon: 'info', title: 'Marketplace support', desc: 'Get help when an order needs attention.' }
  ];

}
