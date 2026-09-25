import { useEffect } from 'react';
import { PackageOpen } from 'lucide-react';
import { useGetAllProductsQuery, useGetProductsByCategoryQuery } from '@rentify/storefront/api';
import { useStorefrontCategories, useStorefrontWebsite } from '@rentify/storefront/website';
import { trackStorefrontEvent } from '@rentify/storefront/analytics';
import { useI18n } from '../i18n';
import { catalogPath } from '../paths';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useInView } from '../hooks/useInView';
import { Hero } from '../components/Hero';
import { CategoryShowcase } from '../components/CategoryShowcase';
import { SectionTitle } from '../components/SectionTitle';
import { ProductGrid, ProductGridSkeleton } from '../components/ProductGrid';
import { EmptyState, ErrorState } from '../components/StatusMessage';
import { OwnerAddButton, OwnerEditButton, OwnerSectionPlaceholder } from '@rentify/storefront/owner/StorefrontOwner';

const SECTION_LIMIT = 8;
const MAX_CATEGORY_SECTIONS = 6;

/** One category's latest products, fetched only when the section nears the viewport. */
function CategorySection({ category, websiteId }) {
  const [ref, inView] = useInView();
  const { data, isLoading, isError, refetch } = useGetProductsByCategoryQuery(
    { websiteId, categoryId: category.id, page: 1, limit: SECTION_LIMIT, sort: 'newest' },
    { skip: !inView }
  );
  const products = data?.products || [];

  // Hide categories without published products instead of showing empty shelves.
  if (inView && !isLoading && !isError && products.length === 0) return null;

  return (
    <section ref={ref} aria-labelledby={`category-${category.id}`} className="store-container mt-12">
      <SectionTitle
        id={`category-${category.id}`}
        title={category.name}
        to={catalogPath({ category: category.id })}
        action={<OwnerAddButton kind="product" categoryId={category.id} />}
      />
      {!inView || isLoading ? (
        <ProductGridSkeleton count={4} />
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : (
        <ProductGrid products={products} showCategory={false} />
      )}
    </section>
  );
}

export default function Home() {
  const { t } = useI18n();
  const { websiteId, identity } = useStorefrontWebsite();
  const { categories } = useStorefrontCategories();
  const latest = useGetAllProductsQuery(
    { websiteId, page: 1, limit: SECTION_LIMIT, sort: 'newest' },
    { skip: !websiteId }
  );
  useDocumentTitle(null);

  useEffect(() => {
    if (websiteId) trackStorefrontEvent({ name: 'store_view', websiteId });
  }, [websiteId]);

  const products = latest.data?.products || [];
  const storeIsEmpty = latest.isSuccess && (latest.data?.totalItems ?? products.length) === 0;

  return (
    <div className="pb-4 pt-4 sm:pt-6">
      <div className="store-container relative">
        {(identity.heroHeadline || identity.name) && <h1 className="sr-only">{identity.heroHeadline || identity.name}</h1>}
        {identity.heroImages.length > 0 && <OwnerEditButton section="Hero" className="absolute right-6 top-3 z-30 sm:right-8 lg:right-10" />}
        <Hero identity={identity} />
      </div>
      {identity.heroImages.length === 0 && <OwnerSectionPlaceholder section="Hero" />}

      {categories.length > 0 ? (
        <section aria-labelledby="shop-by-category" className="store-container mt-8 sm:mt-10">
          <SectionTitle id="shop-by-category" title={t('home.categories')} action={<OwnerAddButton kind="category" />} />
          <CategoryShowcase categories={categories} />
        </section>
      ) : (
        <div className="store-container mt-8 flex justify-end">
          <OwnerAddButton kind="category" />
        </div>
      )}

      <section aria-labelledby="new-arrivals" className="store-container mt-8 sm:mt-10">
        <SectionTitle
          id="new-arrivals"
          title={t('home.newArrivals')}
          to={storeIsEmpty ? null : catalogPath({ sort: 'newest' })}
          action={<OwnerAddButton kind="product" />}
        />
        {latest.isLoading || !websiteId ? (
          <ProductGridSkeleton count={4} />
        ) : latest.isError ? (
          <ErrorState onRetry={latest.refetch} />
        ) : storeIsEmpty ? (
          <EmptyState icon={PackageOpen} title={t('home.emptyTitle')} body={t('home.emptyBody')} />
        ) : (
          <ProductGrid products={products} priorityCount={2} />
        )}
      </section>

      {!storeIsEmpty &&
        categories
          .slice(0, MAX_CATEGORY_SECTIONS)
          .map((category) => <CategorySection key={category.id} category={category} websiteId={websiteId} />)}
    </div>
  );
}
