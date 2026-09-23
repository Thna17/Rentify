import {
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { PROMOTIONS, Promotion } from '../../../../core/data/promotions.data';
import { IconComponent } from '../../../shared/ui/icon/icon.component';

const AUTOPLAY_MS = 5000;

/**
 * Promotion carousel for the top of the homepage.
 *
 * One mechanism serves both behaviours the design needs: the track is a
 * scroll-snap container, so a person can swipe or trackpad-scroll it directly,
 * and autoplay simply calls scrollTo on the same element. That means manual and
 * automatic movement can never disagree about which slide is showing — the
 * active dot is derived from scroll position, not from a separate index.
 *
 * Autoplay pauses on hover, on keyboard focus, when the tab is hidden, and is
 * disabled entirely for users who prefer reduced motion.
 */
@Component({
  selector: 'app-hero-slider',
  imports: [RouterLink, IconComponent],
  template: `
    <section
      class="slider"
      aria-roledescription="carousel"
      aria-label="Promotions"
      (focusin)="paused.set(true)"
      (focusout)="paused.set(false)"
    >
      <div #track class="track" (scroll)="onScroll()">
        @for (promo of promotions; track promo.id; let i = $index) {
          <article
            class="slide"
            [class]="'slide theme-' + promo.theme"
            [class.active]="i === index()"
            role="group"
            aria-roledescription="slide"
            [attr.aria-label]="i + 1 + ' of ' + promotions.length"
          >
            @if (promo.imageOnly && promo.image) {
              <!-- Banner artwork with its own baked-in copy: show it whole and
                   add nothing on top, or the overlay collides with the design. -->
              <a
                class="campaign-stage image-only"
                [routerLink]="promo.ctaRoute"
                [queryParams]="promo.ctaParams ?? {}"
                [attr.aria-label]="promo.headline"
              >
                <img [src]="promo.image" [alt]="promo.headline" />
              </a>
            } @else if (promo.video || promo.image) {
              <a
                class="campaign-stage"
                [routerLink]="promo.ctaRoute"
                [queryParams]="promo.ctaParams ?? {}"
                [attr.aria-label]="promo.ctaLabel + ': ' + promo.headline"
                [style.background-image]="'url(' + (promo.poster || promo.image) + ')'"
              >
                @if (promo.video) {
                  <video class="campaign-video" autoplay muted loop playsinline preload="metadata" [poster]="promo.poster" aria-label="KhmerCraft category advertisement">
                    @if (promo.videoWebm) { <source [src]="promo.videoWebm" type="video/webm" /> }
                    <source [src]="promo.video" type="video/mp4" />
                  </video>
                }

                <span class="sponsored-badge">{{ promo.sponsoredLabel }}</span>

                <div class="campaign-shade" aria-hidden="true"></div>
                <div class="campaign-offer">
                  <span class="offer-kicker">{{ promo.eyebrow }}</span>
                  <strong>{{ promo.offer }}</strong>
                  <span class="campaign-link">{{ promo.ctaLabel }} <ui-icon name="arrow-right" [size]="14" /></span>
                </div>
              </a>
            } @else {
            <div class="container slide-inner">
              <div class="copy">
                <span class="eyebrow">
                  <ui-icon name="sparkles" [size]="13" /> {{ promo.eyebrow }}
                </span>
                <h1>{{ promo.headline }}</h1>
                <p>{{ promo.subtitle }}</p>
                <div class="actions">
                  <a
                    class="btn btn-lg cta"
                    [routerLink]="promo.ctaRoute"
                    [queryParams]="promo.ctaParams ?? {}"
                  >
                    {{ promo.ctaLabel }} <ui-icon name="arrow-right" [size]="16" />
                  </a>
                  @if (promo.secondaryLabel) {
                    <a class="btn btn-lg cta-secondary" [routerLink]="promo.secondaryRoute">
                      {{ promo.secondaryLabel }}
                    </a>
                  }
                </div>
              </div>

              <div
                class="visual img-placeholder dark"
                [class.campaign-image-visual]="promo.image"
                [style.background-image]="promo.image ? 'url(' + promo.image + ')' : null"
              >
                  <div class="woven-disc" aria-hidden="true"></div>
                  <div class="visual-frame">
                    <span class="frame-kicker">KhmerCraft collection</span>
                    <strong>{{ promo.visual }}</strong>
                    <span class="frame-detail">Made in Cambodia · Crafted by hand</span>
                  </div>
                  <span class="craft-chip chip-one">Local makers</span>
                  <span class="craft-chip chip-two">Authentic craft</span>
                  @if (promo.flash) {
                    <span class="flash">{{ promo.flash }}</span>
                  }
              </div>
            </div>
            }
          </article>
        }
      </div>

      <div class="dots" role="tablist" aria-label="Choose slide">
        @for (promo of promotions; track promo.id; let i = $index) {
          <button
            type="button"
            role="tab"
            class="dot"
            [class.active]="i === index()"
            [attr.aria-selected]="i === index()"
            [attr.aria-label]="promo.headline"
            (click)="goTo(i)"
          ></button>
        }
      </div>
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .slider {
        position: relative;
        overflow: hidden;
      }
      .track {
        display: flex;
        overflow-x: auto;
        scroll-snap-type: x mandatory;
        scroll-behavior: smooth;
        /* Hidden here on purpose: the dots are the affordance, and a scrollbar
           under a full-bleed hero reads as a layout bug. Swiping still works. */
        scrollbar-width: none;
      }
      .track::-webkit-scrollbar {
        display: none;
      }
      .slide {
        flex: 0 0 100%;
        opacity: .45;
        scroll-snap-align: start;
        scroll-snap-stop: always;
        transition: opacity 700ms cubic-bezier(.22,.7,.2,1);
      }
      .slide.active { opacity: 1; }
      .campaign-stage {
        background-position: center;
        background-size: cover;
        color: inherit;
        display: block;
        height: clamp(264px, 25.5vw, 361px);
        isolation: isolate;
        overflow: hidden;
        position: relative;
        text-decoration: none;
      }
      /* A full-bleed banner sizes to its own ratio - no fixed height, no cover
         crop - so nothing baked into the artwork gets cut off. */
      /* A 3:1 slot - the standard web-banner shape. Artwork drawn at 3:1 fills it
         exactly with nothing cropped; anything squarer is trimmed top and bottom
         rather than blowing the hero up to its own height. */
      .campaign-stage.image-only {
        width: 100%;
        height: auto;
        aspect-ratio: 3 / 1;
        max-height: 560px;
        background: var(--color-bg-alt, #f6f1e7);
        display: block;
        border-radius: inherit;
        overflow: hidden;
      }
      .campaign-stage.image-only img {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .campaign-stage.image-only::after,
      .campaign-stage.image-only::before { display: none; }

      .campaign-stage::after {
        background: linear-gradient(180deg, rgba(10,14,11,.08), transparent 45%, rgba(10,14,11,.28));
        content: '';
        inset: 0;
        pointer-events: none;
        position: absolute;
        z-index: 1;
      }
      .campaign-video {
        height: 100%;
        inset: 0;
        object-fit: cover;
        opacity: 1;
        position: absolute;
        transition: opacity 650ms ease;
        width: 100%;
      }
      .campaign-video.finished { opacity: 0; }
      .sponsored-badge {
        color: rgba(255,255,255,.8);
        font-size: 9px;
        font-weight: 800;
        left: clamp(18px, 4vw, 64px);
        letter-spacing: .14em;
        position: absolute;
        text-shadow: 0 2px 12px rgba(5,10,7,.55);
        text-transform: uppercase;
        top: clamp(22px, 3vw, 38px);
        z-index: 3;
      }
      .campaign-shade {
        background:
          linear-gradient(90deg, rgba(9,16,12,.78) 0%, rgba(9,16,12,.54) 30%, rgba(9,16,12,.12) 62%, transparent 78%),
          linear-gradient(0deg, rgba(8,13,10,.22), transparent 45%);
        inset: 0;
        position: absolute;
        z-index: 2;
      }
      .campaign-offer {
        animation: offer-in 600ms cubic-bezier(.2,.75,.25,1) both;
        backdrop-filter: none !important;
        background: transparent !important;
        border: 0 !important;
        border-radius: 0 !important;
        bottom: clamp(34px, 4vw, 54px);
        box-shadow: none !important;
        left: clamp(18px, 5vw, 78px);
        max-width: min(510px, calc(100% - 36px));
        padding: 0 !important;
        position: absolute;
        z-index: 4;
      }
      .offer-kicker {
        color: #e7c98f;
        display: block;
        font-size: 9px;
        font-weight: 800;
        letter-spacing: .15em;
        margin-bottom: 11px;
        text-shadow: 0 2px 12px rgba(5,10,7,.5);
        text-transform: uppercase;
      }
      .campaign-offer strong {
        color: #fffdf7;
        display: block;
        font-family: var(--font-heading);
        font-size: clamp(30px, 3.2vw, 48px);
        font-weight: 600;
        letter-spacing: -.035em;
        line-height: .98;
        max-width: 10em;
        text-wrap: balance;
        text-shadow: 0 3px 24px rgba(4,9,6,.48);
      }
      .campaign-offer p {
        color: rgba(255,255,255,.78);
        font-size: 13px;
        font-weight: 500;
        margin: 13px 0 21px;
        max-width: 38em;
        text-shadow: 0 2px 14px rgba(4,9,6,.55);
      }
      .campaign-link {
        align-items: center;
        color: #fffdf7;
        display: inline-flex;
        font-size: 12px;
        font-weight: 750;
        gap: 7px;
        margin-top: 17px;
        padding-bottom: 3px;
        position: relative;
      }
      .campaign-link::after {
        background: rgba(255,255,255,.6);
        bottom: 0;
        content: '';
        height: 1px;
        left: 0;
        position: absolute;
        transition: width 220ms ease;
        width: 28px;
      }
      .campaign-stage:hover .campaign-link::after { width: 100%; }
      @keyframes offer-in {
        from { opacity: 0; transform: translateY(18px) scale(.98); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      .slide-inner {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: clamp(28px, 4vw, 72px);
        align-items: center;
        padding-top: clamp(18px, 2vw, 30px);
        padding-bottom: clamp(30px, 2.5vw, 40px);
        min-height: clamp(290px, 33vh, 350px);
      }
      .copy {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
      }
      .eyebrow {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        padding: 5px 12px;
        border-radius: var(--radius-full);
        font-size: 12px;
        font-weight: 650;
      }
      h1 {
        font-size: clamp(36px, 3.5vw, 54px);
        line-height: .98;
        letter-spacing: -0.045em;
        max-width: 10.5em;
      }
      .copy p {
        font-size: clamp(14px, .4vw + 12px, 17px);
        line-height: 1.55;
        max-width: 38em;
      }
      .actions {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
        margin-top: 6px;
      }
      .visual {
        position: relative;
        height: clamp(210px, 17vw, 260px);
        border-radius: 26px 26px 76px 26px;
        display: grid;
        place-items: center;
        overflow: hidden;
        isolation: isolate;
        border: 1px solid rgba(255,255,255,.1);
        box-shadow: inset 0 1px rgba(255,255,255,.08), 0 24px 54px rgba(28,20,14,.16);
      }
      .campaign-image-visual {
        background-position: center;
        background-size: cover;
      }
      .campaign-image-visual::after {
        background: linear-gradient(90deg, rgba(14,20,16,.66), rgba(14,20,16,.08));
        border-radius: 0;
        bottom: 0;
        height: auto;
        left: 0;
        right: 0;
        top: 0;
        width: auto;
        z-index: 0;
      }
      .campaign-image-visual .woven-disc,
      .campaign-image-visual .craft-chip { display: none; }
      .visual::before,
      .visual::after {
        content: '';
        position: absolute;
        z-index: -1;
        border-radius: 50%;
      }
      .visual::before {
        width: 310px;
        height: 310px;
        top: -145px;
        right: -70px;
        border: 55px solid rgba(217,189,139,.13);
      }
      .visual::after {
        width: 220px;
        height: 220px;
        bottom: -135px;
        left: -65px;
        background: rgba(142,48,33,.16);
      }
      .woven-disc {
        position: absolute;
        width: clamp(150px, 14vw, 230px);
        aspect-ratio: 1;
        right: 9%;
        border: 1px solid rgba(226,190,128,.35);
        border-radius: 50%;
        background:
          repeating-radial-gradient(circle, transparent 0 8px, rgba(226,190,128,.13) 9px 10px),
          repeating-linear-gradient(45deg, transparent 0 12px, rgba(255,255,255,.055) 13px 14px);
        box-shadow: 0 0 0 18px rgba(255,255,255,.025);
      }
      .visual-frame {
        position: absolute;
        left: clamp(22px, 4vw, 58px);
        bottom: clamp(22px, 3vw, 42px);
        z-index: 2;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 6px;
        max-width: 58%;
        padding: 18px 20px;
        border: 1px solid rgba(255,255,255,.15);
        border-radius: 18px;
        background: rgba(15,20,16,.48);
        backdrop-filter: blur(12px);
        color: #fff;
      }
      .frame-kicker,
      .frame-detail {
        font-family: var(--font-body);
        font-size: 10px;
        letter-spacing: .09em;
        text-transform: uppercase;
        opacity: .68;
      }
      .visual-frame strong {
        font-family: var(--font-heading);
        font-size: clamp(20px, 2vw, 30px);
        font-weight: 600;
        line-height: 1.08;
      }
      .craft-chip {
        position: absolute;
        z-index: 2;
        padding: 7px 11px;
        border: 1px solid rgba(255,255,255,.18);
        border-radius: var(--radius-full);
        background: rgba(255,255,255,.11);
        color: rgba(255,255,255,.78);
        font-size: 10px;
        font-weight: 700;
        backdrop-filter: blur(8px);
      }
      .chip-one { top: 24px; left: 28px; }
      .chip-two { right: 28px; bottom: 24px; }
      .flash {
        position: absolute;
        top: 20px;
        right: 20px;
        padding: 10px 16px;
        border-radius: var(--radius-md);
        font-family: var(--font-heading);
        font-size: 22px;
        font-weight: 800;
        letter-spacing: -0.02em;
        transform: rotate(4deg);
      }

      /* ---- themes ---- */
      .theme-brand {
        background: linear-gradient(120deg, #fffaf1, #f3eadc);
      }
      .theme-brand .visual-frame { background: rgba(38,60,49,.8); }
      .theme-brand .eyebrow {
        background: var(--color-accent-soft);
        color: var(--color-accent);
      }
      .theme-brand .cta {
        background: var(--color-accent);
        color: #fff;
      }
      .theme-brand .cta:hover {
        background: var(--color-accent-hover);
      }

      .theme-sale {
        background: linear-gradient(125deg, #1d1512, #2b1814);
      }
      .theme-sale h1,
      .theme-sale .visual-caption {
        color: #fff;
      }
      .theme-sale p {
        color: rgba(255, 255, 255, 0.72);
      }
      .theme-sale .eyebrow {
        background: rgba(224, 178, 105, 0.16);
        color: var(--gold);
      }
      .theme-sale .cta {
        background: var(--gold);
        color: #24190f;
      }
      .theme-sale .cta:hover {
        background: #eec483;
      }
      .theme-sale .flash {
        background: var(--gold);
        color: #24190f;
      }

      .theme-delivery {
        background: linear-gradient(125deg, #14231c, #1d3b2d);
      }
      .theme-delivery h1,
      .theme-delivery .visual-caption {
        color: #fff;
      }
      .theme-delivery p {
        color: rgba(255, 255, 255, 0.72);
      }
      .theme-delivery .eyebrow {
        background: rgba(120, 200, 160, 0.15);
        color: #8fd8b4;
      }
      .theme-delivery .cta {
        background: #8fd8b4;
        color: #10231a;
      }
      .theme-delivery .cta:hover {
        background: #a8e3c6;
      }
      .theme-delivery .flash {
        background: #8fd8b4;
        color: #10231a;
      }

      .theme-seller {
        background: linear-gradient(125deg, var(--color-accent), #632117);
      }
      .theme-seller h1,
      .theme-seller .visual-caption {
        color: #fff;
      }
      .theme-seller p {
        color: rgba(255, 255, 255, 0.78);
      }
      .theme-seller .eyebrow {
        background: rgba(255, 255, 255, 0.15);
        color: #fff;
      }
      .theme-seller .cta {
        background: #fff;
        color: var(--color-accent);
      }
      .theme-seller .cta:hover {
        background: #f4ece9;
      }

      /* Secondary button adapts to light vs dark slides. */
      .cta-secondary {
        background: transparent;
        border: 1px solid var(--color-border-strong);
        color: var(--color-text);
      }
      .cta-secondary:hover {
        background: var(--color-bg-alt);
      }
      .theme-sale .cta-secondary,
      .theme-delivery .cta-secondary,
      .theme-seller .cta-secondary {
        border-color: rgba(255, 255, 255, 0.28);
        color: #fff;
      }
      .theme-sale .cta-secondary:hover,
      .theme-delivery .cta-secondary:hover,
      .theme-seller .cta-secondary:hover {
        background: rgba(255, 255, 255, 0.1);
      }

      /* ---- dots ---- */
      .dots {
        position: absolute;
        left: 50%;
        bottom: 12px;
        transform: translateX(-50%);
        display: flex;
        gap: 8px;
        padding: 7px 12px;
        border-radius: var(--radius-full);
        background: rgba(255, 255, 255, 0.75);
        backdrop-filter: blur(8px);
      }
      .dot {
        width: 8px;
        height: 8px;
        padding: 0;
        border: 0;
        border-radius: 50%;
        background: rgba(0, 0, 0, 0.25);
        transition: width var(--dur-base) var(--ease-standard);
      }
      .dot:hover {
        background: rgba(0, 0, 0, 0.45);
      }
      .dot.active {
        width: 22px;
        border-radius: var(--radius-full);
        background: var(--color-accent);
      }

      @media (max-width: 900px) {
        .slide-inner {
          grid-template-columns: 1fr;
          gap: 30px;
          padding-top: 22px;
          padding-bottom: 48px;
          min-height: 0;
        }
        .visual {
          height: clamp(190px, 44vw, 270px);
          order: -1;
          border-radius: 22px 22px 70px 22px;
        }
        h1 {
          max-width: none;
        }
      }

      @media (max-width: 560px) {
        h1 { font-size: clamp(38px, 12vw, 54px); }
        .actions { width: 100%; }
        .actions .btn { flex: 1 1 150px; }
        .visual-frame { max-width: 72%; padding: 14px 16px; }
        .craft-chip { display: none; }
        .campaign-stage { height: 400px; }
        .campaign-offer { bottom: 34px; }
        .campaign-offer strong { font-size: clamp(32px, 10vw, 44px); }
      }

      @media (prefers-reduced-motion: reduce) {
        .track {
          scroll-behavior: auto;
        }
      }
    `,
  ],
})
export class HeroSliderComponent implements OnInit {
  protected readonly promotions: Promotion[] = PROMOTIONS;

  private readonly track = viewChild.required<ElementRef<HTMLElement>>('track');
  private readonly destroyRef = inject(DestroyRef);

  protected readonly index = signal(0);
  protected readonly paused = signal(false);

  ngOnInit(): void {
    // Honour the OS "reduce motion" setting — an auto-advancing carousel is
    // exactly the kind of movement that setting exists to stop.
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const timer = setInterval(() => {
      // Skip while hovered/focused, or while the tab is in the background —
      // otherwise the slide silently races ahead while nobody is looking.
      if (this.paused() || document.hidden) {
        return;
      }
      // Advance from where the track actually is, not from a counter. If a
      // scroll was interrupted (or never ran, as happens in a background tab),
      // a counter would drift and the dots would point at the wrong slide.
      this.goTo((this.currentSlide() + 1) % this.promotions.length);
    }, AUTOPLAY_MS);

    this.destroyRef.onDestroy(() => clearInterval(timer));
  }

  protected goTo(target: number): void {
    const element = this.track().nativeElement;
    element.scrollTo({ left: element.clientWidth * target });
    // Set the dot immediately so a click feels instant, then let onScroll
    // correct it. The scroll event is the more trustworthy of the two — a
    // swipe never calls this method — but it can lag or, in a background tab,
    // not fire at all, and the dot should not sit still in the meantime.
    this.index.set(target);
  }

  /** Derive the active dot from real scroll position, so swiping stays in sync. */
  protected onScroll(): void {
    this.index.set(this.currentSlide());
  }

  private currentSlide(): number {
    const element = this.track().nativeElement;
    if (element.clientWidth === 0) {
      return this.index();
    }
    return Math.round(element.scrollLeft / element.clientWidth);
  }
}
