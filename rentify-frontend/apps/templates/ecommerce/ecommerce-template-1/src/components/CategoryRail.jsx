import { Link } from 'react-router-dom';
import { useI18n } from '../i18n';
import { catalogPath } from '../paths';

/**
 * Horizontally scrolling category chips. Keeps search and sort when switching
 * category so filters combine.
 */
export function CategoryRail({ categories, activeId = '', search = '', sort = '', className = '' }) {
  const { t } = useI18n();
  if (!categories?.length) return null;

  const chip = (active) =>
    `inline-flex min-h-9 shrink-0 items-center whitespace-nowrap rounded-full border px-4 text-sm font-medium transition-colors ${
      active
        ? 'border-primary bg-primary text-primary-foreground'
        : 'border-border bg-card text-foreground hover:border-primary/40 hover:text-primary'
    }`;

  return (
    <nav aria-label={t('nav.categories')} className={className}>
      <ul className="scrollbar-none -mx-4 flex snap-x gap-2 overflow-x-auto px-4 py-1 sm:mx-0 sm:flex-wrap sm:px-0">
        <li className="snap-start">
          <Link to={catalogPath({ search, sort })} className={chip(!activeId)} aria-current={!activeId ? 'page' : undefined}>
            {t('category.all')}
          </Link>
        </li>
        {categories.map((category) => {
          const active = String(category.id) === String(activeId);
          return (
            <li key={category.id} className="snap-start">
              <Link
                to={catalogPath({ category: category.id, search, sort })}
                className={chip(active)}
                aria-current={active ? 'page' : undefined}
              >
                {category.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
