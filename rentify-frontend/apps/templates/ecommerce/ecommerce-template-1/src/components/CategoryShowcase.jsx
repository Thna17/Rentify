import { Link } from 'react-router-dom';
import { safeUrl } from '@rentify/storefront/content';
import { catalogPath } from '../paths';

/**
 * Category tiles framed as temple-gate arches: an outlined arch with the
 * category photo inset inside it. Scrolls sideways on phones, grid on desktop.
 */
export function CategoryShowcase({ categories }) {
  if (!categories?.length) return null;
  return (
    <ul className="scrollbar-none -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-4 sm:gap-5 sm:overflow-visible sm:px-0 lg:grid-cols-6">
      {categories.map((category) => {
        const image = safeUrl(category.image);
        return (
          <li key={category.id} className="w-28 shrink-0 snap-start sm:w-auto">
            <Link to={catalogPath({ category: category.id })} className="group block text-center">
              <span className="block rounded-t-full border-2 border-foreground/70 bg-card p-1.5 shadow-sm transition-transform duration-200 group-hover:-translate-y-1">
                <span className="block aspect-[3/4] overflow-hidden rounded-t-full bg-primary/10">
                  {image ? (
                    <img src={image} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-3xl font-bold text-primary" aria-hidden="true">
                      {category.name?.charAt(0)}
                    </span>
                  )}
                </span>
              </span>
              <span className="mt-2 line-clamp-2 block text-sm font-semibold leading-snug text-foreground group-hover:text-primary">
                {category.name}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
