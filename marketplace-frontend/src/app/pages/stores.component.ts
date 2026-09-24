import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CatalogService } from '../core/catalog/catalog.service';
import { NavbarComponent } from '../components/shared/layout/navbar/navbar.component';
import { FooterComponent } from '../components/shared/layout/footer/footer.component';
import { IconComponent } from '../components/shared/ui/icon/icon.component';

@Component({
  selector: 'app-stores',
  imports: [
    FormsModule,
    RouterLink,
    NavbarComponent,
    FooterComponent,
    IconComponent,
  ],
  template: `
    <app-navbar />

    <section class="container head">
      <nav class="crumbs">
        <a routerLink="/">Home</a> <span>›</span> <span>Stores</span>
      </nav>
      <div class="head-row">
        <div>
          <span class="eyebrow">Cambodian stores, one marketplace</span>
          <h1>Explore local stores</h1>
          <p class="sub">
            Browse {{ filtered().length }} local sellers across marketplace categories.
          </p>
        </div>
        <label class="store-search">
          <ui-icon name="search" [size]="15" />
          <input
            type="search"
            [(ngModel)]="term"
            name="storeSearch"
            placeholder="Search stores or provinces"
            aria-label="Search stores"
          />
        </label>
      </div>
    </section>

    @if (!term() && featuredStores().length) {
      <section class="container featured">
        @for (store of featuredStores(); track store.id; let i = $index) {
          <a class="featured-store" target="_self" [class.alt]="i === 1" [routerLink]="['/stores', store.id]">
            <div class="feature-copy">
              <span class="verified"><ui-icon name="sparkles" [size]="14" /> Featured store</span>
              <div class="feature-logo">{{ initials(store.name) }}</div>
              <p class="feature-category">{{ store.categoryName }}</p>
              <h2>{{ store.name }}</h2>
              <p>{{ store.description }}</p>
              <div class="feature-meta">
                <span><ui-icon name="map-pin" [size]="14" /> {{ store.location }}</span>
                @if (store.reviewCount > 0) {
                  <span><ui-icon name="star" [size]="14" [filled]="true" /> {{ store.rating }}</span>
                } @else {
                  <span>New store</span>
                }
                <span>{{ catalog.countByStore(store.id) }} products</span>
              </div>
              <span class="visit">Visit storefront <ui-icon name="arrow-right" [size]="15" /></span>
            </div>
            <div class="feature-art" aria-hidden="true">
              <div class="craft-ring"></div>
              <span>{{ i === 0 ? 'Woven by hand' : 'Harvested locally' }}</span>
            </div>
          </a>
        }
      </section>
    }

    <section class="container grid-section">
      <div class="section-title">
        <div><span>Marketplace directory</span><h2>All stores</h2></div>
        <strong>{{ filtered().length }} active</strong>
      </div>
      @if (!catalog.storesLoaded()) {
        <div class="store-state" aria-live="polite">
          <ui-icon class="spin" name="loader" [size]="28" />
          <h2>Loading stores</h2>
        </div>
      } @else if (catalog.storeError()) {
        <div class="store-state" role="alert">
          <ui-icon name="alert-circle" [size]="30" />
          <h2>Stores are temporarily unavailable</h2>
          <p>{{ catalog.storeError() }}</p>
          <button class="btn btn-primary" type="button" (click)="catalog.loadStores()">Try again</button>
        </div>
      } @else if (filtered().length) {
        <div class="store-grid">
          @for (store of filtered(); track store.id) {
            <article class="store-card card card-hover">
              <div class="store-logo img-placeholder">
                <span class="card-initials">{{ initials(store.name) }}</span>
                <span>{{ store.categoryName }}</span>
              </div>
              <div class="store-body">
                <h2>{{ store.name }}</h2>
                <div class="meta">
                  <span
                    ><ui-icon name="map-pin" [size]="13" />
                    {{ store.location }}</span
                  >
                  @if (store.reviewCount > 0) {
                    <span
                      ><ui-icon name="star" [size]="13" [filled]="true" />
                      {{ store.rating }}</span
                    >
                  } @else {
                    <span>New store</span>
                  }
                  <span
                    ><ui-icon name="package" [size]="13" />
                    {{ catalog.countByStore(store.id) }} products</span
                  >
                </div>
                <p class="desc">{{ store.description }}</p>
                <a
                  class="btn btn-outline btn-sm"
                  target="_self"
                  [routerLink]="['/stores', store.id]"
                >
                  View Store <ui-icon name="arrow-right" [size]="13" />
                </a>
              </div>
            </article>
          }
        </div>
      } @else {
        <div class="no-results">
          <div class="empty-image img-placeholder">
            <ui-icon name="store" [size]="34" />
          </div>
          <h2>No stores match “{{ term() }}”</h2>
          <p>Try a province name, or clear the search to see every seller.</p>
          <button class="btn btn-primary" (click)="term.set('')">
            Clear search
          </button>
        </div>
      }
    </section>

    <app-footer />
  `,
  styles: [
    `
      .head {
        padding-top: clamp(32px, 4vw, 64px);
        padding-bottom: 30px;
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
      .head-row {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 20px;
        flex-wrap: wrap;
      }
      h1 {
        margin-top: 7px;
        font-size: clamp(38px, 4vw, 62px);
      }
      .eyebrow { color: var(--color-accent); font-size: 12px; font-weight: 750; letter-spacing: .08em; text-transform: uppercase; }
      .sub {
        margin-top: 6px;
        color: var(--color-muted);
        font-size: 14px;
      }
      .store-search {
        display: flex;
        align-items: center;
        gap: 9px;
        padding: 9px 14px;
        min-width: 260px;
        border: 1px solid var(--color-border-strong);
        border-radius: var(--radius-md);
        background: #fff;
        color: var(--color-muted);
      }
      .store-search input {
        border: 0;
        outline: none;
        background: transparent;
        width: 100%;
        font-size: 13.5px;
        color: var(--color-text);
      }
      .store-search input:focus {
        box-shadow: none !important;
        border-color: transparent !important;
      }
      .grid-section {
        padding-top: clamp(44px, 5vw, 78px);
        padding-bottom: 70px;
      }
      .featured { display: grid; grid-template-columns: 1fr 1fr; gap: clamp(18px, 2vw, 30px); }
      .featured-store { display: grid; grid-template-columns: 1.15fr .85fr; min-height: 390px; overflow: hidden; border-radius: 28px; background: #263c31; color: #fff; box-shadow: var(--shadow-md); }
      .featured-store.alt { background: #7b2a1b; }
      .feature-copy { display: flex; flex-direction: column; align-items: flex-start; padding: clamp(28px, 3.5vw, 54px); }
      .verified { display: inline-flex; align-items: center; gap: 6px; padding: 6px 10px; border: 1px solid rgba(255,255,255,.18); border-radius: var(--radius-full); color: rgba(255,255,255,.78); font-size: 11px; font-weight: 700; }
      .feature-logo { display: grid; place-items: center; width: 56px; height: 56px; margin-top: auto; border-radius: 17px 17px 26px 17px; background: #fff8eb; color: var(--color-accent); font-family: var(--font-heading); font-size: 20px; font-weight: 700; }
      .feature-category { margin-top: 18px; color: #d9bd8b; font-size: 11px; font-weight: 750; letter-spacing: .08em; text-transform: uppercase; }
      .feature-copy h2 { margin-top: 6px; color: #fff; font-size: clamp(26px, 2.4vw, 40px); }
      .feature-copy > p:not(.feature-category) { margin-top: 10px; color: rgba(255,255,255,.7); font-size: 13px; line-height: 1.6; }
      .feature-meta { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 18px; color: rgba(255,255,255,.7); font-size: 12px; }
      .feature-meta span, .visit { display: inline-flex; align-items: center; gap: 5px; }
      .visit { margin-top: 18px; color: #fff; font-size: 13px; font-weight: 750; }
      .feature-art { position: relative; display: grid; place-items: center; overflow: hidden; background: rgba(0,0,0,.14); }
      .featured-store:first-child .feature-art { background: url('/assets/stores/khmer-style-hero.png') 69% center / cover; }
      .featured-store:nth-child(2) .feature-art { background: url('/assets/stores/cambodia-fruits-hero.png') 72% center / cover; }
      .featured-store:first-child .feature-art::after, .featured-store:nth-child(2) .feature-art::after { content: ''; position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,.28), transparent 60%); }
      .feature-art::before { content: ''; position: absolute; inset: 0; background: repeating-linear-gradient(45deg, transparent 0 13px, rgba(255,255,255,.035) 14px 15px); }
      .craft-ring { display: none; }
      .feature-art > span { position: absolute; z-index: 2; bottom: 32px; font-size: 10px; font-weight: 750; letter-spacing: .12em; text-transform: uppercase; }
      .section-title { display: flex; align-items: end; justify-content: space-between; margin-bottom: 22px; }
      .section-title span { color: var(--color-accent); font-size: 11px; font-weight: 750; letter-spacing: .08em; text-transform: uppercase; }
      .section-title h2 { margin-top: 4px; font-size: clamp(28px, 2.5vw, 38px); }
      .section-title > strong { color: var(--color-success); font-size: 12px; }
      .store-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 22px;
      }
      .store-card {
        display: flex;
        flex-direction: column;
      }
      .store-logo {
        height: 180px;
        flex-direction: column;
        gap: 12px;
        font-size: 10px;
        letter-spacing: .08em;
        text-transform: uppercase;
        text-align: center;
      }
      .card-initials { display: grid; place-items: center; width: 62px; height: 62px; border-radius: 20px 20px 29px 20px; background: rgba(255,255,255,.72); color: var(--color-accent); font-family: var(--font-heading); font-size: 21px; font-weight: 700; box-shadow: var(--shadow-sm); }
      .store-body {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 16px 18px 18px;
        flex: 1;
      }
      .store-body h2 {
        font-size: 16.5px;
      }
      .meta {
        display: flex;
        flex-wrap: wrap;
        gap: 14px;
        font-size: 12.5px;
        color: var(--color-muted);
      }
      .meta span {
        display: inline-flex;
        align-items: center;
        gap: 5px;
      }
      .desc {
        color: var(--color-text-secondary);
        font-size: 13px;
        line-height: 1.55;
        flex: 1;
      }
      .store-body .btn {
        align-self: flex-start;
        margin-top: 4px;
      }
      .no-results {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        padding: 50px 32px 70px;
        gap: 12px;
      }
      .store-state { align-items: center; display: flex; flex-direction: column; gap: 10px; justify-content: center; min-height: 300px; padding: 42px 24px; text-align: center; }
      .store-state > ui-icon { color: #9b6517; }
      .store-state p { color: var(--color-muted); font-size: 13px; }
      .store-state .spin { animation: spin 900ms linear infinite; color: var(--color-accent); }
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
        margin-bottom: 8px;
      }
      @media (max-width: 1000px) {
        .featured { grid-template-columns: 1fr; }
        .store-grid {
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        }
      }
      @media (max-width: 620px) {
        .featured-store { grid-template-columns: 1fr; min-height: 0; }
        .feature-art { min-height: 150px; }
        .store-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class StoresComponent {
  protected readonly catalog = inject(CatalogService);
  protected readonly term = signal('');

  protected readonly filtered = computed(() => {
    const needle = this.term().trim().toLowerCase();
    if (!needle) {
      return this.catalog.stores;
    }
    return this.catalog.stores.filter((store) =>
      [store.name, store.location, store.categoryName]
        .join(' ')
        .toLowerCase()
        .includes(needle),
    );
  });

  protected readonly featuredStores = computed(() => this.catalog.stores.slice(0, 2));

  protected initials(name: string): string {
    return name.split(' ').slice(0, 2).map((word) => word[0]).join('').toUpperCase();
  }
}
