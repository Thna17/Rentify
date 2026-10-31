import { Sparkles } from 'lucide-react';
import { OwnerEditButton } from '@rentify/storefront/owner/StorefrontOwner';
import { useI18n } from '../i18n';

export function StoryBand({ story }) {
  const { t } = useI18n();
  return (
    <section id="our-story" aria-labelledby="story-title" className="store-container">
      <div className="relative grid overflow-hidden rounded-3xl border border-border bg-card md:grid-cols-2">
        <OwnerEditButton section="Our Story" className="absolute right-4 top-4 z-10" />
        <div className="relative aspect-[4/3] bg-accent md:aspect-auto md:min-h-[24rem]">
          {story.image ? <img src={story.image} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" /> : <div className="flex h-full min-h-[14rem] items-center justify-center" aria-hidden="true"><Sparkles className="h-20 w-20 text-primary/40" strokeWidth={1} /></div>}
        </div>
        <div className="flex flex-col justify-center p-7 sm:p-12 lg:p-16">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-primary">{t('home.ourStory')}</p>
          <h2 id="story-title" className="font-display text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl">{story.title}</h2>
          {story.text && <p className="mt-5 whitespace-pre-line text-base leading-relaxed text-muted-foreground">{story.text}</p>}
        </div>
      </div>
    </section>
  );
}
