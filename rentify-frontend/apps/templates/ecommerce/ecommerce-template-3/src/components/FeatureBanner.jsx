import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { OwnerEditButton } from '@rentify/storefront/owner/StorefrontOwner';
import { useI18n } from '../i18n';
import { CoffeeBean, SteamCup } from './decor/Artwork';

/**
 * Full-bleed editorial banner: the merchant's photo on one side, their
 * message and button on the other. Store links stay in the app; external
 * links open in a new tab.
 */
export function FeatureBanner({ feature }) {
  const { t } = useI18n();
  const { eyebrow, title, text, image, buttonText, link, note } = feature;
  const label = buttonText || t('home.orderNow');
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
        <div className="relative aspect-[16/10] overflow-hidden bg-accent sm:aspect-[2/1] lg:aspect-auto lg:h-full lg:min-h-[24rem] lg:rounded-r-[2.5rem]">
          {image ? (
            <img src={image} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <SteamCup className="absolute inset-0 m-auto h-3/4 w-3/4 text-primary/35" />
          )}
        </div>

        <div className="store-container relative lg:mx-0 lg:max-w-none lg:px-12 xl:px-16">
          <CoffeeBean className="pointer-events-none absolute -top-4 right-6 hidden h-24 w-16 rotate-12 text-primary/20 sm:block lg:right-10" />
          <div className="relative max-w-lg pb-4 lg:py-12">
            {eyebrow && (
              <p className="mb-3 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                <span className="h-px w-6 bg-primary/50" aria-hidden="true" />
                {eyebrow}
              </p>
            )}
            <h2 id="feature-title" className="font-display text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl">
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
            {note && <p className="mt-8 inline-block -rotate-2 rounded-xl bg-secondary px-4 py-1.5 font-script text-2xl text-secondary-foreground sm:text-3xl">{note}</p>}
          </div>
        </div>
      </div>
    </section>
  );
}
