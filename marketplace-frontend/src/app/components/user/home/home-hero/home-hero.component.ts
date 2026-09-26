import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CatalogService } from '../../../../core/catalog/catalog.service';
import { Category } from '../../../../core/catalog/catalog.models';
import { IconComponent } from '../../../shared/ui/icon/icon.component';
import { PromoCardComponent } from '../../../shared/ui/promo-card/promo-card.component';
import { PROMO_SLOTS } from '../../../../core/promos/promos.data';

const OPEN_DELAY_MS = 60;
const CLOSE_DELAY_MS = 180;
const SLIDE_MS = 6000;


/**
 * Homepage hero: vertical category sidebar with a hover mega-menu, a rotating
 * main banner and stacked promo cards. The sidebar is desktop-only; below
 * 1024px the navbar's category row and menu drawer take over.
 */
@Component({
  selector: 'app-home-hero',
  imports: [RouterLink, IconComponent, PromoCardComponent],
  template: `
    <section class="container hero-grid">
      <aside class="cat-side" (mouseleave)="scheduleClose()" aria-label="All categories">
        <a class="cat-head" routerLink="/categories">
          <ui-icon name="grid" [size]="16" /> All Categories
          <ui-icon class="chev" name="chevron-right" [size]="14" />
        </a>
        <nav class="cat-list">
          @for (c of categories; track c.slug) {
            <a
              class="cat-row"
              [class.on]="openSlug() === c.slug"
              [routerLink]="['/categories', c.slug]"
              (mouseenter)="scheduleOpen(c.slug)"
              (focus)="openSlug.set(c.slug)"
              [attr.aria-expanded]="openSlug() === c.slug"
            >
              <ui-icon [name]="c.icon" [size]="17" [strokeWidth]="1.6" />
              <span>{{ c.name }}</span>
              @if (c.subcategories.length) {
                <ui-icon class="chev" name="chevron-right" [size]="13" />
              }
            </a>
          }
          <a class="cat-row more" routerLink="/categories">
            <ui-icon name="list" [size]="17" /> <span>View more</span>
          </a>
        </nav>

        <div class="mega" [class.open]="!!active()" (mouseenter)="cancelClose()">
          @if (active(); as cat) {
            <div class="mega-cols">
              <div class="mega-links">
                <a class="mega-title" [routerLink]="['/categories', cat.slug]">
                  {{ cat.name }} <ui-icon name="arrow-right" [size]="14" />
                </a>
                <p class="mega-desc">{{ cat.description }}</p>
                <div class="mega-grid">
                  @for (sub of cat.subcategories; track sub.slug) {
                    <a
                      routerLink="/products"
                      [queryParams]="{ category: cat.slug, subcategory: sub.slug }"
                      (click)="close()"
                    >{{ sub.name }}</a>
                  }
                </div>
              </div>
              <aside class="mega-feature">
                <img [src]="'/categories/' + cat.slug + '.png'" alt="" loading="lazy" />
                <h3>{{ cat.name }}</h3>
                <p>{{ cat.tagline }}</p>
                <a class="mega-feature-cta" [routerLink]="['/categories', cat.slug]" (click)="close()">
                  Shop now <ui-icon name="arrow-right" [size]="14" />
                </a>
              </aside>
            </div>
          }
        </div>
      </aside>

      <div class="banner">
        @for (s of slides; track s.title; let i = $index) {
          <a
            class="slide"
            [class.active]="slide() === i"
            [attr.aria-hidden]="slide() !== i"
            [attr.tabindex]="slide() === i ? null : -1"
            routerLink="/products"
            [queryParams]="s.params"
          >
            <img [src]="s.image" [alt]="s.alt" [attr.loading]="i === 0 ? 'eager' : 'lazy'" />
            <span class="slide-copy">
              <small>{{ s.eyebrow }}</small>
              <strong>{{ s.title }} <span>{{ s.accent }}</span></strong>
              <p>{{ s.text }}</p>
              <em class="slide-cta">{{ s.cta }} <ui-icon name="arrow-right" [size]="15" /></em>
            </span>
          </a>
        }
        <div class="dots" role="tablist">
          @for (s of slides; track s.title; let i = $index) {
            <button
              type="button"
              [class.on]="slide() === i"
              [attr.aria-label]="'Show slide ' + (i + 1)"
              (click)="goTo(i)"
            ></button>
          }
        </div>
      </div>

      <div class="promos">
        @for (p of visiblePromos(); track p.id) {
          <app-promo-card [promo]="p" format="compact" />
        }
      </div>
    </section>
  `,
  styles: [`
    :host { display: block; }
    .hero-grid {
      display: grid;
      grid-template-columns: 236px minmax(0, 1fr) 300px;
      gap: 16px;
      padding-top: 20px;
      align-items: stretch;
    }

    /* ---------- sidebar + mega menu */
    .cat-side {
      position: relative;
      background: var(--color-surface-raised);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: 8px;
      z-index: 20;
    }
    .cat-head {
      display: flex; align-items: center; gap: 10px;
      background: var(--color-text); color: #fff;
      border-radius: 12px; padding: 11px 14px;
      font-size: 13.5px; font-weight: 600; text-decoration: none;
      margin-bottom: 4px;
    }
    .chev { margin-left: auto; opacity: .55; }
    .cat-list { display: flex; flex-direction: column; }
    .cat-row {
      display: flex; align-items: center; gap: 11px;
      padding: 8.5px 12px; border-radius: 10px;
      font-size: 13.5px; color: var(--color-text-secondary); text-decoration: none;
      transition: background 180ms var(--ease-standard), color 180ms var(--ease-standard);
    }
    .cat-row span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .cat-row:hover, .cat-row.on, .cat-row:focus-visible {
      background: var(--color-accent-soft); color: var(--color-accent);
    }
    .cat-row.more { color: var(--color-muted); }

    .mega {
      position: absolute; top: 0; left: calc(100% + 10px);
      width: min(720px, calc(100vw - 320px)); min-height: 100%;
      background: var(--color-surface-raised);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-lg);
      padding: 24px;
      display: flex; flex-direction: column;
      opacity: 0; visibility: hidden; transform: translateX(-6px);
      transition: opacity 180ms var(--ease-standard), transform 180ms var(--ease-standard), visibility 0s 180ms;
    }
    /* Bridges the 10px gap so the pointer can travel into the panel. */
    .mega::before { content: ''; position: absolute; left: -12px; top: 0; bottom: 0; width: 12px; }
    .mega.open {
      opacity: 1; visibility: visible; transform: none;
      transition: opacity 180ms var(--ease-standard), transform 180ms var(--ease-standard);
    }
    .mega-cols { flex: 1; display: grid; grid-template-columns: 1fr 220px; gap: 24px; height: 100%; }
    .mega-title {
      display: inline-flex; align-items: center; gap: 6px;
      font-size: 17px; font-weight: 700; color: var(--color-text); text-decoration: none;
    }
    .mega-desc { margin: 6px 0 16px; font-size: 13px; color: var(--color-muted); }
    .mega-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 2px 16px; }
    .mega-grid a {
      padding: 7px 10px; margin-left: -10px; border-radius: 8px;
      font-size: 13.5px; color: var(--color-text-secondary); text-decoration: none;
    }
    .mega-grid a:hover { background: var(--color-bg-alt); color: var(--color-accent); }
    /* Portrait category card, same content as the navbar panel's promo:
       illustration, name, tagline and a shop link. */
    .mega-feature {
      display: flex; flex-direction: column; align-items: flex-start;
      min-height: 320px; padding: 20px; border-radius: 16px; overflow: hidden;
      background: linear-gradient(180deg, var(--color-bg-alt), #eef0ff);
    }
    .mega-feature img {
      width: 100%; flex: 1 1 0; min-height: 0; object-fit: contain; object-position: center;
      margin-bottom: 14px;
    }
    .mega-feature h3 { margin: 0; font-size: 17px; font-weight: 700; color: var(--color-text); }
    .mega-feature p { margin: 6px 0 14px; font-size: 12.5px; line-height: 1.45; color: var(--color-text-secondary); }
    .mega-feature-cta {
      display: inline-flex; align-items: center; gap: 6px; padding: 9px 16px; border-radius: 999px;
      background: var(--color-text); color: #fff; font-size: 13px; font-weight: 600; text-decoration: none;
      transition: background 180ms var(--ease-standard);
    }
    .mega-feature-cta:hover { background: var(--color-accent); }

    /* ---------- main banner */
    .banner {
      position: relative; border-radius: var(--radius-lg); overflow: hidden;
      min-height: 420px; background: #e9edf7;
    }
    .slide {
      position: absolute; inset: 0; display: block; text-decoration: none;
      opacity: 0; transition: opacity 600ms var(--ease-standard);
    }
    .slide.active { opacity: 1; z-index: 1; }
    .slide img { width: 100%; height: 100%; object-fit: cover; }
    .slide::after {
      content: ''; position: absolute; inset: 0;
      background: linear-gradient(90deg, rgba(248, 250, 255, .94) 0%, rgba(248, 250, 255, .7) 38%, transparent 66%);
    }
    .slide-copy {
      position: absolute; z-index: 1; left: 44px; top: 50%; transform: translateY(-50%);
      max-width: 420px; display: flex; flex-direction: column; gap: 14px; color: var(--color-text);
    }
    .slide-copy small { font-size: 12px; font-weight: 600; letter-spacing: .22em; text-transform: uppercase; color: var(--color-muted); }
    .slide-copy strong { font-size: clamp(30px, 3.4vw, 48px); line-height: 1.05; letter-spacing: -.02em; font-weight: 800; }
    .slide-copy strong span { display: block; color: var(--color-accent); }
    .slide-copy p { margin: 0; font-size: 15px; line-height: 1.55; color: var(--color-text-secondary); }
    .slide-cta {
      align-self: flex-start; margin-top: 6px; font-style: normal;
      display: inline-flex; align-items: center; gap: 8px;
      background: var(--color-text); color: #fff; border-radius: 999px;
      padding: 13px 24px; font-size: 14px; font-weight: 600;
      transition: background 180ms var(--ease-standard);
    }
    .slide:hover .slide-cta { background: var(--color-accent); }
    .dots { position: absolute; z-index: 2; bottom: 18px; left: 44px; display: flex; gap: 6px; }
    .dots button {
      width: 8px; height: 8px; border-radius: 999px; border: 0; padding: 0; cursor: pointer;
      background: rgba(15, 23, 42, .22); transition: width 200ms var(--ease-standard), background 200ms;
    }
    .dots button.on { width: 24px; background: var(--color-text); }

    /* ---------- promo cards */
    .promos { display: flex; flex-direction: column; justify-content: space-between; gap: 12px; }

    @media (max-width: 1280px) {
      .hero-grid { grid-template-columns: 220px minmax(0, 1fr) 260px; }
    }
    @media (max-width: 1100px) {
      .hero-grid { grid-template-columns: 220px minmax(0, 1fr); }
      .promos { display: grid; grid-column: 1 / -1; grid-template-rows: none; grid-template-columns: repeat(3, 1fr); }
    }
    @media (max-width: 1023px) {
      .hero-grid { grid-template-columns: 1fr; padding-top: 14px; }
      .cat-side { display: none; }
    }
    @media (max-width: 720px) {
      .banner { min-height: 340px; }
      .slide::after { background: linear-gradient(0deg, rgba(248, 250, 255, .96) 30%, rgba(248, 250, 255, .5) 62%, transparent); }
      .slide-copy { left: 20px; right: 20px; top: auto; bottom: 44px; transform: none; gap: 10px; }
      .slide-copy p { display: none; }
      .dots { left: 20px; bottom: 18px; }
      .promos { display: grid; grid-template-columns: none; grid-auto-flow: column; grid-auto-columns: 78%; overflow-x: auto; scroll-snap-type: x mandatory; }
      .promos app-promo-card { scroll-snap-align: start; }
    }
    @media (prefers-reduced-motion: reduce) {
      .slide, .mega { transition: none; }
    }
  `],
})
export class HomeHeroComponent {
  private readonly catalog = inject(CatalogService);
  protected readonly categories: Category[] = this.catalog.categories;

  protected readonly openSlug = signal<string | null>(null);
  protected readonly active = computed(() =>
    this.categories.find((c) => c.slug === this.openSlug() && c.subcategories.length),
  );
  private timer?: ReturnType<typeof setTimeout>;

  protected scheduleOpen(slug: string): void {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.openSlug.set(slug), this.openSlug() ? 0 : OPEN_DELAY_MS);
  }
  protected scheduleClose(): void {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.openSlug.set(null), CLOSE_DELAY_MS);
  }
  protected cancelClose(): void {
    clearTimeout(this.timer);
  }
  protected close(): void {
    clearTimeout(this.timer);
    this.openSlug.set(null);
  }


  protected readonly slides = [
    {
      eyebrow: 'Shop local, live better',
      title: 'Everything you need,',
      accent: 'from sellers you trust',
      text: 'Discover products from Cambodian stores with clear prices and one simple checkout.',
      cta: 'Shop now',
      image: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=1600&q=80',
      alt: 'Bright, calm living room interior',
      params: { sort: 'featured' },
    },
    {
      eyebrow: 'Just landed',
      title: 'New arrivals',
      accent: 'every week',
      text: 'Fresh listings from growing local brands, updated as sellers add them.',
      cta: 'See what’s new',
      image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=1600&q=80',
      alt: 'Laptop, headphones and devices on a desk',
      params: { sort: 'newest' },
    },
    {
      eyebrow: 'Made in Cambodia',
      title: 'Crafted by',
      accent: 'local makers',
      text: 'Handmade goods and authentic craftsmanship, straight from the people who make them.',
      cta: 'Explore collection',
      image: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=1600&q=80',
      alt: 'Handwoven basket and ceramics on a wooden table',
      params: { collection: 'handmade-crafts' },
    },
  ];


  protected readonly promos = PROMO_SLOTS.heroSide;

  protected readonly slide = signal(0);

  /**
   * The three side cards rotate to their second set on the same clock as the
   * main banner (the `slide` signal both drive), instead of sitting fixed
   * forever — so they read as alive, not three static ads.
   */
  protected readonly visiblePromos = computed(() => {
    const setCount = Math.floor(this.promos.length / 3) || 1;
    const set = this.slide() % setCount;
    return this.promos.slice(set * 3, set * 3 + 3);
  });

  private rotation = setInterval(() => this.next(), SLIDE_MS);

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      clearInterval(this.rotation);
      clearTimeout(this.timer);
    });
  }

  private next(): void {
    this.slide.set((this.slide() + 1) % this.slides.length);
  }

  protected goTo(index: number): void {
    this.slide.set(index);
    clearInterval(this.rotation);
    this.rotation = setInterval(() => this.next(), SLIDE_MS);
  }
}
