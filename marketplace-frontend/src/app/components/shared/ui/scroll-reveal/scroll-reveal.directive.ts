import { AfterViewInit, Directive, ElementRef, OnDestroy, inject, input } from '@angular/core';

/**
 * Reveals its host element (fade + rise) the moment it scrolls into view,
 * instead of gating content behind a click. Attach `[kcReveal]="i"` inside a
 * `@for` loop to stagger a list one item at a time as the user scrolls down.
 *
 * GPU-only (opacity/transform via the global `.kc-reveal` classes in
 * styles.css) and disabled entirely under prefers-reduced-motion, where the
 * element is just shown immediately.
 */
@Directive({
  selector: '[kcReveal]',
})
export class ScrollReveal implements AfterViewInit, OnDestroy {
  /** Position within a list — each step adds a small stagger delay. */
  readonly kcReveal = input<number>(0);

  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private observer?: IntersectionObserver;

  ngAfterViewInit(): void {
    const node = this.elementRef.nativeElement;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduceMotion || typeof IntersectionObserver === 'undefined') {
      node.classList.add('kc-reveal-visible');
      return;
    }

    node.classList.add('kc-reveal');
    node.style.transitionDelay = `${Math.min(this.kcReveal(), 7) * 85}ms`;

    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            node.classList.add('kc-reveal-visible');
            this.observer?.unobserve(node);
          }
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -10% 0px' },
    );
    this.observer.observe(node);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
