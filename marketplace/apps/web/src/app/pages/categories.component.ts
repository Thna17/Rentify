import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CatalogService } from '../core/catalog/catalog.service';
import { Category } from '../core/catalog/catalog.models';
import { NavbarComponent } from '../components/shared/layout/navbar/navbar.component';
import { FooterComponent } from '../components/shared/layout/footer/footer.component';
import { IconComponent } from '../components/shared/ui/icon/icon.component';

@Component({
  selector: 'app-categories',
  imports: [RouterLink, NavbarComponent, FooterComponent, IconComponent],
  template: `
    <app-navbar />

    <section class="container head">
      <nav class="crumbs">
        <a routerLink="/">Home</a> <span>›</span> <span>Categories</span>
      </nav>
      <h1>Browse by category</h1>
      <p class="sub">
        Explore departments across KhmerCraft’s Cambodian local-first marketplace.
      </p>
    </section>

    <section class="container grid-section">
      <div class="category-grid">
        @for (category of categories; track category.slug) {
          <a
            class="category-card card card-hover"
            [routerLink]="['/categories', category.slug]"
          >
            <span class="icon-wrap">
              <ui-icon [name]="category.icon" [size]="22" />
            </span>
            <h2>{{ category.name }}</h2>
            <p>{{ category.description }}</p>
            <span class="count">
              @if (!catalog.loaded()) {
                Loading products…
              } @else if (catalog.productError()) {
                Product count unavailable
              } @else {
                {{ catalog.countByCategory(category.slug) }} products
              }
            </span>
            <span class="subs">{{ subLabel(category) }}</span>
            <span class="cta">
              View products <ui-icon name="arrow-right" [size]="13" />
            </span>
          </a>
        }
      </div>
    </section>

    <app-footer />
  `,
  styles: [
    `
      .head {
        padding: 26px 32px 0;
      }
      .crumbs {
        display: flex;
        gap: 8px;
        font-size: 12.5px;
        color: var(--color-muted);
        margin-bottom: 16px;
      }
      .crumbs a:hover {
        color: var(--color-accent);
      }
      h1 {
        font-size: 27px;
      }
      .sub {
        margin-top: 6px;
        color: var(--color-muted);
        font-size: 14px;
      }
      .grid-section {
        padding: 26px 32px 60px;
      }
      .category-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
        gap: 18px;
      }
      .category-card {
        display: flex;
        flex-direction: column;
        gap: 7px;
        padding: 22px;
        color: var(--color-text);
      }
      .icon-wrap {
        width: 44px;
        height: 44px;
        display: grid;
        place-items: center;
        border-radius: var(--radius-md);
        background: var(--color-accent-soft);
        color: var(--color-accent);
        margin-bottom: 6px;
      }
      .category-card h2 {
        font-size: 16px;
      }
      .category-card p {
        color: var(--color-muted);
        font-size: 13px;
        line-height: 1.5;
        flex: 1;
      }
      .count {
        color: var(--color-text-secondary);
        font-size: 12.5px;
        font-weight: 600;
      }
      .subs {
        color: var(--color-muted);
        font-size: 11.5px;
        line-height: 1.5;
      }
      .cta {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        margin-top: 8px;
        color: var(--color-accent);
        font-size: 13px;
        font-weight: 600;
      }
      .category-card:hover .cta {
        gap: 8px;
      }
      @media (max-width: 1100px) {
        .category-grid {
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
        }
      }
      @media (max-width: 820px) {
        .category-grid {
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
        }
      }
      @media (max-width: 520px) {
        .category-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class CategoriesComponent {
  protected readonly catalog = inject(CatalogService);
  protected readonly categories = this.catalog.categories;

  /** First few sub-categories, so the card previews what is inside. */
  protected subLabel(category: Category): string {
    const names = category.subcategories.map((sub) => sub.name);
    return names.length > 3
      ? `${names.slice(0, 3).join(' · ')} +${names.length - 3}`
      : names.join(' · ');
  }
}
