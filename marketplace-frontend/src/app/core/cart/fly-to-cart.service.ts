import { Injectable } from '@angular/core';

/**
 * Animates a product thumbnail flying from wherever "Add to cart" was
 * clicked to the cart icon in the header, so adding to cart has a visible,
 * satisfying result instead of a silent count bump.
 *
 * The motion is a real projectile arc (quadratic in Y, linear in X, like
 * something thrown rather than a shape sliding along a fixed bezier path),
 * with a slight tumble and speed-based motion blur so it reads as an object
 * with mass, not a UI widget cross-fading across the screen.
 *
 * The cart icon registers itself once (from the navbar); every product card
 * then just calls fly() with its own image and source element.
 */
@Injectable({ providedIn: 'root' })
export class FlyToCartService {
  private cartTarget: HTMLElement | null = null;
  private revealCartTarget: (() => boolean) | null = null;

  registerCartTarget(el: HTMLElement, reveal?: () => boolean): void {
    this.cartTarget = el;
    this.revealCartTarget = reveal ?? null;
  }

  fly(
    imageUrl: string | null | undefined,
    sourceEl: HTMLElement,
    productName = 'Product',
  ): void {
    const target = this.cartTarget;
    if (!target) return;

    // The shopper may have scrolled far enough for the auto-hiding navbar to
    // be off-screen. Reveal it first, then wait for its slide-down transition
    // before measuring the bag position; otherwise the product would fly to
    // the old, invisible coordinates above the viewport.
    const wasHidden = this.revealCartTarget?.() ?? false;
    if (wasHidden) {
      window.setTimeout(
        () => this.animateFlight(imageUrl, sourceEl, target, productName),
        560,
      );
      return;
    }

    this.animateFlight(imageUrl, sourceEl, target, productName);
  }

  private animateFlight(
    imageUrl: string | null | undefined,
    sourceEl: HTMLElement,
    target: HTMLElement,
    productName: string,
  ): void {

    const from = sourceEl.getBoundingClientRect();
    const to = target.getBoundingClientRect();

    const size = 72;
    const ghost = document.createElement(imageUrl ? 'img' : 'div');
    if (imageUrl) {
      (ghost as HTMLImageElement).src = imageUrl;
    } else {
      ghost.textContent = productName.trim().charAt(0).toUpperCase();
      ghost.setAttribute('aria-hidden', 'true');
    }
    ghost.style.position = 'fixed';
    ghost.style.zIndex = '9999';
    ghost.style.left = '0';
    ghost.style.top = '0';
    ghost.style.width = `${size}px`;
    ghost.style.height = `${size}px`;
    ghost.style.borderRadius = '14px';
    ghost.style.objectFit = 'cover';
    ghost.style.pointerEvents = 'none';
    ghost.style.background = imageUrl
      ? 'transparent'
      : 'linear-gradient(145deg, var(--color-accent, #8e3021), var(--color-accent-hover, #6e2419))';
    ghost.style.border = '3px solid rgba(255, 254, 250, .96)';
    ghost.style.boxShadow = '0 12px 30px rgba(58, 31, 24, .35), 0 0 0 5px rgba(142, 48, 33, .16)';
    ghost.style.color = '#fffefa';
    ghost.style.display = 'grid';
    ghost.style.placeItems = 'center';
    ghost.style.fontFamily = 'var(--font-heading, serif)';
    ghost.style.fontSize = '30px';
    ghost.style.fontWeight = '800';
    ghost.style.willChange = 'transform, opacity, filter';
    document.body.appendChild(ghost);

    const startX = from.left + from.width / 2 - size / 2;
    const startY = from.top + from.height / 2 - size / 2;
    const endX = to.left + to.width / 2 - size / 2;
    const endY = to.top + to.height / 2 - size / 2;

    // How far it's travelling controls how high the arc lifts and how much
    // blur/tilt reads as "fast" — a short hop shouldn't blur like a long throw.
    const dx = endX - startX;
    const dy = endY - startY;
    const distance = Math.hypot(dx, dy);
    const liftHeight = Math.min(160, Math.max(60, distance * 0.35));

    const duration = 1500;
    const steps = 24;
    const keyframes: Keyframe[] = [];

    for (let i = 0; i <= steps; i++) {
      const t = i / steps; // 0..1 through the flight

      // X: eases in then out (accelerates off the card, decelerates into
      // the cart) rather than constant speed, which is what a slide feels
      // like; an object being tossed speeds up and slows down.
      const ex = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const x = startX + dx * ex;

      // Y: a real parabola — rises against "gravity" then falls back down,
      // offset onto the straight start->end line so it still lands exactly
      // on the cart icon regardless of whether that's above or below start.
      const arc = -4 * liftHeight * t * (t - 1); // 0 at t=0/1, peak at t=0.5
      const rawY = startY + dy * t - arc;
      // A long horizontal throw near the sticky header can create such a
      // high parabola that the token briefly travels above the viewport. Keep
      // its top edge inside the screen so the entire journey remains visible.
      const y = Math.max(8, rawY);

      // Scale shrinks as it approaches the cart (perspective: it's moving
      // "into" a small target), non-linearly so most of the shrink happens
      // near the end, like it's being drawn into the icon.
      const scale = 1 - 0.8 * Math.pow(t, 1.6);

      // Tumble: a small rotation that oscillates rather than spinning
      // continuously, like a tossed object wobbling in the air.
      const rotate = Math.sin(t * Math.PI * 1.6) * 14 * (1 - t * 0.6);

      // Motion blur peaks mid-flight where speed is highest, and there is
      // none at rest at either end — a still object is never blurred.
      const speed = Math.sin(t * Math.PI); // 0 at ends, 1 at midpoint
      const blur = speed * 3.5;

      // Fade only begins near the very end, as it's absorbed into the icon.
      const opacity = t < 0.82 ? 1 : 1 - (t - 0.82) / 0.18;

      keyframes.push({
        transform: `translate(${x}px, ${y}px) scale(${scale}) rotate(${rotate}deg)`,
        filter: `blur(${blur.toFixed(2)}px)`,
        opacity,
        offset: t,
      });
    }

    const animation = ghost.animate(keyframes, {
      duration,
      easing: 'linear', // the easing is already baked into the keyframes themselves
      fill: 'forwards',
    });

    animation.onfinish = () => {
      ghost.remove();
      this.bumpCart(target);
    };
  }

  private bumpCart(target: HTMLElement): void {
    // A squash-and-stretch impact rather than a plain scale-up: it
    // compresses on contact, overshoots wide, then settles — the same
    // language as something physically landing on the icon.
    target.animate(
      [
        { transform: 'scale(1, 1)', offset: 0 },
        { transform: 'scale(1.15, 0.82)', offset: 0.18 },
        { transform: 'scale(0.9, 1.22)', offset: 0.4 },
        { transform: 'scale(1.08, 0.95)', offset: 0.62 },
        { transform: 'scale(0.98, 1.02)', offset: 0.82 },
        { transform: 'scale(1, 1)', offset: 1 },
      ],
      { duration: 700, easing: 'ease-out' },
    );
  }
}
