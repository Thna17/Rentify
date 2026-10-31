import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useI18n } from '../i18n';
import { PATHS } from '../paths';
import { OwnerEditButton } from '@rentify/storefront/owner/StorefrontOwner';

const ROTATE_MS = 6000;
const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function Hero({ identity, eyebrow = '', buttonText = '', note = '', storyLink = false }) {
  const { t } = useI18n();
  const images = identity.heroImages || [];
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (images.length < 2 || paused || prefersReducedMotion()) return undefined;
    const timer = window.setInterval(() => {
      if (!document.hidden) setActive((index) => (index + 1) % images.length);
    }, ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [images.length, paused]);

  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden border-b border-border bg-gradient-to-br from-accent via-background to-background">
      <OwnerEditButton section="Hero" className="absolute right-4 top-4 z-30" />
      <div className="store-container grid items-center gap-10 py-14 sm:py-20 lg:min-h-[34rem] lg:grid-cols-2 lg:gap-16">
        <div className="relative z-10 max-w-xl">
          {eyebrow && <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.15em] text-primary"><span className="h-1.5 w-1.5 rounded-full bg-primary" />{eyebrow}</p>}
          <h1 id="hero-title" className="font-display text-4xl font-bold leading-[1.08] tracking-tight text-foreground sm:text-5xl lg:text-6xl xl:text-7xl">
            {identity.heroHeadline || identity.name}
          </h1>
          {identity.heroSubtitle && <p className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg">{identity.heroSubtitle}</p>}
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to={PATHS.PRODUCTS} className="btn-primary min-h-12 px-6">{buttonText || t('home.shopNow')}<ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
            {storyLink && <Link to={`${PATHS.HOME}#our-story`} className="btn min-h-12 border border-border px-6 text-foreground hover:bg-card">{t('home.ourStory')}</Link>}
          </div>
        </div>
        <div className="relative mx-auto w-full max-w-[34rem]" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
          <div className="absolute inset-5 rounded-full border border-primary/20" aria-hidden="true" />
          <div className="relative aspect-[5/4] overflow-hidden rounded-3xl border border-border/60 bg-accent/70">
            {images.length ? images.map((src, index) => (
              <img key={src} src={src} alt="" loading={index === 0 ? 'eager' : 'lazy'} fetchpriority={index === 0 ? 'high' : undefined} decoding="async" className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${index === active ? 'opacity-100' : 'opacity-0'}`} />
            )) : <div className="flex h-full items-center justify-center" aria-hidden="true"><Sparkles className="h-20 w-20 text-primary/40" strokeWidth={1} /></div>}
          </div>
          {note && <p className="absolute bottom-4 right-4 max-w-[70%] rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground shadow-lg">{note}</p>}
          {images.length > 1 && <div className="mt-4 flex justify-center gap-2">{images.map((src, index) => <button key={src} type="button" onClick={() => setActive(index)} aria-label={t('hero.goTo', { n: index + 1 })} aria-current={index === active ? 'true' : undefined} className={`h-2 rounded-full transition-all ${index === active ? 'w-7 bg-primary' : 'w-2 bg-primary/30 hover:bg-primary/50'}`} />)}</div>}
        </div>
      </div>
    </section>
  );
}
