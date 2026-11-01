import { Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Promo, PromoFormat } from '../../../../core/promos/promo.models';
import { IconComponent } from '../icon/icon.component';
import { TranslateService } from '../../../../core/i18n/translate.service';

/**
 * The single promo/ad card used across the marketplace.
 * Supports standard 'card', 'compact', and 'featured' (full-height showcase card).
 */
@Component({
  selector: 'app-promo-card',
  standalone: true,
  imports: [RouterLink, IconComponent],
  host: {
    '[class.artwork]': 'promo().imageOnly === true',
    '[class.card]': "format() === 'card'",
    '[class.compact]': "format() === 'compact'",
    '[class.featured]': "format() === 'featured'",
  },
  template: `
    @let p = promo();
    <a
      class="promo"
      [class.image-only]="p.imageOnly"
      [attr.aria-label]="p.imageOnly ? copy(p, 'alt') || copy(p, 'title') : null"
      [class.illustration]="p.imageMode === 'illustration'"
      [class.featured-promo]="format() === 'featured'"
      [style.background]="p.background ?? null"
      [routerLink]="p.link"
      [queryParams]="p.params ?? {}"
    >
      <img [src]="p.image" [alt]="copy(p, 'alt')" loading="lazy" />
      @if (!p.imageOnly) {
      <div class="scrim" [class.featured-scrim]="format() === 'featured'"></div>

      @if (format() === 'featured') {
        <div class="featured-copy">
          <div class="featured-top">
            <div class="featured-badges-row">
              @if (p.eyebrow) {
                <div class="featured-live-badge">
                  <span class="live-dot"></span>
                  <span class="badge-text">{{ copy(p, 'eyebrow') }}</span>
                </div>
              }
              @if (p.badge) {
                <span class="featured-tag-badge">{{ p.badge }}</span>
              }
            </div>

            <h3 class="featured-title">{{ copy(p, 'title') }}</h3>
            @if (p.text) {
              <p class="featured-text">{{ copy(p, 'text') }}</p>
            }
          </div>

          <div class="featured-center">
            @if (p.perks?.length) {
              <div class="perks-list">
                @for (perk of p.perks; track perk) {
                  <div class="perk-chip">
                    <span class="perk-icon"><ui-icon name="check-circle" [size]="13" /></span>
                    <span>{{ perk }}</span>
                  </div>
                }
              </div>
            }
          </div>

          <div class="featured-bottom">
            <div class="cta-action-wrap">
              <span class="featured-cta-btn">
                <span>{{ copy(p, 'cta') }}</span>
                <span class="btn-arrow">
                  <ui-icon name="arrow-right" [size]="14" />
                </span>
              </span>
            </div>
            @if (p.kicker) {
              <div class="featured-kicker-row">
                <ui-icon name="shield" [size]="12" />
                <span>{{ p.kicker }}</span>
              </div>
            }
          </div>
        </div>
      } @else if (format() === 'card') {
        <span class="copy">
          @if (p.eyebrow) {
            <small class="eyebrow" [attr.lang]="p.eyebrowLang ?? null">{{ copy(p, 'eyebrow') }}</small>
          }
          <strong>{{ copy(p, 'title') }}</strong>
          @if (p.text) { <span class="text">{{ copy(p, 'text') }}</span> }
          <em class="cta">{{ copy(p, 'cta') }} <ui-icon name="arrow-right" [size]="14" /></em>
        </span>
      } @else {
        <!-- Compact: photo does the talking -->
        <span class="copy">
          <strong>{{ copy(p, 'title') }}</strong>
          <em class="cta"><ui-icon name="arrow-right" [size]="13" /></em>
        </span>
      }
      }
    </a>
  `,
  styles: [`
    :host { display: block; }
    :host(.artwork.compact) { height: auto; aspect-ratio: 3 / 1; }
    .promo.image-only { background: transparent; border-radius: 16px; }
    .promo.image-only img { width: 100%; height: 100%; object-fit: contain; transform: none; }
    :host(.card) { height: 300px; }
    :host(.compact) { height: 124px; }
    :host(.featured) {
      display: flex;
      flex-direction: column;
      height: 560px;
      min-height: 0;
      width: 100%;
    }

    .promo {
      position: relative;
      display: block;
      height: 100%;
      overflow: hidden;
      border-radius: 18px;
      background: #0f172a;
      color: #fff;
      text-decoration: none;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
      transition: transform 300ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 300ms ease;
    }
    .promo:hover {
      transform: translateY(-3px);
      box-shadow: 0 14px 34px rgba(0, 0, 0, 0.16);
    }
    img {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 600ms cubic-bezier(0.16, 1, 0.3, 1);
    }
    .promo:hover img { transform: scale(1.05); }
    .illustration img { object-fit: contain; object-position: right center; padding: 10px 8px 10px 45%; }

    /* Default copy */
    .copy { position: absolute; inset: 0; display: flex; flex-direction: column; gap: 6px; }
    .eyebrow { font-size: 11px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: rgba(255, 255, 255, .78); }
    .eyebrow[lang='km'] { font-size: 13px; letter-spacing: 0; text-transform: none; color: #ffd98a; }
    strong { font-weight: 700; letter-spacing: -.01em; line-height: 1.15; }
    .text { font-size: 13px; line-height: 1.45; color: rgba(255, 255, 255, .86); }
    .cta { font-style: normal; font-weight: 600; display: inline-flex; align-items: center; gap: 6px; transition: gap 180ms ease; }
    .promo:hover .cta { gap: 10px; }

    /* card: text at the top on a soft shade, white pill button */
    :host(.card) .copy { padding: 22px; background: linear-gradient(180deg, rgba(15, 23, 42, .62), transparent 62%); }
    :host(.card) strong { font-size: 22px; }
    :host(.card) .text { max-width: 250px; }
    :host(.card) .cta {
      align-self: flex-start; margin-top: 6px; padding: 9px 16px; border-radius: 999px;
      background: #fff; color: var(--color-text); font-size: 13px;
    }

    /* compact */
    :host(.compact) .copy {
      flex-direction: row; align-items: center; justify-content: space-between;
      gap: 8px; padding: 12px 14px;
      background: linear-gradient(0deg, rgba(15, 23, 42, .68) 0%, transparent 65%);
    }
    :host(.compact) .illustration .copy { background: linear-gradient(0deg, rgba(74, 35, 8, .55) 0%, transparent 65%); }
    :host(.compact) strong { font-size: 14.5px; }
    :host(.compact) .cta {
      flex-shrink: 0; display: grid; place-items: center; width: 26px; height: 26px;
      border-radius: 999px; background: rgba(255, 255, 255, .22); backdrop-filter: blur(2px);
    }
    :host(.compact) .illustration img { padding: 8px; object-position: center; }

    /* ---------- FEATURED FULL-HEIGHT CARD ---------- */
    .featured-promo {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 100%;
      border: 1px solid rgba(255, 255, 255, 0.16);
      box-sizing: border-box;
    }
    .featured-scrim {
      position: absolute;
      inset: 0;
      background: linear-gradient(
        180deg,
        rgba(15, 23, 42, 0.85) 0%,
        rgba(15, 23, 42, 0.45) 35%,
        rgba(15, 23, 42, 0.72) 68%,
        rgba(15, 23, 42, 0.96) 100%
      );
      pointer-events: none;
      z-index: 1;
    }
    .featured-copy {
      position: relative;
      z-index: 2;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      height: 100%;
      min-height: 100%;
      padding: clamp(16px, 1.6vw, 22px);
      box-sizing: border-box;
      gap: 10px;
    }
    .featured-top {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .featured-badges-row {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .featured-live-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(255, 255, 255, 0.18);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.28);
      padding: 4px 11px;
      border-radius: 999px;
      font-size: 10.5px;
      font-weight: 700;
      letter-spacing: .08em;
      text-transform: uppercase;
      color: #fff;
    }
    .live-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 8px #10b981;
      animation: pulse-glow 2s infinite ease-in-out;
    }
    @keyframes pulse-glow {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(0.85); }
    }
    .featured-tag-badge {
      display: inline-flex;
      background: rgba(245, 158, 11, 0.22);
      border: 1px solid rgba(245, 158, 11, 0.4);
      color: #fbbf24;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: .05em;
      padding: 3px 9px;
      border-radius: 999px;
      backdrop-filter: blur(6px);
    }
    .featured-title {
      font-size: clamp(20px, 1.5vw, 24px);
      font-weight: 800;
      letter-spacing: -0.02em;
      line-height: 1.15;
      color: #ffffff;
      margin: 0;
      text-shadow: 0 2px 10px rgba(0, 0, 0, 0.35);
    }
    .featured-text {
      font-size: 12.5px;
      line-height: 1.45;
      color: rgba(255, 255, 255, 0.88);
      margin: 0;
      max-width: 270px;
      text-shadow: 0 1px 6px rgba(0, 0, 0, 0.3);
    }
    .featured-center {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin: auto 0;
      padding: 4px 0;
    }
    .perks-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .perk-chip {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      background: rgba(255, 255, 255, 0.12);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border: 1px solid rgba(255, 255, 255, 0.16);
      border-radius: 999px;
      padding: 4px 11px;
      font-size: 11px;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.95);
      width: fit-content;
      transition: background 200ms ease, transform 200ms ease;
    }
    .promo:hover .perk-chip {
      background: rgba(255, 255, 255, 0.18);
    }
    .perk-icon {
      color: #34d399;
      display: flex;
      align-items: center;
    }
    .featured-bottom {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding-top: 2px;
    }
    .cta-action-wrap {
      display: flex;
      align-items: center;
    }
    .featured-cta-btn {
      display: inline-flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      background: #ffffff;
      color: #0f172a;
      font-size: 12.5px;
      font-weight: 700;
      padding: 8px 16px;
      border-radius: 999px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18);
      transition: background 200ms ease, transform 200ms ease, box-shadow 200ms ease;
      width: fit-content;
    }
    .btn-arrow {
      display: grid;
      place-items: center;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #0f172a;
      color: #ffffff;
      transition: transform 200ms ease;
    }
    .promo:hover .featured-cta-btn {
      background: #ffffff;
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
    }
    .promo:hover .btn-arrow {
      transform: translateX(3px);
    }
    .featured-kicker-row {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: rgba(255, 255, 255, 0.72);
      font-size: 10.5px;
      font-weight: 500;
    }

    @media (max-width: 900px) {
      :host(.featured) { height: 280px; min-height: 0; }
      .featured-copy { min-height: 280px; padding: 16px; gap: 8px; }
      .featured-center { display: flex; }
      .featured-text { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; }
      .featured-title { font-size: 19px; }
      .featured-cta-btn { padding: 7px 14px; font-size: 12px; }
      .btn-arrow { width: 18px; height: 18px; }
    }
    @media (max-width: 520px) {
      :host(.featured) { height: 280px; min-height: 0; }
      .featured-copy { min-height: 250px; padding: 14px; gap: 6px; }
      .featured-title { font-size: 17px; }
      .perks-list { gap: 4px; }
      .perk-chip { padding: 3px 9px; font-size: 10px; }
      .featured-kicker-row { display: none; }
    }
    @media (prefers-reduced-motion: reduce) { img, .featured-cta-btn, .btn-arrow { transition: none; } }
  `],
})
export class PromoCardComponent {
  readonly promo = input.required<Promo>();
  readonly format = input<PromoFormat>('card');
  private readonly translate = inject(TranslateService);

  /** Catalog copy for promo.<id>.<field>; falls back to the slot's own text. */
  protected copy(p: Promo, field: 'eyebrow' | 'title' | 'text' | 'cta' | 'alt'): string {
    const key = `promo.${p.id}.${field}`;
    const text = p.id ? this.translate.t(key) : key;
    return text === key ? (p[field] ?? '') : text;
  }
}
