import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { safeUrl } from '@rentify/storefront/content';
import { useI18n } from '../i18n';
import { catalogPath } from '../paths';
import { LotusLineArt } from './decor/Artwork';

/**
 * Category cards with the photo in an arch. Categories come from the store's
 * catalog; a category without a photo shows line artwork. Scrolls sideways
 * on phones and becomes a grid from tablet width.
 */
export function CategoryCards({ categories }) {
  const { t } = useI18n();
  if (!categories?.length) return null;
  return (
    <ul className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-5 sm:overflow-visible sm:px-0 lg:grid-cols-4">
      {categories.map((category) => {
        const image = safeUrl(category.image);
        return (
          <li key={category.id} className="w-[46%] shrink-0 snap-start sm:w-auto">
            <Link
              to={catalogPath({ category: category.id })}
              aria-label={t('home.exploreNamed', { name: category.name })}
              className="group flex h-full flex-col rounded-[1.75rem] border border-border bg-card p-2 transition-shadow hover:shadow-[0_18px_40px_-26px_oklch(var(--foreground)/0.45)]"
            >
              <span className="block aspect-[4/3] overflow-hidden rounded-t-full rounded-b-2xl bg-accent">
                {image ? (
                  <img
                    src={image}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <LotusLineArt className="mx-auto h-full text-primary/40" />
                )}
              </span>
              <span className="flex items-center justify-between gap-3 px-2 pb-2 pt-3">
                <span className="line-clamp-2 font-display text-[0.9375rem] font-medium leading-snug text-foreground sm:text-lg">{category.name}</span>
                <span
                  className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full border sm:flex border-foreground/25 text-foreground transition-colors group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground"
                  aria-hidden="true"
                >
                  <ChevronRight className="h-4 w-4" />
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
