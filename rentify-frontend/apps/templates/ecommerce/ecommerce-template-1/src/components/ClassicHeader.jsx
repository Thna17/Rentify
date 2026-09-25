import { useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, Search, ShoppingBag, User, X } from 'lucide-react';
import { useStorefrontCategories, useStorefrontWebsite } from '@rentify/storefront/website';
import { useStorefrontCart } from '@rentify/storefront/cart';
import { useI18n } from '../i18n';
import { PATHS } from '../paths';
import { LanguageSwitcher } from './LanguageSwitcher';
import { NavDrawer } from './NavDrawer';
import { SearchForm } from './SearchForm';
import { StoreMark } from './StoreMark';

const iconButton =
  'relative inline-flex h-10 w-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted';

export function ClassicHeader() {
  const { t } = useI18n();
  const { identity } = useStorefrontWebsite();
  const { categories } = useStorefrontCategories();
  const { totals } = useStorefrontCart();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchPath, setSearchPath] = useState(location.pathname);

  // Close the mobile search row when the route changes.
  if (searchPath !== location.pathname) {
    setSearchPath(location.pathname);
    setSearchOpen(false);
  }

  const count = totals.itemCount;

  return (
    <>
      {identity.announcement && (
        <p className="bg-secondary px-4 py-2 text-center text-xs font-medium text-secondary-foreground sm:text-sm">
          {identity.announcement}
        </p>
      )}
      <header className="sticky top-0 z-40 border-b border-border/80 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/85">
        <div className="store-container flex h-[var(--header-height)] items-center gap-2 sm:gap-4">
          <button ref={menuButton} type="button" className={`${iconButton} -ml-2 md:hidden`} onClick={() => setMenuOpen(true)} aria-label={t('nav.openMenu')} aria-haspopup="dialog">
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>

          <Link to={PATHS.HOME} className="flex min-w-0 items-center gap-2.5 rounded-lg py-1 pr-1">
            <StoreMark identity={identity} />
          </Link>

          <nav aria-label={t('nav.menu')} className="ml-4 hidden items-center gap-1 lg:flex">
            <Link to={PATHS.PRODUCTS} className="rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-muted">
              {t('nav.shopAll')}
            </Link>
          </nav>

          <SearchForm className="mx-auto hidden w-full max-w-md md:block" />

          <div className="ml-auto flex items-center gap-0.5 sm:gap-1 md:ml-0">
            <LanguageSwitcher className="mr-1 hidden sm:inline-flex" />
            <button
              type="button"
              className={`${iconButton} md:hidden`}
              onClick={() => setSearchOpen((open) => !open)}
              aria-label={searchOpen ? t('search.close') : t('search.open')}
              aria-expanded={searchOpen}
              aria-controls="mobile-search"
            >
              {searchOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Search className="h-5 w-5" aria-hidden="true" />}
            </button>
            <Link to={PATHS.ACCOUNT} className={`${iconButton} hidden md:inline-flex`} aria-label={t('nav.account')}>
              <User className="h-5 w-5" aria-hidden="true" />
            </Link>
            <Link to={PATHS.CART} className={`${iconButton} -mr-2 md:mr-0`} aria-label={t('nav.cartCount', { count })}>
              <ShoppingBag className="h-5 w-5" aria-hidden="true" />
              {count > 0 && (
                <span className="absolute right-0.5 top-0.5 flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-primary px-1 text-[0.6875rem] font-bold leading-none text-primary-foreground tabular-nums">
                  {count > 99 ? '99+' : count}
                </span>
              )}
            </Link>
          </div>
        </div>

        {searchOpen && (
          <div id="mobile-search" className="store-container pb-3 md:hidden">
            <SearchForm autoFocus onSubmitted={() => setSearchOpen(false)} />
          </div>
        )}
      </header>

      <NavDrawer open={menuOpen} onOpenChange={setMenuOpen} storeName={identity.name} categories={categories} returnFocusRef={menuButton} />
    </>
  );
}
