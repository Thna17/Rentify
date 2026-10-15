import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Coffee } from 'lucide-react';
import { useGetAllProductsQuery, useGetProductsByCategoryQuery } from '@rentify/storefront/api';
import { OwnerAddButton, OwnerEditButton } from '@rentify/storefront/owner/StorefrontOwner';
import { useI18n } from '../i18n';
import { catalogPath } from '../paths';
import { MenuList, MenuListSkeleton } from './MenuList';
import { EmptyState, ErrorState } from './StatusMessage';

export const MENU_LIMIT = 8;
const MAX_TABS = 8;

const tabClass = (active) =>
  `shrink-0 snap-start rounded-full px-4 py-2 text-sm font-medium transition-colors ${
    active ? 'bg-secondary text-secondary-foreground' : 'bg-card text-foreground/75 ring-1 ring-inset ring-border hover:text-foreground hover:ring-foreground/25'
  }`;

/** The items for the chosen tab: every product, or one category. */
function useMenuProducts(websiteId, categoryId) {
  const all = useGetAllProductsQuery(
    { websiteId, page: 1, limit: MENU_LIMIT, sort: 'newest' },
    { skip: !websiteId || Boolean(categoryId) }
  );
  const byCategory = useGetProductsByCategoryQuery(
    { websiteId, categoryId, page: 1, limit: MENU_LIMIT, sort: 'newest' },
    { skip: !websiteId || !categoryId }
  );
  return categoryId ? byCategory : all;
}

/**
 * "Our menu" on the home page: the café's real categories as tabs over a
 * two-column menu. Switching tabs stays on the page; "Full menu" opens the
 * catalog filtered the same way.
 */
export function MenuSection({ websiteId, categories, title = '', note = '' }) {
  const { t } = useI18n();
  const [categoryId, setCategoryId] = useState('');
  const tabs = categories.slice(0, MAX_TABS);
  const query = useMenuProducts(websiteId, categoryId);
  // currentData is empty while a newly chosen tab loads, so the previous tab's items never show under the new tab.
  const data = query.currentData;
  const products = data?.products || [];
  const total = data?.totalItems ?? products.length;
  const loading = !websiteId || (!data && !query.isError);

  return (
    <section id="menu" aria-labelledby="menu-title" className="relative bg-accent/60 py-14 sm:py-20">
      <div className="store-container relative">
        <div className="absolute -top-2 right-4 flex gap-2 sm:right-6 lg:right-8">
          <OwnerEditButton section="Menu" />
          <OwnerAddButton kind="product" categoryId={categoryId || undefined} />
          <OwnerAddButton kind="category" />
        </div>

        <div className="mx-auto max-w-2xl text-center">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            <Coffee className="h-4 w-4" aria-hidden="true" />
            {t('menu.eyebrow')}
          </p>
          <h2 id="menu-title" className="mt-3 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {title || t('menu.title')}
          </h2>
        </div>

        {tabs.length > 0 && (
          <div
            role="group"
            aria-label={t('nav.categories')}
            className="scrollbar-none -mx-4 mt-8 flex snap-x scroll-px-4 gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:justify-center sm:overflow-visible sm:px-0"
          >
            <button type="button" className={tabClass(!categoryId)} aria-pressed={!categoryId} onClick={() => setCategoryId('')}>
              {t('category.all')}
            </button>
            {tabs.map((category) => (
              <button
                key={category.id}
                type="button"
                className={tabClass(categoryId === category.id)}
                aria-pressed={categoryId === category.id}
                onClick={() => setCategoryId(category.id)}
              >
                {category.name}
              </button>
            ))}
          </div>
        )}

        <div className="mx-auto mt-8 max-w-6xl rounded-[2rem] border border-border bg-background/80 p-3 sm:p-5">
          {loading ? (
            <MenuListSkeleton count={categoryId ? 4 : 6} />
          ) : query.isError ? (
            <ErrorState onRetry={query.refetch} />
          ) : products.length === 0 ? (
            <EmptyState icon={Coffee} title={t(categoryId ? 'menu.emptyCategory' : 'home.emptyTitle')} body={t(categoryId ? 'menu.emptyCategoryBody' : 'home.emptyBody')} />
          ) : (
            <MenuList products={products} priorityCount={2} />
          )}
        </div>

        {note && <p className="mx-auto mt-5 max-w-2xl whitespace-pre-line text-center text-sm text-muted-foreground">{note}</p>}

        {total > products.length && (
          <div className="mt-8 flex justify-center">
            <Link to={catalogPath({ category: categoryId })} className="btn-outline min-h-12 rounded-full px-7">
              {t('menu.fullMenu')}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
