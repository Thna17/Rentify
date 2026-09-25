import { useEffect } from 'react';
import { PackageOpen } from 'lucide-react';
import { useGetAllProductsQuery, useGetProductsByCategoryQuery } from '@rentify/storefront/api';
import { useStorefrontCategories, useStorefrontWebsite } from '@rentify/storefront/website';
import { trackStorefrontEvent } from '@rentify/storefront/analytics';
import { useI18n } from '../i18n';
import { PATHS, catalogPath } from '../paths';
import { getTemplateContent } from '../storeContent';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useInView } from '../hooks/useInView';
import { Hero } from '../components/Hero';
import { Highlights } from '../components/Highlights';
import { CategoryCards } from '../components/CategoryCards';
import { SectionTitle } from '../components/SectionTitle';
import { ProductGrid, ProductGridSkeleton } from '../components/ProductGrid';
import { FeatureBanner } from '../components/FeatureBanner';
import { FeaturedRow } from '../components/FeaturedRow';
import { NeedChips } from '../components/NeedChips';
import { StoryBand } from '../components/StoryBand';
import { EmptyState, ErrorState } from '../components/StatusMessage';
import { OwnerAddButton, OwnerEditButton, OwnerSectionPlaceholder } from '@rentify/storefront/owner/StorefrontOwner';

const ROW_LIMIT = 5;
const MAX_CATEGORY_CARDS = 8;

/** The merchant's chosen category as a compact row, fetched when it nears the viewport. */
function FeaturedSection({ featured, websiteId }) {
  const [ref, inView] = useInView();
  const { category, title } = featured;
  const { data, isLoading, isError } = useGetProductsByCategoryQuery(
    { websiteId, categoryId: category.id, page: 1, limit: ROW_LIMIT, sort: 'newest' },
    { skip: !inView }
  );
  const products = data?.products || [];

  // Nothing to feature (or it failed to load): leave the section out rather than show an empty shelf.
  if (inView && !isLoading && (isError || products.length === 0)) return null;

  return (
    <section ref={ref} aria-labelledby="featured-products" className="store-container mt-14 sm:mt-16">
      <div className="relative">
        <OwnerEditButton section="Featured Products" className="absolute -top-11 right-0" />
        <SectionTitle id="featured-products" title={title || category.name} to={catalogPath({ category: category.id })} />
      </div>
      {!inView || isLoading ? <ProductGridSkeleton count={ROW_LIMIT} layout="rail" /> : <FeaturedRow products={products} />}
    </section>
  );
}

export default function Home() {
  const { t } = useI18n();
  const { websiteId, identity, content } = useStorefrontWebsite();
  const { categories } = useStorefrontCategories();
  const latest = useGetAllProductsQuery({ websiteId, page: 1, limit: ROW_LIMIT, sort: 'newest' }, { skip: !websiteId });
  const page = getTemplateContent(content, categories);
  useDocumentTitle(null);

  useEffect(() => {
    if (websiteId) trackStorefrontEvent({ name: 'store_view', websiteId });
  }, [websiteId]);

  const products = latest.data?.products || [];
  const storeIsEmpty = latest.isSuccess && (latest.data?.totalItems ?? products.length) === 0;

  return (
    <div className="pb-4">
      <Hero
        identity={identity}
        eyebrow={page.hero.eyebrow}
        buttonText={page.hero.buttonText}
        note={page.hero.note}
        storyLink={Boolean(page.story.title)}
      />
      {page.highlights.length ? <Highlights items={page.highlights} /> : <OwnerSectionPlaceholder section="Highlights" className="mt-8" />}

      {categories.length > 0 ? (
        <section aria-labelledby="shop-by-category" className="store-container relative mt-12 sm:mt-16">
          <OwnerAddButton kind="category" className="absolute -top-11 right-4 sm:right-6 lg:right-8" />
          <SectionTitle
            id="shop-by-category"
            title={t('home.categories')}
            to={PATHS.PRODUCTS}
            linkLabel={t('home.viewAllCategories')}
          />
          <CategoryCards categories={categories.slice(0, MAX_CATEGORY_CARDS)} />
        </section>
      ) : (
        <div className="store-container mt-12 flex justify-end">
          <OwnerAddButton kind="category" />
        </div>
      )}

      <section aria-labelledby="new-arrivals" className="store-container relative mt-14 sm:mt-16">
        <OwnerAddButton kind="product" className="absolute -top-11 right-4 sm:right-6 lg:right-8" />
        <SectionTitle id="new-arrivals" title={t('home.newArrivals')} to={storeIsEmpty ? null : catalogPath({ sort: 'newest' })} />
        {latest.isLoading || !websiteId ? (
          <ProductGridSkeleton count={ROW_LIMIT} layout="rail" />
        ) : latest.isError ? (
          <ErrorState onRetry={latest.refetch} />
        ) : storeIsEmpty ? (
          <EmptyState icon={PackageOpen} title={t('home.emptyTitle')} body={t('home.emptyBody')} />
        ) : (
          <ProductGrid products={products} layout="rail" priorityCount={2} />
        )}
      </section>

      {page.feature.title ? (
        <div className="mt-14 sm:mt-20">
          <FeatureBanner feature={page.feature} />
        </div>
      ) : (
        <OwnerSectionPlaceholder section="Feature Banner" className="mt-14" />
      )}

      {!storeIsEmpty && page.featured.category ? (
        <FeaturedSection featured={page.featured} websiteId={websiteId} />
      ) : (
        <OwnerSectionPlaceholder section="Featured Products" className="mt-14" />
      )}

      {page.needs.items.length > 0 ? (
        <section aria-labelledby="shop-by-need" className="store-container relative mt-14 sm:mt-16">
          <OwnerEditButton section="Shop by Need" className="absolute -top-11 right-4 sm:right-6 lg:right-8" />
          <SectionTitle id="shop-by-need" title={page.needs.title || t('home.concerns')} />
          <NeedChips items={page.needs.items} />
        </section>
      ) : (
        <OwnerSectionPlaceholder section="Shop by Need" className="mt-14" />
      )}

      {page.story.title ? (
        <div className="mt-14 sm:mt-20">
          <StoryBand story={page.story} />
        </div>
      ) : (
        <OwnerSectionPlaceholder section="Our Story" className="mt-14" />
      )}
    </div>
  );
}
