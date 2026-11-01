import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  PackageOpen,
  MessageSquare,
} from 'lucide-react';
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
import { useDocumentTitle } from '../../ecommerce-template-1/src/hooks/useDocumentTitle';
import { useEditorialStyle } from './styleContext';

function useContent(id) {
  const { identity, websiteId } = useStorefrontWebsite();
  const { categories } = useStorefrontCategories();
  const { t, language } = useI18n();
  const style = useEditorialStyle();
  const { hash } = useLocation();
  const layout = useSectionLayout(id);
  const query = useGetAllProductsQuery(
    { websiteId, page: 1, limit: 12, sort: 'newest' },
    { skip: !websiteId }
  );
  useDocumentTitle(null);
  useEffect(() => {
    if (websiteId) trackStorefrontEvent({ name: 'store_view', websiteId });
  }, [websiteId]);
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [hash]);
  const kh = language === 'kh';
  return {
    identity,
    websiteId,
    categories,
    t,
    kh,
    style,
    layout,
    query,
    images: identity.heroImages?.length ? identity.heroImages : [style.image],
    headline: identity.heroHeadline || (kh ? style.headlineKh : style.headline),
    subtitle: identity.heroSubtitle || (kh ? style.subtitleKh : style.subtitle),
  };
}

function Hero({ data, mode }) {
  const [slide, setSlide] = useState(0);
  const { images, headline, subtitle, t, kh, style } = data;
  return (
    <section
      className={`distinct-hero hero-${mode}`}
      aria-labelledby="distinct-title"
      data-layout={mode}
    >
      <div className="distinct-hero-media">
        <img src={images[slide % images.length]} alt="" fetchPriority="high" />
      </div>
      <div className="distinct-hero-copy">
        <p className="em-eyebrow">{kh ? style.industryKh : style.industry}</p>
        <h1 id="distinct-title">{headline}</h1>
        <p>{subtitle}</p>
        <Link className="em-button" to={PATHS.PRODUCTS}>
          {t('home.shopNow')} <ArrowRight size={18} aria-hidden="true" />
        </Link>
      </div>
      <div className="distinct-hero-edit">
        <OwnerEditButton section="Hero" />
      </div>
      {images.length > 1 && (
        <div className="distinct-slides">
          <button
            type="button"
            onClick={() =>
              setSlide((slide + images.length - 1) % images.length)
            }
            aria-label={kh ? 'រូបភាពមុន' : 'Previous banner'}
          >
            <ChevronLeft size={18} />
          </button>
          <span>
            {(slide % images.length) + 1} / {images.length}
          </span>
          <button
            type="button"
            onClick={() => setSlide((slide + 1) % images.length)}
            aria-label={kh ? 'រូបភាពបន្ទាប់' : 'Next banner'}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </section>
  );
}
function Collections({ data, mode = 'tiles' }) {
  const { layout, categories, t, kh } = data;
  return (
    <LayoutSection layout={layout} id="categories">
      <section
        id="collections"
        className={`distinct-collections collections-${mode}`}
      >
        <div className="em-heading">
          <h2>{t('home.categories')}</h2>
          <OwnerAddButton kind="category" />
        </div>
        <ul>
          {categories.slice(0, 8).map((category, index) => (
            <li key={category.id}>
              <Link to={catalogPath({ category: category.id })}>
                <span className="collection-index">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <strong>{category.name}</strong>
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
        {!categories.length && (
          <p className="em-muted">
            {kh ? 'ស្វែងរកផលិតផលទាំងអស់។' : 'Explore the full collection.'}
          </p>
        )}
        <Link className="distinct-text-link" to={PATHS.PRODUCTS}>
          {t('nav.shopAll')} <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </section>
    </LayoutSection>
  );
}
function Products({ data, mode }) {
  const { query, websiteId, t, kh, style, layout } = data;
  const products = query.data?.products || [];
  return (
    <LayoutSection layout={layout} id="newArrivals">
      <section className={`distinct-products products-${mode}`}>
        <div className="em-heading">
          <h2>{kh ? 'ផលិតផលថ្មី' : style.productsTitle}</h2>
          <div className="em-heading-actions">
            <OwnerAddButton kind="product" />
            <Link to={PATHS.PRODUCTS}>
              {t('home.viewAll')} <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>
        {query.isLoading || !websiteId ? (
          <ProductGridSkeleton count={6} />
        ) : query.isError ? (
          <ErrorState onRetry={query.refetch} />
        ) : products.length ? (
          <ProductGrid
            products={products}
            priorityCount={2}
            className="distinct-product-grid"
          />
        ) : (
          <EmptyState
            icon={PackageOpen}
            title={t('home.emptyTitle')}
            body={t('home.emptyBody')}
          />
        )}
      </section>
    </LayoutSection>
  );
}
function Story({ data, portrait = false }) {
  const { identity, layout, kh, subtitle, images } = data;
  return (
    <LayoutSection layout={layout} id="about">
      <section
        id="about"
        className={`distinct-story ${portrait ? 'story-portrait' : ''}`}
      >
        {portrait && <img src={images[1] || images[0]} alt="" loading="lazy" />}
        <div>
          <p className="em-eyebrow">{kh ? 'អំពីហាង' : 'OUR STORE'}</p>
          <h2>{identity.name}</h2>
          <p>{subtitle}</p>
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
        </div>
      </section>
    </LayoutSection>
  );
}
function Reviews({ data }) {
  return (
    <LayoutSection layout={data.layout} id="reviews">
      <section id="reviews" className="em-reviews">
        <MessageSquare size={22} aria-hidden="true" />
        <h2>{data.kh ? 'ការវាយតម្លៃពីអតិថិជន' : 'Customer reviews'}</h2>
        <p>
          {data.kh
            ? 'មិនទាន់មានការវាយតម្លៃសម្រាប់ហាងនេះទេ។'
            : 'Store reviews are not available yet.'}
        </p>
      </section>
    </LayoutSection>
  );
}

export function TechHome() {
  const data = useContent(6);
  return (
    <div
      className="em-shell distinct-home tech-home"
      data-template-layout="tech-departments"
    >
      <div className="tech-launch">
        <aside>
          <Collections data={data} mode="departments" />
        </aside>
        <Hero data={data} mode="tech" />
      </div>
      <div className="distinct-sections">
        <Products data={data} mode="tech" />
        <Story data={data} />
        <Reviews data={data} />
      </div>
    </div>
  );
}
export function BeautyHome() {
  const data = useContent(7);
  return (
    <div
      className="em-shell distinct-home beauty-home"
      data-template-layout="beauty-split"
    >
      <Hero data={data} mode="beauty" />
      <div className="distinct-sections">
        <Collections data={data} mode="rituals" />
        <Products data={data} mode="beauty" />
        <Story data={data} portrait />
        <Reviews data={data} />
      </div>
    </div>
  );
}
export function GroceryHome() {
  const data = useContent(8);
  return (
    <div
      className="em-shell distinct-home grocery-home"
      data-template-layout="grocery-catalog"
    >
      <div className="grocery-layout">
        <aside>
          <Collections data={data} mode="aisles" />
        </aside>
        <div className="grocery-main">
          <Hero data={data} mode="grocery" />
          <Products data={data} mode="grocery" />
        </div>
      </div>
      <div className="distinct-sections">
        <Story data={data} />
        <Reviews data={data} />
      </div>
    </div>
  );
}
export function FashionHome() {
  const data = useContent(9);
  return (
    <div
      className="distinct-home fashion-home"
      data-template-layout="fashion-campaign"
    >
      <Hero data={data} mode="fashion" />
      <div className="em-shell distinct-sections">
        <Products data={data} mode="fashion" />
        <Collections data={data} mode="lookbook" />
        <Story data={data} />
        <Reviews data={data} />
      </div>
    </div>
  );
}
export function CraftsHome() {
  const data = useContent(10);
  return (
    <div
      className="em-shell distinct-home crafts-home"
      data-template-layout="crafts-journal"
    >
      <Hero data={data} mode="crafts" />
      <div className="crafts-catalog">
        <Collections data={data} mode="journal" />
        <Products data={data} mode="crafts" />
      </div>
      <div className="distinct-sections">
        <Story data={data} portrait />
        <Reviews data={data} />
      </div>
    </div>
  );
}
export const INDUSTRY_HOMES = {
  6: TechHome,
  7: BeautyHome,
  8: GroceryHome,
  9: FashionHome,
  10: CraftsHome,
};
