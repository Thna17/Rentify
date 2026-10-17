import { useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronRight, PackageX } from 'lucide-react';
import { useGetProductByIdQuery, useGetProductsByCategoryQuery } from '@rentify/storefront/api';
import { useStorefrontWebsite } from '@rentify/storefront/website';
import { trackStorefrontEvent } from '@rentify/storefront/analytics';
import { getProductImages } from '@rentify/storefront/commerce';
import { useI18n } from '../i18n';
import { PATHS, catalogPath } from '../paths';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useAddToCart } from '../hooks/useAddToCart';
import { ProductGallery } from '../components/ProductGallery';
import { ProductPurchasePanel } from '../components/ProductPurchasePanel';
import { ProductGrid } from '../components/ProductGrid';
import { ShopContact } from '../components/ShopContact';
import { SectionTitle } from '../components/SectionTitle';
import { EmptyState, ErrorState } from '../components/StatusMessage';

// The public by-id endpoint does not filter unpublished products, so the
// storefront treats them as not found rather than exposing drafts.
const UNPUBLISHED = ['draft', 'archived', 'inactive'];

function RelatedProducts({ product, websiteId }) {
  const categoryId = product.Category?.id || product.categoryId;
  const { data } = useGetProductsByCategoryQuery(
    { websiteId, categoryId, page: 1, limit: 5, sort: 'newest' },
    { skip: !categoryId }
  );
  const related = (data?.products || []).filter((item) => item.id !== product.id).slice(0, 4);
  if (!related.length) return null;

  return (
    <section aria-labelledby="related-products" className="mt-14">
      <SectionTitle id="related-products" title={product.Category?.name} to={catalogPath({ category: categoryId })} />
      <ProductGrid products={related} showCategory={false} />
    </section>
  );
}

function DetailSkeleton() {
  const { t } = useI18n();
  return (
    <div className="grid gap-8 lg:grid-cols-2 lg:gap-12" role="status" aria-label={t('common.loading')}>
      <div className="aspect-square animate-pulse rounded-xl bg-muted" />
      <div className="space-y-4" aria-hidden="true">
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
        <div className="h-8 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-7 w-28 animate-pulse rounded bg-muted" />
        <div className="h-12 animate-pulse rounded-lg bg-muted" />
        <div className="h-24 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

export default function ProductDetail() {
  const { t } = useI18n();
  const { id } = useParams();
  const { websiteId, identity } = useStorefrontWebsite();
  const addToCart = useAddToCart();
  const { data: product, isLoading, isError, error, refetch } = useGetProductByIdQuery(
    { websiteId, productId: id },
    { skip: !websiteId || !id }
  );

  const unpublished = product && UNPUBLISHED.includes(product.status);
  const found = product && !unpublished;
  useDocumentTitle(found ? product.name : null);

  useEffect(() => {
    if (websiteId && found) trackStorefrontEvent({ name: 'product_view', websiteId, productId: product.id });
  }, [websiteId, found, product?.id]);

  const images = useMemo(() => (found ? getProductImages(product, product.name) : []), [found, product]);

  let body;
  if (isLoading || !websiteId) {
    body = <DetailSkeleton />;
  } else if ((isError && error?.status === 404) || (!isError && !found)) {
    body = (
      <EmptyState as="h1" icon={PackageX} title={t('product.notFoundTitle')} body={t('product.notFoundBody')}>
        <Link to={PATHS.PRODUCTS} className="btn-primary">
          {t('product.back')}
        </Link>
      </EmptyState>
    );
  } else if (isError) {
    body = <ErrorState onRetry={refetch} />;
  } else {
    const description = product.description || product.shortDescription;
    body = (
      <>
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          <div className="lg:sticky lg:top-[calc(var(--header-height)+1.5rem)] lg:self-start">
            <ProductGallery key={product.id} images={images} name={product.name} />
          </div>
          <div>
            {product.Category?.name && (
              <Link
                to={catalogPath({ category: product.Category.id })}
                className="text-sm font-medium text-primary hover:underline"
              >
                {product.Category.name}
              </Link>
            )}
            <h1 className="mt-1 text-2xl font-bold leading-tight tracking-tight text-foreground sm:text-3xl">{product.name}</h1>
            {product.shortDescription && product.description && (
              <p className="mt-3 text-base text-muted-foreground">{product.shortDescription}</p>
            )}
            <div className="mt-6">
              <ProductPurchasePanel key={product.id} product={product} onAdd={addToCart} />
            </div>
            <div className="mt-6">
              <ShopContact identity={identity} productName={product.name} />
            </div>
            {description && (
              <section aria-labelledby="product-description" className="mt-10 border-t border-border pt-6">
                <h2 id="product-description" className="text-base font-semibold text-foreground">
                  {t('product.description')}
                </h2>
                {/* Rendered as text: merchant descriptions are never interpreted as HTML. */}
                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-foreground/85 sm:text-base">{description}</p>
              </section>
            )}
          </div>
        </div>
        <RelatedProducts product={product} websiteId={websiteId} />
      </>
    );
  }

  return (
    <div className="store-container py-4 sm:py-8">
      <nav aria-label={t('nav.breadcrumb')} className="mb-4 sm:mb-6">
        <ol className="flex min-w-0 items-center gap-1 text-sm text-muted-foreground">
          <li className="shrink-0 whitespace-nowrap">
            <Link to={PATHS.HOME} className="hover:text-foreground">
              {t('nav.home')}
            </Link>
          </li>
          <li aria-hidden="true" className="shrink-0">
            <ChevronRight className="h-3.5 w-3.5" />
          </li>
          <li className="shrink-0 whitespace-nowrap">
            <Link to={PATHS.PRODUCTS} className="hover:text-foreground">
              {t('nav.shopAll')}
            </Link>
          </li>
          {found && (
            <>
              <li aria-hidden="true" className="shrink-0">
                <ChevronRight className="h-3.5 w-3.5" />
              </li>
              <li className="min-w-0 truncate text-foreground" aria-current="page">
                {product.name}
              </li>
            </>
          )}
        </ol>
      </nav>
      {body}
    </div>
  );
}
