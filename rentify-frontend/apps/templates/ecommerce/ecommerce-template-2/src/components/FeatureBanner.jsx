import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { OwnerEditButton } from '@rentify/storefront/owner/StorefrontOwner';
import { useI18n } from '../i18n';
import { LeafSprig, LotusLineArt } from './decor/Artwork';

/**
 * Full-bleed editorial banner: the merchant's photo on one side, their
 * message and button on the other. Store links stay in the app; external
 * links open in a new tab.
 */
export function FeatureBanner({ feature }) {
  const { t } = useI18n();
  const { eyebrow, title, text, image, buttonText, link, note } = feature;
  const label = buttonText || t('home.shopNow');
  const button = 'btn-primary min-h-12 rounded-full px-7';
  const content = (
    <>
      {label}
      <ArrowRight className="h-4 w-4" aria-hidden="true" />
    </>
  );

  return (
    <section aria-labelledby="feature-title" className="relative overflow-hidden">
      <OwnerEditButton section="Feature Banner" className="absolute right-4 top-4 z-20" />
      <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-0">
        <div className="relative aspect-[16/10] overflow-hidden bg-accent sm:aspect-[2/1] lg:aspect-auto lg:h-full lg:min-h-[22rem] lg:rounded-r-[2rem]">
          {image ? (
            <img src={image} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <LeafSprig className="absolute inset-y-6 left-1/2 h-[80%] -translate-x-1/2 text-primary/30" />
          )}
        </div>

        <div className="store-container relative lg:mx-0 lg:max-w-none lg:px-12 xl:px-16">
          <LotusLineArt className="pointer-events-none absolute -top-10 right-2 hidden h-72 w-44 text-primary/25 sm:block lg:right-6" />
          <div className="relative max-w-lg pb-4 lg:py-12">
            {eyebrow && (
              <p className="mb-3 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                <span className="h-px w-6 bg-primary/50" aria-hidden="true" />
                {eyebrow}
              </p>
            )}
            <h2 id="feature-title" className="font-display text-3xl font-medium leading-tight text-foreground sm:text-4xl">
              {title}
            </h2>
            {text && <p className="mt-4 text-base text-muted-foreground">{text}</p>}
            <div className="mt-7">
              {link.external ? (
                <a href={link.to} target="_blank" rel="noopener noreferrer" className={button}>
                  {content}
                </a>
              ) : (
                <Link to={link.to} className={button}>
                  {content}
                </Link>
              )}
            </div>
            {note && <p className="mt-8 -rotate-3 font-script text-2xl text-primary sm:text-3xl">{note}</p>}
          </div>
        </div>
      </div>
    </section>
  );
}
