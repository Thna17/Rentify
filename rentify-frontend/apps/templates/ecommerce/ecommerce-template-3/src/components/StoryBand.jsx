import { OwnerEditButton } from '@rentify/storefront/owner/StorefrontOwner';
import { useI18n } from '../i18n';
import { BeanScatter, LatteArt } from './decor/Artwork';

/** "Our story": the café's own words, with their photo or latte art. */
export function StoryBand({ story }) {
  const { t } = useI18n();
  return (
    <section id="our-story" aria-labelledby="story-title" className="relative overflow-hidden bg-accent">
      <BeanScatter className="pointer-events-none absolute inset-x-0 bottom-0 h-28 w-full text-primary/15 sm:h-36" />
      <OwnerEditButton section="Our Story" className="absolute right-4 top-4 z-10" />
      <div className="store-container relative grid items-center gap-8 py-12 sm:py-16 md:grid-cols-[minmax(0,18rem)_1fr] lg:grid-cols-[minmax(0,22rem)_1fr] lg:gap-14">
        <div className="relative mx-auto w-full max-w-[16rem] md:max-w-none">
          {story.image ? (
            <div className="aspect-[4/5] overflow-hidden rounded-[2rem] border-4 border-card shadow-[0_24px_50px_-30px_oklch(var(--foreground)/0.5)]">
              <img src={story.image} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
            </div>
          ) : (
            <LatteArt className="mx-auto w-full text-primary/45" />
          )}
        </div>
        <div className="max-w-xl pb-10 md:pb-0">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary">{t('home.ourStory')}</p>
          <h2 id="story-title" className="font-display text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl">
            {story.title}
          </h2>
          {story.text && <p className="mt-4 whitespace-pre-line text-base text-muted-foreground">{story.text}</p>}
        </div>
      </div>
    </section>
  );
}
