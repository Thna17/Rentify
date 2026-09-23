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
import { HeroSliderComponent } from '../components/user/home/hero-slider/hero-slider.component';
import { ProductCardComponent } from '../components/user/catalog/product-card/product-card.component';
import { Category, Product } from '../core/catalog/catalog.models';

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
  imports: [CommonModule, RouterLink, NavbarComponent, FooterComponent, IconComponent, ProductRailComponent, ProductCardComponent, HeroSliderComponent],
  template: `
  <app-navbar></app-navbar>

  <app-hero-slider />

  @if (catalog.productError()) {
    <section class="container catalog-notice" role="alert">
      <ui-icon name="alert-circle" [size]="18" />
      <div>
        <strong>Products are temporarily unavailable</strong>
        <span>{{ catalog.productError() }}</span>
      </div>
      <button type="button" class="btn btn-outline btn-sm" (click)="catalog.load()">
        Try again
      </button>
    </section>
  }

  <section class="container section category-section">
    <div class="section-head">
      <h2>Browse by category</h2>
      <a routerLink="/categories" class="see-all">View all <ui-icon name="arrow-right" [size]="14"></ui-icon></a>
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
            [attr.aria-label]="c.name"
          >
            <span class="cat-visual">
              <span class="cat-copy">
                <span class="cat-name">{{ categoryLabel(c) }}</span>
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
          </a>
        }
      </div>
    </div>
  </section>

  <section class="container section" aria-label="Seller offers">
    @if (dealCategories().length) {
      <div class="section-head">
        <h2>Best deals</h2>
        <a routerLink="/products" [queryParams]="{ sale: '1' }" class="see-all">Shop all deals <ui-icon name="arrow-right" [size]="14"></ui-icon></a>
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
                  <span class="deal-badge">On sale</span>
                }
              </div>
              @if (!dealPoster(deal.category.slug)) {
                <span class="deal-name">{{ deal.category.name }}</span>
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
        <div><strong>Explore seller offers</strong><p>Discover special offers from local sellers.</p></div>
        <a class="see-all" routerLink="/products" [queryParams]="{ sale: '1' }">Shop deals <ui-icon name="arrow-right" [size]="14" /></a>
      </div>
    }
  </section>

  <section class="container section discover">
    <header class="discover-head">
      <h2>The whole marketplace</h2>
      <p>{{ catalog.allProducts().length }} products from {{ discoverStoreCount() }} Cambodian sellers</p>
    </header>

    <div class="discover-filters" role="group" aria-label="Filter by department">
      <button
        type="button"
        class="chip"
        [class.active]="discoverCategory() === 'all'"
        (click)="selectDiscoverCategory('all')"
      >All <span>{{ catalog.allProducts().length }}</span></button>
      @for (c of discoverCategories(); track c.slug) {
        <button
          type="button"
          class="chip"
          [class.active]="discoverCategory() === c.slug"
          (click)="selectDiscoverCategory(c.slug)"
        >{{ c.name }} <span>{{ c.count }}</span></button>
      }
    </div>

    @if (discoverSubcategories().length) {
      <div class="discover-filters subs" role="group" aria-label="Filter by sub-category">
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
      <div class="discover-grid" #discoverGrid>
        @for (product of discoverProducts(); track product.id) {
          <app-product-card [product]="product" />
        }
      </div>
      <div class="discover-more">
        @if (discoverHasMore()) {
          <button class="more-btn" type="button" (click)="showMoreRows()">
            Show more <ui-icon name="arrow-right" [size]="14" />
          </button>
        }
        <a class="more-hint" routerLink="/products" [queryParams]="discoverLinkParams()">
          {{ discoverLinkLabel() }}
        </a>
      </div>
    } @else {
      <p class="discover-empty">Nothing in this department yet.</p>
    }
  </section>

  <section class="container section">
    <div class="section-head"><h2>Popular stores</h2><a routerLink="/stores" class="see-all">View all <ui-icon name="arrow-right" [size]="14"></ui-icon></a></div>
    <div class="stores-marquee" role="region" aria-label="Popular stores">
      <div class="stores-track">
        @for (group of [0, 1]; track group) {
          <div class="stores-row" [attr.aria-hidden]="group === 1 ? 'true' : null">
            @for (s of stores(); track s.id) {
              <a class="store-chip" [routerLink]="['/stores', s.id]" [attr.tabindex]="group === 1 ? -1 : null">
                @if (s.logoUrl) {
                  <img class="store-logo" [src]="s.logoUrl" [alt]="s.name + ' logo'" loading="lazy" />
                } @else {
                  <div class="store-logo img-placeholder">{{ initials(s.name) }}</div>
                }
                <div class="store-info">
                  <strong>{{ s.name }}</strong>
                  <div class="rating-row">
                    @if (s.reviewCount > 0) {
                      <ui-icon name="star" [size]="12" [filled]="true" color="var(--color-gold)"></ui-icon> {{ s.rating }} ·
                    } @else {
                      New store ·
                    }
                    {{ s.location }}
                  </div>
                </div>
              </a>
            }
          </div>
        }
      </div>
    </div>
  </section>

  @if (fashionEdit().length) {
    <section class="container section fashion-edit">
      <app-product-rail
        title="Fashion & Accessories"
        [products]="fashionEdit()"
        variant="editorial"
        linkRoute="/products"
        linkLabel="Explore products"
      />
    </section>
  }

  @if (categoryShelves().length) {
    <section class="container section marketplace-explorer">
      <div class="marketplace-heading">
        <span class="marketplace-eyebrow">More ways to shop</span>
        <h2>Explore the marketplace</h2>
      </div>

      @for (shelf of categoryShelves(); track shelf.slug) {
        <div class="category-shelf">
          <div class="shelf-context">
            @if (shelf.subcategories.length) {
              <nav class="subcategory-links" [attr.aria-label]="shelf.name + ' subcategories'">
                @for (subcategory of shelf.subcategories; track subcategory.slug) {
                  <a
                    routerLink="/products"
                    [queryParams]="{ category: shelf.slug, subcategory: subcategory.slug }"
                  >
                    {{ subcategory.name }} <small>{{ subcategory.count }}</small>
                  </a>
                }
              </nav>
            }
          </div>
          @if (shelf.products.length) {
          <app-product-rail
            [title]="shelf.name"
            [products]="shelf.products"
            linkRoute="/products"
            [linkParams]="{ category: shelf.slug }"
            linkLabel="Shop department"
          />
          } @else {
            <a class="department-preview" [routerLink]="['/categories', shelf.slug]">
              <div class="department-preview-copy">
                <h3>{{ shelf.name }}</h3>
                <p>{{ shelf.description }}</p>
                <span class="department-preview-cta">Explore department <ui-icon name="arrow-right" [size]="16" /></span>
              </div>
              @if (categoryPosterImage(shelf.slug); as image) {
                <img [src]="image" alt="" loading="lazy" (error)="categoryPosterFailed(shelf.slug)" />
              }
            </a>
          }
        </div>
      }
    </section>
  }

  <section class="container section collections-section">
    <div class="section-head collections-head">
      <div>
        <h2>Shop curated collections</h2>
        <p class="collections-subtitle">Handpicked selections to help you discover the best of Cambodia.</p>
      </div>
      <a routerLink="/categories" class="see-all">View all collections <ui-icon name="arrow-right" [size]="14"></ui-icon></a>
    </div>

    <div class="collections-grid">
      <a class="collection-tile hero-tile" routerLink="/products" [queryParams]="heroCollection.params">
        <img class="tile-image" [src]="heroCollection.image" [alt]="heroCollection.alt" loading="lazy" />
        <div class="tile-scrim"></div>
        <div class="tile-content">
          <span class="tile-badge forest"><ui-icon [name]="heroCollection.icon" [size]="12"></ui-icon> {{ heroCollection.eyebrow }}</span>
          <h3>{{ heroCollection.title }}</h3>
          <p>{{ heroCollection.description }}</p>
          <span class="tile-cta on-image">{{ heroCollection.cta }} <ui-icon name="arrow-right" [size]="14"></ui-icon></span>
        </div>
      </a>

      @for (c of sideCollections; track c.title) {
        <a class="collection-tile split-tile" [class]="c.tint" routerLink="/products" [queryParams]="c.params">
          <div class="split-copy">
            <span class="tile-badge" [class]="c.tint"><ui-icon [name]="c.icon" [size]="12"></ui-icon> {{ c.eyebrow }}</span>
            <h3>{{ c.title }}</h3>
            <p>{{ c.description }}</p>
            <span class="tile-cta" [class]="c.tint">{{ c.cta }} <ui-icon name="arrow-right" [size]="14"></ui-icon></span>
          </div>
          <div class="split-image">
            <img [src]="c.image" [alt]="c.alt" loading="lazy" />
          </div>
        </a>
      }
    </div>
  </section>

  <section class="container section purchase-confidence">
    <div class="purchase-copy">
      <span class="purchase-eyebrow">Shopping made simple</span>
      <h2>Why shop with KhmerCraft?</h2>
      <p>Local products, trusted checkout and delivery updates in one place.</p>
    </div>
    <div class="confidence-grid">
      <div class="confidence-item" *ngFor="let reason of purchaseReasons">
        <div class="confidence-icon"><ui-icon [name]="reason.icon" [size]="19" [strokeWidth]="1.7"></ui-icon></div>
        <div><strong>{{ reason.title }}</strong><small>{{ reason.desc }}</small></div>
      </div>
    </div>
  </section>

  <app-footer></app-footer>
  `,
  styles: [`
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

    .discover-filters {
      display: flex;
      flex-wrap: wrap;
      gap: 9px;
      margin-top: 26px;
    }
    .discover-filters.subs { margin-top: 12px; }
    .discover-filters .chip {
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
      gap: 18px;
      grid-template-columns: repeat(auto-fill, minmax(212px, 1fr));
      margin-top: 28px;
    }
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

    @media (max-width: 640px) {
      /* 74% meant one and a half tiles filled the screen, so the row read as a
         single huge banner and nothing suggested there were seven of them.
         At 40% two and a half are visible and the row is obviously scrollable. */
      .category-poster { flex: 0 0 40%; }
      .cat-name { font-size: 12.5px; }
    }

    .category-poster[data-category="food-groceries"] .cat-visual { background: linear-gradient(115deg, #e8f3e2, #c7e3ba); }
    .category-poster[data-category="home-living"] .cat-visual { background: linear-gradient(115deg, #faf0dd, #eed8b2); }
    .category-poster[data-category="arts-culture"] .cat-visual { background: linear-gradient(115deg, #fff4d9, #ffdf9e); }
    .category-poster[data-category="fashion"] .cat-visual { background: linear-gradient(115deg, #ffeae0, #ffcab1); }
    .category-poster[data-category="beauty-wellness"] .cat-visual { background: linear-gradient(115deg, #fdeaef, #f9c0d0); }
    .category-poster[data-category="electronics"] .cat-visual { background: linear-gradient(115deg, #e9f1fa, #c3daf0); }
    .category-poster[data-category="kids-family"] .cat-visual { background: linear-gradient(115deg, #f1ebfa, #d6c5ef); }
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
    .deal-name {
      font-family: 'Anton', var(--font-heading), sans-serif; font-weight: 400;
      font-size: 17px; line-height: 1.05; letter-spacing: .01em; text-transform: uppercase;
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

  constructor() {
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
    inject(DestroyRef).onDestroy(() => window.removeEventListener('resize', onResize));
  }

  // Keep the home tiles in the same canonical order as the navigation menu.
  readonly categories = computed(() => this.catalog.categories);
  readonly stores = computed(() => this.catalog.allStores());

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
  private readonly narrowQuery = globalThis.matchMedia?.('(max-width: 640px)');
  protected readonly narrowTiles = signal(this.narrowQuery?.matches ?? false);

  protected categoryLabel(category: Category): string {
    return this.narrowTiles() ? category.shortName ?? category.name : category.name;
  }

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
    this.discoverRows.set(4);
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
  readonly discoverRows = signal(4);

  protected showMoreRows(): void {
    this.discoverRows.update((rows) => rows + 2);
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
    return orderable + sales + reviewConfidence + freshness + rotation;
  }


  purchaseReasons = [
    { icon: 'store', title: 'Local-first marketplace', desc: 'Discover Cambodian stores across many categories.' },
    { icon: 'shield', title: 'Clear order records', desc: 'Your confirmed purchases stay available in My Orders.' },
    { icon: 'package', title: 'Seller-grouped orders', desc: 'See which store is responsible for every item.' },
    { icon: 'info', title: 'Marketplace support', desc: 'Get help when an order needs attention.' }
  ];

}
