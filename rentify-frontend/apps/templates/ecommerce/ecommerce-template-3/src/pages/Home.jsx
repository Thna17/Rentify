import { useEffect } from 'react';
import { useGetAllProductsQuery, useGetProductsByCategoryQuery } from '@rentify/storefront/api';
import { useStorefrontCategories, useStorefrontWebsite } from '@rentify/storefront/website';
import { trackStorefrontEvent } from '@rentify/storefront/analytics';
import { LayoutSection, useSectionLayout } from '@rentify/storefront/preview';
import { OwnerAddButton, OwnerEditButton, OwnerSectionPlaceholder } from '@rentify/storefront/owner/StorefrontOwner';
import { useI18n } from '../i18n';
import { catalogPath } from '../paths';
import { getTemplateContent } from '../storeContent';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { Hero } from '../components/Hero';
import { Highlights } from '../components/Highlights';
import { SectionTitle } from '../components/SectionTitle';
import { ProductGrid, ProductGridSkeleton } from '../components/ProductGrid';
import { MenuSection } from '../components/MenuSection';
import { FeatureBanner } from '../components/FeatureBanner';
import { StoryBand } from '../components/StoryBand';
import { VisitSection } from '../components/VisitSection';
import { ErrorState } from '../components/StatusMessage';

export const SIGNATURE_LIMIT = 4;

/**
 * The signature row: the merchant's chosen category, or their newest items
 * when none is chosen. Left out entirely when there is nothing to show.
 */
function SignatureSection({ signature, websiteId }) {
  const { t } = useI18n();
  const { category, title } = signature;
  const newest = useGetAllProductsQuery(
    { websiteId, page: 1, limit: SIGNATURE_LIMIT, sort: 'newest' },
    { skip: !websiteId || Boolean(category) }
  );
  const chosen = useGetProductsByCategoryQuery(
    { websiteId, categoryId: category?.id, page: 1, limit: SIGNATURE_LIMIT, sort: 'newest' },
    { skip: !websiteId || !category }
  );
  const query = category ? chosen : newest;
  const products = query.data?.products || [];

  if (query.isSuccess && products.length === 0) {
    return <OwnerSectionPlaceholder section="Signature Drinks" className="mt-16" />;
  }

  return (
    <section aria-labelledby="signature" className="store-container relative mt-16 sm:mt-24">
      <div className="absolute -top-11 right-4 flex gap-2 sm:right-6 lg:right-8">
        <OwnerEditButton section="Signature Drinks" />
        <OwnerAddButton kind="product" categoryId={category?.id} />
      </div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">{t('home.signatureEyebrow')}</p>
      <SectionTitle
        id="signature"
        title={title || category?.name || t('home.signature')}
        to={catalogPath(category ? { category: category.id } : { sort: 'newest' })}
        linkLabel={t('menu.fullMenu')}
      />
      {query.isLoading || !websiteId ? (
        <ProductGridSkeleton count={SIGNATURE_LIMIT} layout="rail" />
      ) : query.isError ? (
        <ErrorState onRetry={query.refetch} />
      ) : (
        <ProductGrid products={products} layout="rail" priorityCount={2} />
      )}
    </section>
  );
}

export default function Home() {
  const { websiteId, identity, content } = useStorefrontWebsite();
  const { categories } = useStorefrontCategories();
  const page = getTemplateContent(content, categories);
  const layout = useSectionLayout(3);
  const hasVisit = page.visit.hours.length > 0 || Boolean(identity.location || identity.phone || page.visit.mapUrl);
  useDocumentTitle(null);

  useEffect(() => {
    if (websiteId) trackStorefrontEvent({ name: 'store_view', websiteId });
  }, [websiteId]);

  return (
    <div className="pb-4">
      <Hero
        identity={identity}
        eyebrow={page.hero.eyebrow}
        buttonText={page.hero.buttonText}
        note={page.hero.note}
        hours={page.visit.hours}
      />
      <div className="flex flex-col">
        <LayoutSection layout={layout} id="highlights">
          {page.highlights.length ? <Highlights items={page.highlights} /> : <OwnerSectionPlaceholder section="Highlights" className="mt-8" />}
        </LayoutSection>

        <LayoutSection layout={layout} id="signature">
          <SignatureSection signature={page.signature} websiteId={websiteId} />
        </LayoutSection>

        <LayoutSection layout={layout} id="menu">
          <div className="mt-16 sm:mt-24">
            <MenuSection websiteId={websiteId} categories={categories} title={page.menu.title} note={page.menu.note} />
          </div>
        </LayoutSection>

        <LayoutSection layout={layout} id="feature">
          {page.feature.title ? (
            <div className="mt-16 sm:mt-24">
              <FeatureBanner feature={page.feature} />
            </div>
          ) : (
            <OwnerSectionPlaceholder section="Feature Banner" className="mt-16" />
          )}
        </LayoutSection>

        <LayoutSection layout={layout} id="story">
          {page.story.title ? (
            <div className="mt-16 sm:mt-24">
              <StoryBand story={page.story} />
            </div>
          ) : (
            <OwnerSectionPlaceholder section="Our Story" className="mt-16" />
          )}
        </LayoutSection>

        <LayoutSection layout={layout} id="visit">
          {hasVisit ? (
            <div className="mt-16 sm:mt-24">
              <VisitSection visit={page.visit} identity={identity} />
            </div>
          ) : (
            <OwnerSectionPlaceholder section="Visit Us" className="mt-16" />
          )}
        </LayoutSection>
      </div>
    </div>
  );
}
