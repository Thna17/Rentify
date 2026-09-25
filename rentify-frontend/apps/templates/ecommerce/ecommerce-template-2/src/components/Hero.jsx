import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useI18n } from '../i18n';
import { PATHS } from '../paths';
import { OwnerEditButton } from '@rentify/storefront/owner/StorefrontOwner';
import { KhmerSkyline, LeafSprig, LotusBloom, LotusLineArt } from './decor/Artwork';

const ROTATE_MS = 6000;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Editorial hero: the merchant's headline, subtitle and call to action beside
 * their photo in an arch. Several photos cross-fade; without a photo the arch
 * shows line artwork instead of stock imagery. Headline falls back to the
 * store name, so the hero always has real content.
 */
export function Hero({ identity, eyebrow = '', buttonText = '', note = '', storyLink = false }) {
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
    <section aria-labelledby="hero-title" className="relative overflow-hidden bg-gradient-to-b from-accent via-accent/50 to-background">
      <KhmerSkyline className="pointer-events-none absolute inset-x-0 bottom-0 h-28 w-full text-primary sm:h-40" />
      <OwnerEditButton section="Hero" className="absolute right-4 top-4 z-30" />
      <LeafSprig className="pointer-events-none absolute -bottom-6 -left-10 h-40 w-36 -scale-x-100 text-primary/25 sm:h-56 sm:w-48" />

      <div className="store-container relative grid items-center gap-10 pb-14 pt-10 sm:pb-16 sm:pt-14 lg:grid-cols-[1.05fr_1fr] lg:gap-8 lg:pb-20">
        <div className="max-w-xl">
          {eyebrow && (
            <p className="mb-4 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              {eyebrow}
              <span className="h-px w-8 bg-primary/50" aria-hidden="true" />
            </p>
          )}
          <h1 id="hero-title" className="font-display text-4xl font-medium leading-[1.08] text-foreground sm:text-5xl lg:text-[3.5rem]">
            {headline}
          </h1>
          {identity.heroSubtitle && <p className="mt-5 max-w-md text-base text-muted-foreground sm:text-lg">{identity.heroSubtitle}</p>}
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to={PATHS.PRODUCTS} className="btn-primary min-h-12 rounded-full px-7">
              {buttonText || t('home.shopNow')}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            {storyLink && (
              <Link to={`${PATHS.HOME}#our-story`} className="btn min-h-12 rounded-full border border-foreground/25 px-7 text-foreground hover:border-foreground/50 hover:bg-card/60">
                {t('home.ourStory')}
              </Link>
            )}
          </div>
        </div>

        <div
          className="relative mx-auto w-full max-w-[15rem] sm:max-w-sm lg:mr-0 lg:max-w-[26rem]"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <LeafSprig className="pointer-events-none absolute -right-8 -top-6 z-0 h-40 w-32 text-primary/30 sm:-right-14 sm:h-52 sm:w-44" />
          {/* Thin offset arch drawn behind the photo. */}
          <div className="absolute inset-0 translate-x-3 -translate-y-3 rounded-t-full border border-primary/30" aria-hidden="true" />
          <div className="relative aspect-[4/5] overflow-hidden rounded-t-full bg-primary/10 shadow-[0_30px_60px_-30px_oklch(var(--foreground)/0.45)]">
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
              <LotusLineArt className="absolute inset-x-0 bottom-0 mx-auto h-[85%] text-primary/45" />
            )}
          </div>
          <LotusBloom className="pointer-events-none absolute -bottom-6 -right-5 z-10 h-20 w-24 drop-shadow sm:-right-8 sm:h-24 sm:w-28" />

          {note && (
            <p className="mt-10 -rotate-3 text-center font-script text-2xl leading-tight text-primary lg:absolute lg:-left-44 lg:top-12 lg:mt-0 lg:max-w-[10rem] lg:-rotate-6 lg:text-left lg:text-3xl">
              {note}
            </p>
          )}

          {images.length > 1 && (
            <div className="mt-8 flex justify-center gap-1.5">
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
