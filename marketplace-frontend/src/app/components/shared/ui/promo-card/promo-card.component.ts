import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Promo, PromoFormat } from '../../../../core/promos/promo.models';
import { IconComponent } from '../icon/icon.component';

/**
 * The single promo/ad card used across the marketplace. Size is decided by
 * `format` only, never by the page, so every promo of a format looks the same.
 */
@Component({
  selector: 'app-promo-card',
  imports: [RouterLink, IconComponent],
  host: { '[class.card]': "format() === 'card'", '[class.compact]': "format() === 'compact'" },
  template: `
    @let p = promo();
    <a
      class="promo"
      [class.illustration]="p.imageMode === 'illustration'"
      [style.background]="p.background ?? null"
      [routerLink]="p.link"
      [queryParams]="p.params ?? {}"
    >
      <img [src]="p.image" [alt]="p.alt ?? ''" loading="lazy" />
      <span class="copy">
        @if (p.eyebrow) {
          <small class="eyebrow" [attr.lang]="p.eyebrowLang ?? null">{{ p.eyebrow }}</small>
        }
        <strong>{{ p.title }}</strong>
        @if (p.text) { <span class="text">{{ p.text }}</span> }
        <em class="cta">{{ p.cta }} <ui-icon name="arrow-right" [size]="14" /></em>
      </span>
    </a>
  `,
  styles: [`
    :host { display: block; }
    :host(.card) { height: 300px; }
    :host(.compact) { height: 124px; }

    .promo {
      position: relative; display: block; height: 100%; overflow: hidden;
      border-radius: 16px; background: #1e1b4b; color: #fff; text-decoration: none;
    }
    img {
      position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover;
      transition: transform 500ms var(--ease-out);
    }
    .promo:hover img { transform: scale(1.04); }
    .illustration img { object-fit: contain; object-position: right center; padding: 10px 8px 10px 45%; }

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

    /* compact: text on the left over a side shade, text link */
    :host(.compact) .copy {
      justify-content: center; gap: 4px; padding: 16px 18px; padding-right: 38%;
      background: linear-gradient(90deg, rgba(15, 23, 42, .78) 0%, rgba(15, 23, 42, .4) 55%, transparent 85%);
    }
    :host(.compact) .illustration .copy { background: linear-gradient(90deg, rgba(74, 35, 8, .5), transparent 70%); }
    :host(.compact) strong { font-size: 16px; }
    :host(.compact) .text { font-size: 12px; line-height: 1.35; }
    :host(.compact) .cta { font-size: 12.5px; margin-top: 2px; }

    @media (max-width: 720px) { :host(.card) { height: 260px; } }
    @media (prefers-reduced-motion: reduce) { img, .cta { transition: none; } }
  `],
})
export class PromoCardComponent {
  readonly promo = input.required<Promo>();
  readonly format = input<PromoFormat>('card');
}
