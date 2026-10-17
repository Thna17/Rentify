import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Clock3 } from 'lucide-react';
import { useI18n } from '../i18n';
import { PATHS } from '../paths';
import { OwnerEditButton } from '@rentify/storefront/owner/StorefrontOwner';
import { BeanScatter, CoffeeBean, SteamCup } from './decor/Artwork';
import { OpenStatus } from './OpenStatus';

const ROTATE_MS = 6000;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Café hero: the merchant's headline, subtitle and two actions (order, see the
 * menu) beside their photos in a rounded frame. Several photos cross-fade;
 * without a photo the frame shows a steaming cup instead of stock imagery. The
 * "Open now" chip appears only when the merchant's opening hours can be read.
 */
export function Hero({ identity, eyebrow = '', buttonText = '', note = '', hours = [] }) {
  const { t } = useI18n();
  const images = identity.heroImages;
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const headline = identity.heroHeadline || identity.name;

  useEffect(() => {
    if (images.length < 2 || paused || prefersReducedMotion()) return undefined;
    const timer = window.setInterval(() => {
      if (!document.hidden) setActive((index) => (index + 1) % images.length);
    }, ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [images.length, paused]);

  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden bg-accent">
      <BeanScatter className="pointer-events-none absolute inset-x-0 top-0 h-32 w-full text-primary/15" />
      <OwnerEditButton section="Hero" className="absolute right-4 top-4 z-30" />

      <div className="store-container relative grid items-center gap-10 pb-16 pt-10 sm:pt-14 lg:grid-cols-[1.1fr_1fr] lg:gap-12 lg:pb-24 lg:pt-16">
        <div className="max-w-xl">
          <div className="mb-5 flex flex-wrap items-center gap-2">
            {eyebrow && (
              <p className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-card/70 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                <CoffeeBean className="h-3.5 w-2.5" />
                {eyebrow}
              </p>
            )}
            <OpenStatus hours={hours} />
          </div>
          <h1 id="hero-title" className="font-display text-[2.5rem] font-semibold leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            {headline}
          </h1>
          {identity.heroSubtitle && (
            <p className="mt-5 max-w-md whitespace-pre-line text-base text-muted-foreground sm:text-lg">{identity.heroSubtitle}</p>
          )}
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to={PATHS.PRODUCTS} className="btn-primary min-h-12 rounded-full px-7 shadow-[0_14px_30px_-16px_oklch(var(--primary)/0.9)]">
              {buttonText || t('home.orderNow')}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              to={`${PATHS.HOME}#menu`}
              className="btn min-h-12 rounded-full border border-foreground/20 bg-card/60 px-7 text-foreground hover:border-foreground/40 hover:bg-card"
            >
              {t('home.seeMenu')}
            </Link>
          </div>
          {hours.length > 0 && (
            <Link
              to={`${PATHS.HOME}#visit`}
              className="mt-6 inline-flex items-center gap-2 rounded text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              <Clock3 className="h-4 w-4 text-primary" aria-hidden="true" />
              {t('visit.hoursLink')}
            </Link>
          )}
        </div>

        <div
          className="relative mx-auto w-full max-w-[18rem] sm:max-w-sm lg:mr-0 lg:max-w-md"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          {/* A saucer-like disc behind the photo. */}
          <div className="absolute -inset-4 rounded-[2.5rem] bg-primary/10 sm:-inset-6" aria-hidden="true" />
          <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] bg-card shadow-[0_40px_70px_-40px_oklch(var(--foreground)/0.6)]">
            {images.length > 0 ? (
              images.map((src, index) => (
                <img
                  key={src}
                  src={src}
                  alt=""
                  loading={index === 0 ? 'eager' : 'lazy'}
                  fetchpriority={index === 0 ? 'high' : undefined}
                  decoding="async"
                  className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${index === active ? 'opacity-100' : 'opacity-0'}`}
                />
              ))
            ) : (
              <SteamCup className="absolute inset-0 m-auto h-3/5 w-3/5 text-primary/60" />
            )}
          </div>

          {note && (
            <p className="absolute -bottom-5 left-1/2 w-max max-w-[20rem] -translate-x-1/2 -rotate-2 rounded-2xl bg-secondary px-5 py-2.5 text-center font-script text-2xl leading-tight text-secondary-foreground shadow-lg sm:-left-10 sm:translate-x-0 lg:-left-16 lg:text-3xl">
              {note}
            </p>
          )}

          {images.length > 1 && (
            <div className={`${note ? 'mt-12' : 'mt-6'} flex justify-center gap-1.5`}>
              {images.map((src, index) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setActive(index)}
                  aria-label={t('hero.goTo', { n: index + 1 })}
                  aria-current={index === active ? 'true' : undefined}
                  className={`h-1.5 rounded-full transition-all ${index === active ? 'w-6 bg-primary' : 'w-1.5 bg-primary/30 hover:bg-primary/50'}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
