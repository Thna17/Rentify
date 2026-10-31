import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CatalogService } from '../core/catalog/catalog.service';
import { SeoService } from '../core/seo/seo.service';
import { TranslatePipe } from '../core/i18n/translate.pipe';
import { CategoryTextPipe } from '../core/i18n/category-text.pipe';
import { NavbarComponent } from '../components/shared/layout/navbar/navbar.component';
import { FooterComponent } from '../components/shared/layout/footer/footer.component';
import { IconComponent } from '../components/shared/ui/icon/icon.component';

@Component({
  selector: 'app-categories',
  imports: [CategoryTextPipe, RouterLink, NavbarComponent, FooterComponent, IconComponent, TranslatePipe],
  template: `
    <app-navbar />
    <main class="container directory">
      <nav class="crumbs" [attr.aria-label]="'common.breadcrumb' | translate">
        <a routerLink="/">{{ 'nav.home' | translate }}</a>
        <ui-icon name="chevron-right" [size]="12" />
        <span aria-current="page">{{ 'nav.categories' | translate }}</span>
      </nav>
      <header class="directory-head">
        <div>
          <span class="eyebrow">{{ 'categories.eyebrow' | translate }}</span>
          <h1>{{ 'categories.titleLead' | translate }} <span>{{ 'categories.titleEmphasis' | translate }}</span></h1>
          <p>{{ 'categories.heroBody' | translate }}</p>
        </div>
        <label class="category-search">
          <ui-icon name="search" [size]="20" />
          <input type="search" [attr.aria-label]="'categories.searchCategories' | translate" [placeholder]="'categories.searchPlaceholder' | translate"
            [value]="query()" (input)="query.set($any($event.target).value)" />
        </label>
      </header>

      <section class="browse-section" aria-labelledby="browse-title">
        <div class="section-heading">
          <h2 id="browse-title">{{ 'category.browse' | translate }}</h2>
          <span>{{ filteredCategories().length }} {{ filteredCategories().length === 1 ? 'category' : 'categories' }}</span>
        </div>
        <div class="category-grid">
          @for (category of filteredCategories(); track category.slug) {
            <article class="category-card" [attr.data-category]="category.slug">
              <a class="category-cover" [routerLink]="['/categories', category.slug]" [attr.aria-label]="category | categoryText">
                <span class="category-number">0{{ categories.indexOf(category) + 1 }}</span>
                @if (!failedImages().has(category.slug)) {
                  <img [src]="'/categories/' + category.slug + '.png'" alt="" loading="lazy" (error)="imageFailed(category.slug)" />
                } @else {
                  <ui-icon [name]="category.icon" [size]="64" />
                }
                <span class="cover-arrow"><ui-icon name="arrow-right" [size]="20" /></span>
              </a>
              <div class="category-copy">
                <a class="category-title" [routerLink]="['/categories', category.slug]"><h3>{{ category | categoryText }}</h3></a>
                <p>{{ category | categoryText: 'description' }}</p>
                <div class="subcategory-links">
                  @for (sub of category.subcategories.slice(0, 3); track sub.slug) {
                    <a [routerLink]="['/categories', category.slug]" [queryParams]="{ sub: sub.slug }">{{ sub | categoryText }}</a>
                  }
                </div>
                <a class="category-bottom" [routerLink]="['/categories', category.slug]">
                  <span>
                    @if (!catalog.loaded()) {
                      {{ 'category.loadingProducts' | translate }}
                    } @else if (catalog.productError()) {
                      {{ 'category.countUnavailable' | translate }}
                    } @else {
                      {{ 'category.productCount' | translate:{ count: catalog.countByCategory(category.slug) } }}
                    }
                  </span>
                  <ui-icon name="arrow-right" [size]="17" />
                </a>
              </div>
            </article>
          } @empty {
            <div class="empty-state">
              <ui-icon name="search" [size]="32" />
              <h3>{{ 'categories.noCategoriesFound' | translate }}</h3>
              <p>{{ 'categories.noCategoriesBody' | translate }}</p>
              <button type="button" (click)="query.set('')">{{ 'categories.showAll' | translate }}</button>
            </div>
          }
        </div>
      </section>

      <section class="more-section" aria-labelledby="more-title">
        <div class="section-heading"><h2 id="more-title">{{ 'categories.moreWays' | translate }}</h2><span>{{ 'categories.makeAGoodFind' | translate }}</span></div>
        <div class="explore-grid">
          @for (item of shortcuts; track item.key) {
            <a class="explore-link" [routerLink]="item.link" [queryParams]="item.params">
              <img [src]="'/categories/' + item.key + '.png'" alt="" loading="lazy" />
              <div><h3>{{ item.title | translate }}</h3><p>{{ item.description | translate }}</p></div>
              <ui-icon name="arrow-right" [size]="20" />
            </a>
          }
        </div>
      </section>
    </main>
    <app-footer />
  `,
  styles: [`
    :host { display: block; }
    .directory { padding-top: 24px; padding-bottom: 64px; }
    .crumbs { display: flex; align-items: center; gap: 10px; color: var(--color-text-secondary); font-size: 12px; }
    .crumbs a:hover { color: var(--color-accent); }
    .directory-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 40px; padding: 44px 0 38px; }
    .eyebrow { font-size: 10px; font-weight: 700; letter-spacing: .16em; color: var(--color-accent); }
    h1 { font-size: clamp(30px, 3.2vw, 46px); line-height: 1.15; letter-spacing: -.04em; margin: 12px 0 14px; font-weight: 650; }
    h1 span { display: block; color: var(--color-accent); }
    .directory-head p { max-width: 490px; color: var(--color-text-secondary); font-size: 14px; line-height: 1.7; }
    .category-search { display: flex; align-items: center; gap: 12px; width: 340px; max-width: 100%; flex-shrink: 0; padding: 14px 16px; border: 1px solid var(--color-border); border-radius: 12px; color: var(--color-text-secondary); background: var(--color-surface); }
    .category-search:focus-within { outline: 2px solid var(--color-accent); outline-offset: 3px; }
    .category-search input { min-width: 0; width: 100%; background: transparent; border: 0; outline: 0; font: inherit; font-size: 13px; color: var(--color-text); }
    .section-heading { display: flex; justify-content: space-between; align-items: baseline; gap: 16px; margin-bottom: 20px; }
    .section-heading h2 { font-size: 19px; font-weight: 650; letter-spacing: -.025em; }
    .section-heading > span { font-size: 12px; color: var(--color-text-secondary); }
    .category-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 28px 22px; }
    .category-card { min-width: 0; }
    .category-cover { position: relative; display: flex; align-items: center; justify-content: center; aspect-ratio: 1.45; border-radius: 18px; background: #f5eee2; overflow: hidden; }
    .category-number { position: absolute; top: 16px; left: 17px; font-size: 11px; font-weight: 600; color: #675e50; }
    .category-cover img { width: 76%; height: 84%; object-fit: contain; transition: transform 220ms ease; }
    .cover-arrow ui-icon { transform: rotate(-45deg); }
    .category-cover:hover img { transform: scale(1.06); }
    .cover-arrow { position: absolute; bottom: 12px; right: 12px; display: grid; place-items: center; width: 31px; height: 31px; border-radius: 50%; background: #ffffffb8; color: #342c23; }
    [data-category="fashion"] .category-cover { background: #fbe8dd; }
    [data-category="food-groceries"] .category-cover { background: #e8f1df; }
    [data-category="home-living"] .category-cover { background: #f5ecda; }
    [data-category="beauty-wellness"] .category-cover { background: #f9e5ec; }
    [data-category="electronics"] .category-cover { background: #e5edf7; }
    [data-category="kids-family"] .category-cover { background: #eee9f8; }
    [data-category="arts-culture"] .category-cover { background: #f7eddb; }
    .category-copy { padding: 17px 2px 0; }
    .category-title h3 { font-size: 16px; font-weight: 650; letter-spacing: -.02em; }
    .category-title:hover { color: var(--color-accent); }
    .category-copy > p { color: var(--color-text-secondary); font-size: 12px; line-height: 1.65; margin: 7px 0 12px; min-height: 40px; }
    .subcategory-links { display: flex; flex-wrap: wrap; gap: 6px; min-height: 56px; align-content: flex-start; }
    .subcategory-links a { font-size: 10px; line-height: 1.5; padding: 4px 8px; border-radius: 6px; background: var(--color-surface-alt, #f5f5f7); color: var(--color-text-secondary); }
    .subcategory-links a:hover { background: var(--color-accent-soft); color: var(--color-accent); }
    .category-bottom { display: flex; align-items: center; justify-content: space-between; border-top: 1px solid var(--color-border); margin-top: 13px; padding-top: 12px; font-size: 11px; color: var(--color-text-secondary); }
    .category-bottom:hover { color: var(--color-accent); }
    .more-section { margin-top: 48px; padding-top: 30px; border-top: 1px solid var(--color-border); }
    .explore-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; }
    .explore-link { display: flex; align-items: center; gap: 14px; padding: 16px 0; }
    .explore-link img { width: 70px; height: 70px; object-fit: contain; }
    .explore-link div { flex: 1; }
    .explore-link h3 { font-size: 14px; font-weight: 650; }
    .explore-link p { margin-top: 5px; font-size: 12px; color: var(--color-text-secondary); line-height: 1.5; }
    .explore-link > ui-icon { color: var(--color-accent); transition: transform 180ms ease; }
    .explore-link:hover > ui-icon { transform: translateX(4px); }
    a:focus-visible, button:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 4px; border-radius: 6px; }
    .empty-state { grid-column: 1 / -1; text-align: center; padding: 56px 20px; color: var(--color-text-secondary); }
    .empty-state h3 { margin: 14px 0 8px; color: var(--color-text); }
    .empty-state p { font-size: 13px; }
    .empty-state button { margin-top: 18px; padding: 10px 18px; border: 0; border-radius: 8px; background: var(--color-accent); color: white; cursor: pointer; }
    @media (max-width: 1000px) { .category-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } .category-search { width: 290px; } }
    @media (max-width: 760px) { .directory-head { flex-direction: column; align-items: stretch; gap: 24px; padding: 30px 0; } .category-search { width: auto; } .category-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px 16px; } .explore-grid { grid-template-columns: 1fr; gap: 0; } .explore-link + .explore-link { border-top: 1px solid var(--color-border); } }
    @media (max-width: 400px) { .category-grid { gap: 24px 12px; } .category-title h3 { font-size: 14px; } .category-copy > p { min-height: 60px; } .subcategory-links { min-height: 88px; } .category-cover { aspect-ratio: 1.1; } .section-heading h2 { font-size: 17px; } }
    @media (prefers-reduced-motion: reduce) { .category-cover img, .explore-link > ui-icon { transition: none; } }
  `],
})
export class CategoriesComponent {
  protected readonly catalog = inject(CatalogService);
  private readonly seo = inject(SeoService);
  protected readonly categories = this.catalog.categories;
  protected readonly query = signal('');
  protected readonly failedImages = signal<ReadonlySet<string>>(new Set());
  protected readonly filteredCategories = computed(() => {
    const query = this.query().trim().toLowerCase();
    return this.categories.filter(category =>
      [category.name, category.description, ...category.subcategories.map(sub => sub.name)]
        .some(value => value.toLowerCase().includes(query)));
  });
  protected readonly shortcuts = [
    { key: 'stores', title: 'categories.shortcut.storesTitle', description: 'categories.shortcut.storesBody', link: '/stores', params: {} },
    { key: 'gifts', title: 'categories.shortcut.giftsTitle', description: 'categories.shortcut.giftsBody', link: '/categories/arts-culture', params: { sub: 'souvenirs-gifts' } },
    { key: 'discount', title: 'categories.shortcut.dealsTitle', description: 'categories.shortcut.dealsBody', link: '/products', params: { sale: '1' } },
  ];

  constructor() {
    this.seo.setPageTitle('Categories');
    this.seo.setDescription('Browse Cambodian authentic product categories on Rentify Marketplace.');
  }

  protected imageFailed(slug: string): void {
    this.failedImages.update(failed => new Set([...failed, slug]));
  }
}
