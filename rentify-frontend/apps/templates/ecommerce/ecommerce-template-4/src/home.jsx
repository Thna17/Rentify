import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, PackageOpen } from 'lucide-react';
import { useGetAllProductsQuery } from '@rentify/storefront/api';
import { useStorefrontCategories, useStorefrontWebsite } from '@rentify/storefront/website';
import { trackStorefrontEvent } from '@rentify/storefront/analytics';
import { OwnerAddButton, OwnerEditButton } from '@rentify/storefront/owner/StorefrontOwner';
import { useI18n } from '../../ecommerce-template-1/src/i18n';
import { catalogPath, PATHS } from '../../ecommerce-template-1/src/paths';
import { ProductGrid, ProductGridSkeleton } from '../../ecommerce-template-1/src/components/ProductGrid';
import { EmptyState, ErrorState } from '../../ecommerce-template-1/src/components/StatusMessage';
import { useDocumentTitle } from '../../ecommerce-template-1/src/hooks/useDocumentTitle';

export default function Home() {
  const { t, language } = useI18n();
  const { websiteId, identity } = useStorefrontWebsite();
  const { categories } = useStorefrontCategories();
  const latest = useGetAllProductsQuery({ websiteId, page: 1, limit: 8, sort: 'newest' }, { skip: !websiteId });
  const products = latest.data?.products || [];
  const khmer = language === 'kh';
  useDocumentTitle(null);
  useEffect(() => { if (websiteId) trackStorefrontEvent({ name: 'store_view', websiteId }); }, [websiteId]);

  return <div className="atelier-home">
    <section className="atelier-hero" aria-labelledby="atelier-title">
      <div className="atelier-intro">
        <p className="atelier-eyebrow">{khmer ? 'សូមស្វាគមន៍មកកាន់ហាងរបស់យើង' : 'WELCOME TO OUR STORE'}</p>
        <h1 id="atelier-title">{identity.heroHeadline || identity.name || (khmer ? 'ស្វែងរកអ្វីដែលអ្នកចូលចិត្ត' : 'Find something you love.')}</h1>
        <p className="atelier-description">{khmer ? 'ស្វែងរកផលិតផលដែលអ្នកចូលចិត្ត និងទិញទំនិញតាមរបៀបរបស់អ្នក។' : 'Discover our collection and find something made for you.'}</p>
        <Link className="atelier-button" to={PATHS.PRODUCTS}>{t('home.shopNow')} <ArrowRight size={18} aria-hidden="true" /></Link>
      </div>
      <div className="atelier-hero-image">
        {identity.heroImages?.[0] ? <img src={identity.heroImages[0]} alt="" fetchPriority="high" /> :
          <div className="atelier-image-placeholder" aria-hidden="true"><span>✳</span></div>}
        <div className="atelier-edit"><OwnerEditButton section="Hero" /></div>
      </div>
    </section>
    <div className="atelier-content">
      {categories.length > 0 && <section className="atelier-section" aria-labelledby="atelier-categories">
        <div className="atelier-section-heading"><div><p className="atelier-eyebrow">{khmer ? 'ស្វែងយល់' : 'EXPLORE'}</p>
          <h2 id="atelier-categories">{t('home.categories')}</h2></div><OwnerAddButton kind="category" /></div>
        <ul className="atelier-categories">{categories.slice(0, 6).map((category, index) =>
          <li key={category.id}><Link to={catalogPath({ category: category.id })}><span>{String(index + 1).padStart(2, '0')}</span>
            <strong>{category.name}</strong><ArrowRight size={18} aria-hidden="true" /></Link></li>)}</ul>
      </section>}
      {categories.length === 0 && <div className="atelier-empty-action"><OwnerAddButton kind="category" /></div>}
      <section className="atelier-section" aria-labelledby="atelier-products">
        <div className="atelier-section-heading"><div><p className="atelier-eyebrow">{khmer ? 'ការប្រមូលរបស់យើង' : 'THE COLLECTION'}</p>
          <h2 id="atelier-products">{t('home.newArrivals')}</h2></div>
          <div className="atelier-actions"><OwnerAddButton kind="product" /><Link to={PATHS.PRODUCTS}>{t('home.viewAll')} <ArrowRight size={16} aria-hidden="true" /></Link></div></div>
        {latest.isLoading || !websiteId ? <ProductGridSkeleton count={4} /> : latest.isError ?
          <ErrorState onRetry={latest.refetch} /> : products.length ?
            <ProductGrid products={products} priorityCount={2} /> :
            <EmptyState icon={PackageOpen} title={t('home.emptyTitle')} body={t('home.emptyBody')} />}
      </section>
      <section className="atelier-closing"><span aria-hidden="true">✳</span>
        <p>{khmer ? 'សូមអរគុណដែលបានគាំទ្រហាងរបស់យើង។' : 'Thank you for shopping with us.'}</p>
        <Link to={PATHS.PRODUCTS}>{t('home.browse')} <ArrowRight size={16} aria-hidden="true" /></Link>
      </section>
    </div>
  </div>;
}
