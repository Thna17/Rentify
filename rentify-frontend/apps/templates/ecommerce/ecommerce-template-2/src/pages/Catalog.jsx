import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, SearchX } from 'lucide-react';
import { useGetAllProductsQuery } from '@rentify/storefront/api';
import {
  useStorefrontCategories,
  useStorefrontWebsite,
} from '@rentify/storefront/website';
import { useI18n } from '../i18n';
import { PATHS, catalogPath } from '../paths';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { ProductGrid, ProductGridSkeleton } from '../components/ProductGrid';
import { EmptyState, ErrorState } from '../components/StatusMessage';
import { CategoryRail } from '../components/CategoryRail';
import { KhmerSkyline } from '../components/decor/Artwork';
import { OwnerAddButton } from '@rentify/storefront/owner/StorefrontOwner';
import { safeUrl } from '@rentify/storefront/content';

const PAGE_SIZE = 20;
/**
 * Sort keys that work on `GET /api/product/:websiteId`. `featured` is left out:
 * the API orders it by a `feature` column the Product model does not have.
 */
export const SORT_OPTIONS = ['newest', 'price_asc', 'price_desc', 'name_asc'];

const productQuery = (websiteId, filters, page) => ({
  websiteId,
  page,
  limit: PAGE_SIZE,
  sort: filters.sort,
  ...(filters.search && { search: filters.search }),
  ...(filters.categoryId && { category: filters.categoryId }),
});

/** Pages after the first. Each page is its own cached query. */
function CatalogPage({ websiteId, filters, page, onLoaded }) {
  const { data, isLoading, isError, refetch } = useGetAllProductsQuery(
    productQuery(websiteId, filters, page)
  );
  useEffect(() => {
    if (data) onLoaded(page);
  }, [data, onLoaded, page]);

  if (isLoading)
    return <ProductGridSkeleton count={4} className="mt-3 sm:mt-4 lg:mt-5" />;
  if (isError) return <ErrorState onRetry={refetch} className="mt-5" />;
  return (
    <ProductGrid
      products={data?.products || []}
      className="mt-3 sm:mt-4 lg:mt-5"
    />
  );
}

export default function Catalog() {
  const { t } = useI18n();
  const sortId = useId();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { websiteId } = useStorefrontWebsite();
  const { categories } = useStorefrontCategories();

  const search = (params.get('search') || '').trim();
  const sort = SORT_OPTIONS.includes(params.get('sort'))
    ? params.get('sort')
    : 'newest';
  const categoryParam = params.get('category') || '';
  // Older links used the category name; resolve those to the id the API filters on.
  const category = useMemo(
    () =>
      categories.find((item) => String(item.id) === categoryParam) ||
      categories.find(
        (item) => item.name?.toLowerCase() === categoryParam.toLowerCase()
      ) ||
      null,
    [categories, categoryParam]
  );
  const filters = useMemo(
    () => ({
      search,
      sort,
      categoryId: category?.id || (categories.length ? '' : categoryParam),
    }),
    [search, sort, category, categories.length, categoryParam]
  );
  const filterKey = JSON.stringify(filters);

  const [pageState, setPageState] = useState({
    key: filterKey,
    count: 1,
    loaded: 1,
  });
  const pages =
    pageState.key === filterKey
      ? pageState
      : { key: filterKey, count: 1, loaded: 1 };

  const first = useGetAllProductsQuery(productQuery(websiteId, filters, 1), {
    skip: !websiteId,
  });
  const totalPages = first.data?.totalPages || 1;
  const totalItems = first.data?.totalItems ?? 0;
  const products = first.data?.products || [];

  const title = search
    ? t('catalog.resultsFor', { query: search })
    : category?.name || t('catalog.title');
  useDocumentTitle(search ? search : category?.name || t('catalog.title'));

  const onLoaded = useCallback(
    (page) =>
      setPageState((state) =>
        state.key === filterKey
          ? { ...state, loaded: Math.max(state.loaded, page) }
          : state
      ),
    [filterKey]
  );
  const loadMore = () =>
    setPageState({
      key: filterKey,
      count: pages.count + 1,
      loaded: pages.loaded,
    });
  const loadingMore = pages.count > pages.loaded;

  return (
    <>
      <div className="relative overflow-hidden border-b border-border bg-accent/70">
        <KhmerSkyline className="pointer-events-none absolute inset-x-0 bottom-0 h-20 w-full text-primary sm:h-24" />
        <div className="store-container relative flex items-center gap-5 py-8 sm:py-10">
          <div className="absolute right-4 top-4 flex gap-2 sm:right-6 lg:right-8">
            <OwnerAddButton kind="product" categoryId={category?.id} />
            {!category && <OwnerAddButton kind="category" />}
          </div>
          {category && safeUrl(category.image) && (
            <img
              src={safeUrl(category.image)}
              alt=""
              className="h-24 w-20 shrink-0 rounded-t-full border-4 border-card object-cover shadow-sm sm:h-28 sm:w-24"
            />
          )}
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              {category ? t('nav.categories') : t('nav.shopAll')}
            </p>
            <h1 className="mt-2 font-display text-3xl font-medium leading-tight text-foreground sm:text-4xl">
              {title}
            </h1>
            {first.isSuccess && (
              <p
                className="mt-1 text-sm text-muted-foreground"
                aria-live="polite"
              >
                {t('catalog.count', { count: totalItems })}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="store-container py-6 sm:py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <CategoryRail
            categories={categories}
            activeId={category?.id || ''}
            search={search}
            sort={sort === 'newest' ? '' : sort}
            className="min-w-0 flex-1"
          />
          <div className="flex shrink-0 items-center gap-2">
            <label htmlFor={sortId} className="text-sm text-muted-foreground">
              {t('catalog.sort')}
            </label>
            <select
              id={sortId}
              value={sort}
              onChange={(event) =>
                navigate(
                  catalogPath({
                    search,
                    category: category?.id || categoryParam,
                    sort: event.target.value,
                  }),
                  { replace: true }
                )
              }
              className="h-10 rounded-full border border-input bg-card px-4 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/25"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {t(`sort.${option}`)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6">
          {first.isLoading || !websiteId ? (
            <ProductGridSkeleton count={8} />
          ) : first.isError ? (
            <ErrorState onRetry={first.refetch} />
          ) : products.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title={t('catalog.emptyTitle')}
              body={t('catalog.emptyBody')}
            >
              <button
                type="button"
                className="btn-outline"
                onClick={() => navigate(PATHS.PRODUCTS)}
              >
                {t('catalog.clear')}
              </button>
            </EmptyState>
          ) : (
            <>
              <ProductGrid products={products} priorityCount={2} />
              {Array.from({ length: pages.count - 1 }, (_, index) => (
                <CatalogPage
                  key={index + 2}
                  websiteId={websiteId}
                  filters={filters}
                  page={index + 2}
                  onLoaded={onLoaded}
                />
              ))}
              {pages.count < totalPages && (
                <div className="mt-8 flex justify-center">
                  <button
                    type="button"
                    className="btn-outline min-w-40"
                    onClick={loadMore}
                    disabled={loadingMore}
                  >
                    {loadingMore && (
                      <Loader2
                        className="h-4 w-4 animate-spin"
                        aria-hidden="true"
                      />
                    )}
                    {t('catalog.loadMore')}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
