import { Component } from '@angular/core';

@Component({
  selector: 'app-promo-image-marquee',
  standalone: true,
  template: `
    <section class="marquee" aria-label="Featured KhmerCraft collections">
      <div class="track">
        @for (group of [0, 1, 2, 3]; track group) {
          <div class="image-group" [attr.aria-hidden]="group > 0 ? 'true' : null">
            @for (image of images; track $index) {
              <img [src]="image.src" [alt]="group === 0 ? image.alt : ''" />
            }
          </div>
        }
      </div>
    </section>
  `,
  styles: [`
    :host { display: block; overflow: hidden; }

    .marquee {
      background: #eee6d8;
      border-block: 1px solid var(--color-border);
      overflow: hidden;
      width: 100%;
    }

    .track {
      display: flex;
      width: max-content;
      animation: image-marquee 42s linear infinite;
      will-change: transform;
    }

    .image-group { display: flex; flex: 0 0 auto; }

    img {
      aspect-ratio: 1 / 1;
      display: block;
      flex: 0 0 auto;
      height: clamp(104px, 9vw, 142px);
      object-fit: cover;
      width: clamp(104px, 9vw, 142px);
    }

    /* Small position changes make repeated source photography read as one
       curated campaign strip rather than duplicated cards. */
    img:nth-child(2n) { object-position: 72% center; }
    img:nth-child(3n) { object-position: 35% center; }

    @keyframes image-marquee {
      from { transform: translateX(0); }
      to { transform: translateX(-25%); }
    }

    @media (prefers-reduced-motion: reduce) {
      .track { animation-play-state: paused; }
    }

    @media (max-width: 640px) {
      img { height: 92px; width: 92px; }
      .track { animation-duration: 34s; }
    }
  `],
})
export class PromoImageMarqueeComponent {
  protected readonly images = [
    { src: '/assets/promos/khmer-fashion.webp', alt: 'Modern Cambodian fashion collection' },
    { src: '/assets/promos/silk-weaving.webp', alt: 'Cambodian artisan weaving silk' },
    { src: '/assets/promos/artisan-homeware.webp', alt: 'Handmade Cambodian homeware' },
    { src: '/assets/promos/local-pantry.webp', alt: 'Cambodian pantry goods and spices' },
    { src: '/assets/promos/botanical-beauty.webp', alt: 'Cambodian botanical beauty products' },
    { src: '/assets/promos/tropical-produce.webp', alt: 'Fresh Cambodian tropical produce' },
  ];
}
