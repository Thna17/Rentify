import { NavLink, Link } from 'react-router-dom';
import { ShoppingBag, User } from 'lucide-react';
import { useStorefrontWebsite } from '@rentify/storefront/website';
import { useStorefrontCart } from '@rentify/storefront/cart';
import { useI18n } from '../../ecommerce-template-1/src/i18n';
import { StoreMark } from '../../ecommerce-template-1/src/components/StoreMark';
import { SearchForm } from '../../ecommerce-template-1/src/components/SearchForm';
import { LanguageSwitcher } from '../../ecommerce-template-1/src/components/LanguageSwitcher';
import { useEditorialStyle } from './styleContext';
import { PATHS } from '../../ecommerce-template-1/src/paths';

export function EditorialHeader() {
  const { identity } = useStorefrontWebsite();
  const { totals } = useStorefrontCart();
  const { t, language } = useI18n();
  const kh = language === 'kh';
  const style = useEditorialStyle();

  const brand = (
    <Link to={PATHS.HOME} className="em-header-brand">
      <StoreMark identity={identity} size="lg" />
    </Link>
  );
  const navigation = (
    <nav className="em-header-nav" aria-label={t('nav.menu')}>
      <NavLink to={PATHS.HOME} end>
        {kh ? 'ទំព័រដើម' : 'Home'}
      </NavLink>
      <NavLink to={PATHS.PRODUCTS}>{kh ? 'ផលិតផល' : 'Products'}</NavLink>
      <Link to="/#collections">{kh ? 'ការប្រមូល' : 'Collections'}</Link>
      <Link to="/#reviews">{kh ? 'ការវាយតម្លៃ' : 'Reviews'}</Link>
      <Link to="/#about">{kh ? 'អំពីហាង' : 'About'}</Link>
    </nav>
  );
  const search = <SearchForm className="em-header-search" />;
  const actions = (
    <div className="em-header-actions">
      <LanguageSwitcher />
      <Link to={PATHS.ACCOUNT} aria-label={t('nav.account')}>
        <User size={21} aria-hidden="true" />
      </Link>
      <Link
        to={PATHS.CART}
        className="em-header-cart"
        aria-label={t('nav.cartCount', { count: totals.itemCount })}
      >
        <ShoppingBag size={23} aria-hidden="true" />
        {totals.itemCount > 0 && (
          <span>{totals.itemCount > 99 ? '99+' : totals.itemCount}</span>
        )}
      </Link>
    </div>
  );
  return (
    <>
      {identity.announcement && (
        <p className="em-announcement">{identity.announcement}</p>
      )}
      <header className="em-header">
        <div className="em-shell em-header-inner">
          {style.key === 'beauty' ? (
            <>
              <div className="header-beauty-top">
                {search}
                {brand}
                {actions}
              </div>
              <div className="header-beauty-nav">{navigation}</div>
            </>
          ) : style.key === 'fashion' ? (
            <>
              <div className="header-fashion-masthead">
                {brand}
                {actions}
              </div>
              <div className="header-fashion-nav">
                {navigation}
                {search}
              </div>
            </>
          ) : style.key === 'electronics' || style.key === 'grocery' ? (
            <>
              <div className="header-catalog-top">
                {brand}
                {search}
                {actions}
              </div>
              <div className="header-catalog-nav">{navigation}</div>
            </>
          ) : style.key === 'crafts' ? (
            <>
              <div className="header-crafts-top">
                {brand}
                {navigation}
                {actions}
              </div>
              <div className="header-crafts-search">{search}</div>
            </>
          ) : (
            <>
              {brand}
              {navigation}
              {search}
              {actions}
            </>
          )}
        </div>
      </header>
    </>
  );
}
