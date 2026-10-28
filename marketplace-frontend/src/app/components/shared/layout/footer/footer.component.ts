import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { merchantDashboardUrl } from '../../../../core/rentify/rentify-marketplace.service';
import { TranslateService } from '../../../../core/i18n/translate.service';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';

interface SocialLink {
  id: string;
  label: string;
  url: string;
  icon: 'telegram' | 'facebook' | 'linkedin' | 'tiktok';
}

const SOCIAL_LINKS: SocialLink[] = [
  { id: 'telegram', label: 'Telegram', url: 'https://t.me/RentifySupport', icon: 'telegram' },
  { id: 'facebook', label: 'Facebook', url: 'https://facebook.com/rentifykh', icon: 'facebook' },
  { id: 'linkedin', label: 'LinkedIn', url: 'https://linkedin.com/company/rentify-cambodia', icon: 'linkedin' },
  { id: 'tiktok', label: 'TikTok', url: 'https://tiktok.com/@rentifykh', icon: 'tiktok' },
];

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslatePipe],
  template: `
  <footer class="footer">
    <div class="container footer-top">
      <div class="footer-brand">
        <a routerLink="/" class="logo">
          <span class="logo-mark" aria-hidden="true">R</span>
          <span><strong>{{ 'footer.brandName' | translate }}</strong> {{ 'footer.brandSuffix' | translate }}</span>
        </a>
        <p>{{ 'footer.tagline' | translate }}</p>
        <nav class="socials" [attr.aria-label]="'footer.social' | translate">
          @for (social of socials; track social.id) {
            <a class="social" [href]="social.url" target="_blank" rel="noreferrer" [attr.aria-label]="social.label">
              @switch (social.icon) {
                @case ('telegram') {
                  <!-- Telegram / Send icon -->
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.54 21.69a.5.5 0 0 0 .93-.03l6.5-19a.5.5 0 0 0-.64-.64l-19 6.5a.5.5 0 0 0-.03.93l7.93 3.18a2 2 0 0 1 1.11 1.11z"/><path d="m21.85 2.15-10.94 10.94"/></svg>
                }
                @case ('facebook') {
                  <!-- Facebook icon -->
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
                }
                @case ('linkedin') {
                  <!-- LinkedIn icon -->
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/></svg>
                }
                @case ('tiktok') {
                  <!-- TikTok icon -->
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/></svg>
                }
              }
            </a>
          }
        </nav>

        <!-- Mobile-only seller badges placed directly after socials -->
        <div class="sell-badges mobile-only-badges">
          <a class="badge" routerLink="/become-a-seller">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2V7"/></svg>
            <span><small>{{ 'footer.sellCaption' | translate }}</small><b>{{ 'footer.sellCta' | translate }}</b></span>
          </a>
          <a class="badge" [href]="sellerLoginUrl">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="m10 17 5-5-5-5"/><path d="M15 12H3"/></svg>
            <span><small>{{ 'footer.sellerLoginCaption' | translate }}</small><b>{{ 'footer.sellerLogin' | translate }}</b></span>
          </a>
        </div>
      </div>

      <nav class="mobile-footer-links" [attr.aria-label]="'footer.navigation' | translate">
        @for (group of mobileGroups; track group.title) {
          <details class="footer-accordion">
            <summary>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path [attr.d]="group.icon" /></svg>
              <span>{{ group.title | translate }}</span>
              <svg class="accordion-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
            </summary>
            <div class="accordion-content">
              @for (link of group.links; track link.label) {
                @if (link.external) {
                  <a [href]="link.path">{{ link.label | translate }}</a>
                } @else {
                  <a [routerLink]="link.path">{{ link.label | translate }}</a>
                }
              }
            </div>
          </details>
        }
      </nav>

      <div class="footer-links">
        <nav class="footer-col" [attr.aria-label]="'footer.product' | translate">
          <h4>{{ 'footer.product' | translate }}</h4>
          <a routerLink="/products">{{ 'footer.browseProducts' | translate }}</a>
          <a routerLink="/categories">{{ 'nav.categories' | translate }}</a>
          <a routerLink="/stores">{{ 'nav.stores' | translate }}</a>
          <a routerLink="/wishlist">{{ 'nav.wishlist' | translate }}</a>
          <a routerLink="/cart">{{ 'nav.cart' | translate }}</a>
          <a routerLink="/orders">{{ 'nav.orders' | translate }}</a>
        </nav>
        <nav class="footer-col" [attr.aria-label]="'footer.company' | translate">
          <h4>{{ 'footer.company' | translate }}</h4>
          <a routerLink="/about">{{ 'nav.about' | translate }}</a>
          <a routerLink="/become-a-seller">{{ 'footer.becomeSeller' | translate }}</a>
          <a routerLink="/become-a-seller/pricing">{{ 'footer.sellerPricing' | translate }}</a>
          <a routerLink="/become-a-seller/faq">{{ 'footer.sellerFaq' | translate }}</a>
          <a routerLink="/contact">{{ 'footer.contact' | translate }}</a>
        </nav>
        <nav class="footer-col" [attr.aria-label]="'footer.support' | translate">
          <h4>{{ 'footer.support' | translate }}</h4>
          <a routerLink="/help">{{ 'footer.help' | translate }}</a>
          <a routerLink="/shipping">{{ 'footer.shipping' | translate }}</a>
          <a routerLink="/orders" [attr.title]="'footer.reportHint' | translate">{{ 'footer.reportProblem' | translate }}</a>
          <a [href]="signInUrl">{{ 'nav.signIn' | translate }}</a>
          <a routerLink="/terms">{{ 'footer.terms' | translate }}</a>
          <a routerLink="/privacy">{{ 'footer.privacy' | translate }}</a>
        </nav>
      </div>

      <div class="footer-sell">
        <h4>{{ 'footer.sellTitle' | translate }}</h4>
        <p>{{ 'footer.sellText' | translate }}</p>
        <div class="sell-badges">
          <a class="badge" routerLink="/become-a-seller">
            <!-- Lucide "store" -->
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2V7"/></svg>
            <span><small>{{ 'footer.sellCaption' | translate }}</small><b>{{ 'footer.sellCta' | translate }}</b></span>
          </a>
          <a class="badge" [href]="sellerLoginUrl">
            <!-- Lucide "log-in" -->
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="m10 17 5-5-5-5"/><path d="M15 12H3"/></svg>
            <span><small>{{ 'footer.sellerLoginCaption' | translate }}</small><b>{{ 'footer.sellerLogin' | translate }}</b></span>
          </a>
        </div>
      </div>

      <!-- Newsletter: full-width strip under the columns -->
      <div class="footer-news">
        <div class="news-copy">
          <h5>{{ 'footer.newsletterTitle' | translate }}</h5>
          <p>{{ 'footer.newsletterText' | translate }}</p>
        </div>
        <form class="news-form" (submit)="onSubscribe($event)">
          <label class="news-input">
            <svg viewBox="0 0 24 24" aria-hidden="true"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
            <span class="sr-only">{{ 'footer.emailPlaceholder' | translate }}</span>
            <input
              type="email"
              [(ngModel)]="newsletterEmail"
              name="email"
              autocomplete="email"
              [placeholder]="'footer.emailPlaceholder' | translate"
              required
              [disabled]="subscribed()"
            />
          </label>
          <button type="submit" class="news-btn" [disabled]="subscribed()">
            {{ (subscribed() ? 'footer.subscribed' : 'footer.subscribe') | translate }}
          </button>
        </form>
      </div>
    </div>

    <div class="footer-bottom">
      <div class="container bottom-row">
        <span class="copyright">{{ 'footer.copyright' | translate: { year: year } }}</span>

        <div class="actions">
          <label class="action lang">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
            <span class="sr-only">{{ 'nav.language' | translate }}</span>
            <select [value]="language()" (change)="selectLanguage($any($event.target).value)">
              <option value="en">English</option>
              <option value="km">ភាសាខ្មែរ</option>
            </select>
            <svg class="chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
          </label>
          <a class="action" routerLink="/contact">
            <svg viewBox="0 0 24 24" aria-hidden="true"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
            {{ 'footer.contactShort' | translate }}
          </a>
          <a class="action" routerLink="/orders" [attr.title]="'footer.reportHint' | translate">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22v-7"/></svg>
            {{ 'footer.report' | translate }}
          </a>
          <!-- Release 1 checkout is cash on delivery only, so that is the only method shown -->
          <span class="pill">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg>
            {{ 'footer.cod' | translate }}
          </span>
        </div>
      </div>
    </div>
  </footer>
  `,
  styles: [`
    .footer {
      background: color-mix(in srgb, var(--color-bg-alt) 45%, var(--color-bg));
      color: var(--color-text);
      border-top: 1px solid var(--color-border);
    }
    svg { width: 15px; height: 15px; fill: none; stroke: currentColor; stroke-width: 1.75; stroke-linecap: round; stroke-linejoin: round; flex-shrink: 0; }
    .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
    h4 { margin: 0 0 10px; font-family: var(--font-heading); font-size: 12.5px; font-weight: 700; letter-spacing: -.01em; color: var(--color-forest); }

    /* Desktop: brand & sell on top row, links & news underneath to reduce total footer height */
    .footer-top {
      display: grid;
      grid-template-columns: minmax(240px, 1.2fr) minmax(280px, 1.3fr) minmax(0, 2.2fr);
      grid-template-areas:
        "brand sell links"
        "news  news links";
      column-gap: clamp(20px, 3vw, 44px);
      row-gap: 18px;
      padding-top: clamp(24px, 2.5vw, 36px);
      padding-bottom: 20px;
    }
    .footer-brand { grid-area: brand; }
    .footer-links { grid-area: links; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
    .footer-sell { grid-area: sell; }
    .footer-news { grid-area: news; }

    .logo { display: inline-flex; align-items: center; gap: 8px; color: var(--color-forest); font-size: 16px; letter-spacing: -.02em; text-decoration: none; }
    .logo strong { font-weight: 700; }
    .logo > span:last-child { font-weight: 400; }
    .logo-mark {
      display: grid; place-items: center; width: 26px; height: 26px; border-radius: 7px;
      background: var(--color-forest); color: var(--color-bg); font-size: 13px; font-weight: 700;
    }
    .footer-brand p { margin: 10px 0 0; max-width: 34ch; font-size: 12.5px; line-height: 1.55; color: var(--color-text-secondary); }
    .socials { display: flex; gap: 6px; margin-top: 14px; }
    .social {
      display: grid; place-items: center; width: 32px; height: 32px; border-radius: 8px;
      border: 1px solid var(--color-border); background: var(--color-surface); color: var(--color-text-secondary);
      transition: border-color 150ms ease, color 150ms ease, background 150ms ease;
    }
    .social:hover { border-color: var(--color-forest); background: var(--color-success-soft); color: var(--color-forest); }

    .footer-col a { display: block; width: fit-content; padding: 3px 0; font-size: 12.5px; line-height: 1.35; color: var(--color-text-secondary); text-decoration: none; transition: color 150ms ease; }
    .footer-col a:hover { color: var(--color-forest); }

    .footer-sell p { margin: 0; max-width: 30ch; font-size: 12.5px; line-height: 1.55; color: var(--color-text-secondary); }
    .sell-badges { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
    .mobile-only-badges { display: none; }
    .badge {
      display: inline-flex; align-items: center; gap: 8px; min-height: 36px; padding: 4px 12px 4px 10px; white-space: nowrap;
      border-radius: var(--radius-sm); background: var(--color-text); color: var(--color-bg); text-decoration: none;
      transition: background 150ms ease;
    }
    .badge:hover { background: var(--color-forest); }
    .badge svg { width: 17px; height: 17px; }
    .badge span { display: flex; flex-direction: column; line-height: 1.15; }
    .badge small { font-size: 9px; font-weight: 500; opacity: .75; }
    .badge b { font-size: 12.5px; font-weight: 600; letter-spacing: -.01em; }

    /* Newsletter strip: copy left, form right */
    .footer-news {
      display: flex; align-items: center; justify-content: space-between; gap: 16px 32px; flex-wrap: wrap;
      padding: 16px 20px; border: 1px solid var(--color-border); border-radius: var(--radius-md);
      background: var(--color-surface);
    }
    .news-copy { min-width: 0; }
    .news-copy h5 { margin: 0; font-family: var(--font-heading); font-size: 14px; font-weight: 700; letter-spacing: -.01em; color: var(--color-forest); }
    .news-copy p { margin: 3px 0 0; font-size: 12.5px; line-height: 1.45; color: var(--color-text-secondary); }
    .news-form { display: flex; gap: 8px; flex: 1 1 320px; max-width: 440px; min-width: 0; }
    .news-input {
      flex: 1; min-width: 0; display: flex; align-items: center; gap: 8px; height: 38px; padding: 0 12px;
      border: 1px solid var(--color-border-strong); border-radius: var(--radius-sm); background: var(--color-bg);
      color: var(--color-muted); cursor: text; transition: border-color 150ms ease, box-shadow 150ms ease;
    }
    .news-input:focus-within { border-color: var(--color-forest); box-shadow: 0 0 0 3px var(--color-success-soft); }
    .news-input input {
      flex: 1; min-width: 0; height: 100%; padding: 0; border: 0 !important; outline: none !important; box-shadow: none !important;
      background: transparent; font-size: 13px; color: var(--color-text);
    }
    .news-btn {
      flex-shrink: 0; height: 38px; min-height: 0; padding: 0 16px; border: 0; border-radius: var(--radius-sm);
      background: var(--color-forest); color: var(--color-bg); font-size: 13px; font-weight: 600; cursor: pointer;
      transition: background 150ms ease;
    }
    .news-btn:hover { background: var(--color-text); }
    .news-btn:disabled, .news-input input:disabled { opacity: .7; cursor: default; }

    /* Bottom: copyright left, utilities right */
    .footer-bottom { border-top: 1px solid var(--color-border); }
    .bottom-row { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px 16px; padding-top: 8px; padding-bottom: 8px; }
    .copyright { font-size: 12px; color: var(--color-muted); }
    .actions { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; }
    .action {
      position: relative; display: inline-flex; align-items: center; gap: 6px; min-height: 30px; padding: 0 8px;
      border-radius: 6px; font-size: 12.5px; color: var(--color-text-secondary); text-decoration: none; transition: background 150ms ease, color 150ms ease;
    }
    a.action:hover, .lang:hover { background: var(--color-bg-hover); color: var(--color-text); }
    .action + .action::before {
      content: ''; position: absolute; left: -4px; top: 9px; bottom: 9px; width: 1px; background: var(--color-border);
    }
    .lang { cursor: pointer; padding-right: 24px; }
    .lang select {
      appearance: none; -webkit-appearance: none; border: 0; background: transparent; font: inherit; color: inherit;
      cursor: pointer; padding: 0; margin: 0;
    }
    .lang select:focus { outline: none; }
    .lang:focus-within { outline: 2px solid var(--color-forest); outline-offset: 2px; }
    .lang .chevron { position: absolute; right: 7px; width: 12px; height: 12px; pointer-events: none; }
    .pill {
      display: inline-flex; align-items: center; gap: 6px; min-height: 26px; padding: 0 10px; margin-left: 6px;
      border-radius: var(--radius-full); background: var(--color-success-soft); color: var(--color-forest); font-size: 12px; font-weight: 500;
    }

    /* Tablet: brand and sell side by side, links full width, newsletter last */
    @media (max-width: 1023px) {
      .footer-top {
        grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
        grid-template-areas:
          "brand sell"
          "links links"
          "news  news";
        row-gap: 20px;
      }
      .footer-links { padding-top: 18px; border-top: 1px solid var(--color-border); }
      .news-form { max-width: none; }
    }

    .mobile-footer-links { display: none; }
    a:focus-visible, summary:focus-visible, button:focus-visible { outline: 2px solid var(--color-forest); outline-offset: 3px; }

    /* Mobile: intentional single-column directory, matching the compact reference. */
    @media (max-width: 600px) {
      .footer { background: var(--color-surface); }
      .footer-top {
        grid-template-columns: minmax(0, 1fr);
        grid-template-areas: "brand" "links" "news";
        row-gap: 20px;
        padding: 28px 20px 24px;
      }
      .logo { gap: 9px; font-size: 17px; }
      .logo-mark { width: 35px; height: 35px; border-radius: 9px; font-size: 17px; }
      .footer-brand p { margin-top: 9px; max-width: 38ch; font-size: 13px; line-height: 1.6; }
      .socials { gap: 9px; margin-top: 14px; }
      .social { width: 38px; height: 38px; border-radius: 9px; }
      .social svg { width: 17px; height: 17px; }
      .footer-links, .footer-sell, .mobile-only-badges { display: none; }
      .mobile-footer-links { display: block; grid-area: links; border-top: 1px solid var(--color-border); }
      .footer-accordion { border-bottom: 1px solid var(--color-border); }
      .footer-accordion summary { display: flex; align-items: center; gap: 14px; min-height: 48px; padding: 10px 4px; list-style: none; cursor: pointer; color: var(--color-forest); font-size: 13.5px; font-weight: 650; }
      .footer-accordion summary::-webkit-details-marker { display: none; }
      .footer-accordion summary > svg { width: 20px; height: 20px; }
      .footer-accordion summary span { flex: 1; }
      .footer-accordion summary .accordion-chevron { width: 16px; height: 16px; color: var(--color-text-secondary); transition: transform 160ms ease; }
      .footer-accordion[open] .accordion-chevron { transform: rotate(180deg); }
      .accordion-content { display: grid; padding: 0 4px 10px 38px; }
      .accordion-content a { display: flex; align-items: center; min-height: 40px; font-size: 13px; line-height: 1.5; color: var(--color-text-secondary); }
      .accordion-content a:hover { color: var(--color-forest); }
      .footer-news { display: flex; flex-direction: column; align-items: stretch; gap: 12px; padding: 0; border: 0; background: transparent; }
      .news-copy h5 { font-size: 14px; }
      .news-copy p { font-size: 12px; line-height: 1.6; margin-top: 5px; }
      .news-form { flex: none; width: 100%; max-width: none; gap: 0; border: 1px solid var(--color-border-strong); border-radius: 10px; background: var(--color-bg); }
      .news-input { height: 44px; padding: 0 10px; border: 0; border-radius: 10px 0 0 10px; background: transparent; }
      .news-input input { font-size: 12px; }
      .news-input svg { width: 17px; height: 17px; }
      .news-btn { height: 44px; padding: 0 14px; font-size: 12px; border-radius: 9px; }
      .bottom-row { flex-direction: column; align-items: flex-start; gap: 12px; padding: 16px 20px 20px; }
      .actions { width: 100%; gap: 6px; }
      .action { min-height: 38px; padding: 0 6px; font-size: 12px; }
      .action + .action::before { display: none; }
      .pill { margin-left: 0; min-height: 30px; font-size: 11px; }
      .copyright { font-size: 10.5px; line-height: 1.6; }
    }
    @media (prefers-reduced-motion: reduce) { .accordion-chevron { transition: none !important; } }

  `]
})
export class FooterComponent {
  private readonly auth = inject(AuthService);
  private readonly translate = inject(TranslateService);
  protected readonly signInUrl = this.auth.getLoginUrl();
  protected readonly sellerLoginUrl = this.auth.getLoginUrl(merchantDashboardUrl());
  protected readonly socials = SOCIAL_LINKS;
  protected readonly mobileGroups: { title: string; icon: string; links: { label: string; path: string; external?: boolean }[] }[] = [
    { title: 'footer.shop', icon: 'M6 8h12l1 13H5L6 8Z M9 8V6a3 3 0 0 1 6 0v2', links: [
      { label: 'footer.browseProducts', path: '/products' }, { label: 'nav.categories', path: '/categories' },
      { label: 'nav.stores', path: '/stores' }, { label: 'nav.wishlist', path: '/wishlist' },
      { label: 'nav.cart', path: '/cart' }, { label: 'nav.orders', path: '/orders' },
    ] },
    { title: 'footer.sellTitle', icon: 'M3 10V6l2-3h14l2 3v4 M3 10h18 M5 10v11h14V10 M9 21v-7h6v7 M2 6h20', links: [
      { label: 'footer.becomeSeller', path: '/become-a-seller' }, { label: 'footer.sellerPricing', path: '/become-a-seller/pricing' },
      { label: 'footer.sellerFaq', path: '/become-a-seller/faq' }, { label: 'footer.sellerLogin', path: this.sellerLoginUrl, external: true },
    ] },
    { title: 'footer.company', icon: 'M4 21V3h10v18 M14 9h6v12 M2 21h20 M7 6h1 M10 6h1 M7 10h1 M10 10h1 M7 14h1 M10 14h1 M17 12h1 M17 16h1', links: [
      { label: 'nav.about', path: '/about' }, { label: 'footer.contact', path: '/contact' },
    ] },
    { title: 'footer.support', icon: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0 M9.5 9a2.5 2.5 0 1 1 4 2c-1.5 1-1.5 1-1.5 3 M12 17h.01', links: [
      { label: 'footer.help', path: '/help' }, { label: 'footer.shipping', path: '/shipping' },
      { label: 'footer.reportProblem', path: '/orders' }, { label: 'nav.signIn', path: this.signInUrl, external: true },
    ] },
    { title: 'footer.legal', icon: 'M12 3 4 6v6c0 5 4 8 8 10 4-2 8-5 8-10V6L12 3Z M9 12l2 2 4-4', links: [
      { label: 'footer.terms', path: '/terms' }, { label: 'footer.privacy', path: '/privacy' },
    ] },
  ];

  protected readonly year = new Date().getFullYear();
  protected readonly language = this.translate.currentLang;
  protected newsletterEmail = '';
  protected readonly subscribed = signal(false);

  protected onSubscribe(e: Event): void {
    e.preventDefault();
    if (this.newsletterEmail.trim()) {
      this.subscribed.set(true);
    }
  }

  protected selectLanguage(lang: 'en' | 'km'): void {
    this.translate.setLanguage(lang);
  }
}
