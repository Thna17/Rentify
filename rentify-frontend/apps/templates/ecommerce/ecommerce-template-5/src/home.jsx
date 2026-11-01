import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, PackageOpen, MessageSquare } from 'lucide-react';
import { useGetAllProductsQuery } from '@rentify/storefront/api';
import {
  useStorefrontCategories,
  useStorefrontWebsite,
} from '@rentify/storefront/website';
import { trackStorefrontEvent } from '@rentify/storefront/analytics';
import { LayoutSection, useSectionLayout } from '@rentify/storefront/preview';
import {
  OwnerAddButton,
  OwnerEditButton,
} from '@rentify/storefront/owner/StorefrontOwner';
import { useI18n } from '../../ecommerce-template-1/src/i18n';
import { catalogPath, PATHS } from '../../ecommerce-template-1/src/paths';
import {
  ProductGrid,
  ProductGridSkeleton,
} from '../../ecommerce-template-1/src/components/ProductGrid';
import {
  EmptyState,
  ErrorState,
} from '../../ecommerce-template-1/src/components/StatusMessage';
import { SocialIcons } from '../../ecommerce-template-1/src/components/SocialIcons';
import { EDITORIAL_STYLES } from '@rentify/storefront/editorialStyles';
import { useEditorialStyle } from './styleContext';
import { useDocumentTitle } from '../../ecommerce-template-1/src/hooks/useDocumentTitle';

export function EditorialFooter() {
  const { identity } = useStorefrontWebsite();
  const { t } = useI18n();
  return (
    <footer className="em-footer">
      <div className="em-shell em-footer-inner">
        <div>
          <Link to={PATHS.HOME} className="em-brand">
            {identity.name}
          </Link>
          <p>{identity.copyright}</p>
        </div>
        <nav aria-label={t('footer.shop')}>
          <Link to={PATHS.PRODUCTS}>{t('nav.shopAll')}</Link>
          <Link to={PATHS.ACCOUNT}>{t('nav.account')}</Link>
          <Link to={PATHS.CART}>{t('nav.cart')}</Link>
        </nav>
        <SocialIcons
          links={identity.socialLinks}
          label={t('footer.follow')}
          className="flex gap-3"
          itemClassName="p-2 rounded-full border border-border"
        />
      </div>
    </footer>
  );
}

export default function Home() {
  const { identity, websiteId } = useStorefrontWebsite();
  const { categories } = useStorefrontCategories();
  const { t, language } = useI18n();
  const { hash } = useLocation();
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [hash]);
  const kh = language === 'kh';
  const style = useEditorialStyle();
  const layout = useSectionLayout(
    Number(
      Object.keys(EDITORIAL_STYLES).find(
        (id) => EDITORIAL_STYLES[id].key === style.key
      )
    ) || 5
  );
  const [banner, setBanner] = useState(0);
  const images = identity.heroImages?.length
    ? identity.heroImages
    : [style.image];
  const result = useGetAllProductsQuery(
    { websiteId, page: 1, limit: 8, sort: 'newest' },
    { skip: !websiteId }
  );
  const products = result.data?.products || [];
  useDocumentTitle(null);
  useEffect(() => {
    if (websiteId) trackStorefrontEvent({ name: 'store_view', websiteId });
  }, [websiteId]);
  return (
    <div className="em-shell em-home" data-template-layout="home-slider">
      <section
        className={`em-hero ${images.length ? 'em-has-image' : ''}`}
        aria-labelledby="em-title"
      >
        {images.length > 0 && (
          <img
            className="em-hero-image"
            src={images[banner % images.length]}
            alt=""
            fetchPriority="high"
          />
        )}
        <div className="em-hero-copy">
          <p className="em-eyebrow">{kh ? style.industryKh : style.industry}</p>
          <h1 id="em-title">
            {identity.heroHeadline || (kh ? style.headlineKh : style.headline)}
          </h1>
          <p>
            {identity.heroSubtitle || (kh ? style.subtitleKh : style.subtitle)}
          </p>
          <Link className="em-button" to={PATHS.PRODUCTS}>
            {t('home.shopNow')}
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>
        <div className="em-hero-edit">
          <OwnerEditButton section="Hero" />
        </div>
      </section>
      {images.length > 1 && (
        <div
          className="em-banner-controls"
          aria-label={kh ? 'រូបភាព' : 'Choose banner'}
        >
          {images.map((image, i) => (
            <button
              key={`${image}-${i}`}
              type="button"
              aria-label={`${kh ? 'រូបភាព' : 'Banner'} ${i + 1}`}
              aria-pressed={banner === i}
              onClick={() => setBanner(i)}
            >
              <span />
            </button>
          ))}
        </div>
      )}
      <div className="em-sections">
        <LayoutSection layout={layout} id="categories">
          <section id="collections" className="em-section">
            <div className="em-heading">
              <h2>{kh ? 'ការប្រមូលពិសេស' : 'Featured collections'}</h2>
              <OwnerAddButton kind="category" />
            </div>
            {categories.length ? (
              <ul className="em-collections">
                {categories.slice(0, 6).map((category, i) => (
                  <li key={category.id}>
                    <Link to={catalogPath({ category: category.id })}>
                      <span className="em-collection-number">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <strong>{category.name}</strong>
                      <ArrowRight size={18} aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="em-muted">
                {kh
                  ? 'ស្វែងរកផលិតផលទាំងអស់នៅក្នុងហាង។'
                  : 'Discover the full collection in our shop.'}{' '}
                <Link to={PATHS.PRODUCTS}>{t('home.browse')} →</Link>
              </p>
            )}
          </section>
        </LayoutSection>
        <LayoutSection layout={layout} id="newArrivals">
          <section className="em-section">
            <div className="em-heading">
              <h2>{kh ? 'ផលិតផលថ្មី' : style.productsTitle}</h2>
              <div className="em-heading-actions">
                <OwnerAddButton kind="product" />
                <Link to={PATHS.PRODUCTS}>
                  {t('home.viewAll')}{' '}
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </div>
            </div>
            {result.isLoading || !websiteId ? (
              <ProductGridSkeleton count={4} />
            ) : result.isError ? (
              <ErrorState onRetry={result.refetch} />
            ) : products.length ? (
              <ProductGrid products={products} priorityCount={2} />
            ) : (
              <EmptyState
                icon={PackageOpen}
                title={t('home.emptyTitle')}
                body={t('home.emptyBody')}
              />
            )}
          </section>
        </LayoutSection>
        <LayoutSection layout={layout} id="about">
          <section id="about" className="em-about">
            <div>
              <p className="em-eyebrow">
                {kh ? 'អំពីហាង' : 'A LITTLE ABOUT US'}
              </p>
              <h2>{identity.name}</h2>
              <p>
                {identity.heroSubtitle ||
                  (kh
                    ? 'សូមអរគុណដែលបានគាំទ្រហាងរបស់យើង។'
                    : 'Thank you for making us part of your everyday.')}
              </p>
            </div>
            <address>
              {identity.location && <p>{identity.location}</p>}
              {identity.email && (
                <a href={`mailto:${identity.email}`}>{identity.email}</a>
              )}
              {identity.phone && (
                <a href={`tel:${identity.phone.replace(/[^\d+]/g, '')}`}>
                  {identity.phone}
                </a>
              )}
            </address>
          </section>
        </LayoutSection>
        <LayoutSection layout={layout} id="reviews">
          <section id="reviews" className="em-reviews">
            <MessageSquare size={24} aria-hidden="true" />
            <h2>{kh ? 'ការវាយតម្លៃពីអតិថិជន' : 'Customer reviews'}</h2>
            <p>
              {kh
                ? 'មិនទាន់មានការវាយតម្លៃសម្រាប់ហាងនេះទេ។'
                : 'Store reviews are not available yet.'}
            </p>
          </section>
        </LayoutSection>
      </div>
    </div>
  );
}
