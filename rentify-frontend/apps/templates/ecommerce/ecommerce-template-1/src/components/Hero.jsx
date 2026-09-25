import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useI18n } from '../i18n';
import { PATHS } from '../paths';
import { KhmerSkyline, LotusBloom } from './decor/Artwork';

const AUTOPLAY_MS = 6000;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Merchant banner: their hero images only (no overlay text), as a compact
 * swipeable carousel inside a framed stage with lotus corners and a temple
 * skyline base. Advances on its own unless the shopper is interacting, the
 * tab is hidden, or reduced motion is requested. Renders nothing without images.
 */
export function Hero({ identity }) {
  const { t } = useI18n();
  const track = useRef(null);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const images = identity.heroImages;
  const count = images.length;

  const scrollTo = useCallback(
    (index) => {
      const node = track.current;
      if (!node || !count) return;
      const next = (index + count) % count;
      node.scrollTo({ left: next * node.clientWidth, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    },
    [count]
  );

  useEffect(() => {
    if (count < 2 || paused || prefersReducedMotion()) return undefined;
    const timer = window.setInterval(() => {
      if (!document.hidden) scrollTo(active + 1);
    }, AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [active, count, paused, scrollTo]);

  if (!count) return null;

  const onScroll = () => {
    const node = track.current;
    if (node?.clientWidth) setActive(Math.round(node.scrollLeft / node.clientWidth));
  };

  const arrow =
    'absolute top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border-2 border-foreground/70 bg-card/90 text-foreground shadow-sm transition-colors hover:bg-card sm:flex';

  return (
    <section
      aria-roledescription="carousel"
      aria-label={identity.heroHeadline || identity.name || t('hero.region')}
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <LotusBloom className="pointer-events-none absolute -right-2 -top-7 z-20 h-14 w-16 drop-shadow-sm sm:-right-5 sm:-top-10 sm:h-20 sm:w-24" />
      <LotusBloom className="pointer-events-none absolute -bottom-5 -left-3 z-20 h-10 w-11 -scale-x-100 drop-shadow-sm sm:-bottom-6 sm:-left-5 sm:h-14 sm:w-16" />

      <div className="relative overflow-hidden rounded-[1.75rem] border-2 border-foreground/70 bg-primary/10 p-1.5 shadow-sm sm:p-2">
        <div className="relative overflow-hidden rounded-[1.25rem] bg-muted">
          <div
            ref={track}
            onScroll={onScroll}
            className="scrollbar-none flex aspect-[2/1] snap-x snap-mandatory overflow-x-auto sm:aspect-[3/1] lg:aspect-[7/2]"
          >
            {images.map((src, index) => (
              <Link
                key={src}
                to={PATHS.PRODUCTS}
                className="relative block h-full w-full shrink-0 snap-center"
                aria-roledescription="slide"
                aria-label={`${t('home.shopNow')} (${index + 1} / ${count})`}
                tabIndex={index === active ? 0 : -1}
              >
                <img
                  src={src}
                  alt=""
                  loading={index === 0 ? 'eager' : 'lazy'}
                  fetchpriority={index === 0 ? 'high' : undefined}
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              </Link>
            ))}
          </div>

          {count > 1 && (
            <>
              <button type="button" onClick={() => scrollTo(active - 1)} aria-label={t('hero.previous')} className={`${arrow} left-3`}>
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>
              <button type="button" onClick={() => scrollTo(active + 1)} aria-label={t('hero.next')} className={`${arrow} right-3`}>
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
              <div className="absolute inset-x-0 bottom-2.5 z-10 flex justify-center sm:bottom-3">
                <div className="flex items-center gap-1.5 rounded-full bg-foreground/35 px-2 py-1 backdrop-blur-sm">
                  {images.map((src, index) => (
                    <button
                      key={src}
                      type="button"
                      onClick={() => scrollTo(index)}
                      aria-label={t('hero.goTo', { n: index + 1 })}
                      aria-current={index === active ? 'true' : undefined}
                      className={`h-1.5 rounded-full transition-all ${index === active ? 'w-5 bg-white' : 'w-1.5 bg-white/60 hover:bg-white/80'}`}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Stage base: the temple skyline runs along the bottom of the frame. */}
        <KhmerSkyline className="pointer-events-none mt-1 h-9 w-full text-primary sm:h-14" />
      </div>
    </section>
  );
}
