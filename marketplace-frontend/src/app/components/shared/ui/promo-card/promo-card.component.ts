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
        @if (format() === 'card') {
          @if (p.eyebrow) {
            <small class="eyebrow" [attr.lang]="p.eyebrowLang ?? null">{{ p.eyebrow }}</small>
          }
          <strong>{{ p.title }}</strong>
          @if (p.text) { <span class="text">{{ p.text }}</span> }
          <em class="cta">{{ p.cta }} <ui-icon name="arrow-right" [size]="14" /></em>
        } @else {
          <!-- Compact: the photo does the talking — just a title, no eyebrow
               or description line, so the card reads as an image, not a
               paragraph with a picture attached. -->
          <strong>{{ p.title }}</strong>
          <em class="cta"><ui-icon name="arrow-right" [size]="13" /></em>
        }
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

    /* compact: the image fills the whole card; text is a small bottom-left
       label over a short shade, not a paragraph block down the side. */
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

    @media (max-width: 720px) { :host(.card) { height: 260px; } }
    @media (prefers-reduced-motion: reduce) { img, .cta { transition: none; } }
  `],
})
export class PromoCardComponent {
  readonly promo = input.required<Promo>();
  readonly format = input<PromoFormat>('card');
}
