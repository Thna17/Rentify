import { useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { ChevronDown, Menu, Search, ShoppingBag, User, X } from 'lucide-react';
import { useStorefrontCategories, useStorefrontWebsite } from '@rentify/storefront/website';
import { useStorefrontCart } from '@rentify/storefront/cart';
import { useI18n } from '../i18n';
import { PATHS, catalogPath } from '../paths';
import { getTemplateContent } from '../storeContent';
import { LanguageSwitcher } from './LanguageSwitcher';
import { NavDrawer } from './NavDrawer';
import { SearchForm } from './SearchForm';
import { StoreMark } from './StoreMark';

const iconButton =
  'relative inline-flex h-10 w-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-foreground/[0.06]';
const navLink = 'rounded-full px-3 py-2 text-sm font-medium text-foreground/80 transition-colors hover:text-foreground';

/**
 * Editorial header: store mark, a "Shop" menu of real categories, links to the
 * newest products and to the merchant's featured row and story when they have
 * set those up, then search, language, account and cart.
 */
export function Header() {
  const { t } = useI18n();
  const { identity, content } = useStorefrontWebsite();
  const { categories } = useStorefrontCategories();
  const { totals } = useStorefrontCart();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchPath, setSearchPath] = useState(location.pathname);
  const { featured, story } = getTemplateContent(content, categories);

  // Close the mobile search row when the route changes.
  if (searchPath !== location.pathname) {
    setSearchPath(location.pathname);
    setSearchOpen(false);
  }

  const count = totals.itemCount;
  const featuredLink = featured.category ? { to: catalogPath({ category: featured.category.id }), label: featured.title || featured.category.name } : null;

  return (
    <>
      {identity.announcement && (
        <p className="bg-primary px-4 py-2 text-center text-xs font-medium text-primary-foreground sm:text-sm">{identity.announcement}</p>
      )}
      <header className="sticky top-0 z-40 border-b border-foreground/[0.06] bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
        <div className="store-container flex h-[var(--header-height)] items-center gap-2 sm:gap-4">
          <button
            ref={menuButton}
            type="button"
            className={`${iconButton} -ml-2 lg:hidden`}
            onClick={() => setMenuOpen(true)}
            aria-label={t('nav.openMenu')}
            aria-haspopup="dialog"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>

          <Link to={PATHS.HOME} className="flex min-w-0 items-center gap-2.5 rounded-full py-1 pr-1 lg:min-w-[9rem] lg:max-w-[16rem] lg:shrink-0">
            <StoreMark identity={identity} />
          </Link>

          <nav aria-label={t('nav.menu')} className="ml-4 hidden shrink-0 items-center gap-1 lg:flex xl:ml-6">
            <DropdownMenu.Root modal={false}>
              <DropdownMenu.Trigger className={`${navLink} inline-flex items-center gap-1 data-[state=open]:text-foreground`}>
                {t('nav.shop')}
                <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="start"
                  sideOffset={10}
                  className="z-50 min-w-[14rem] rounded-2xl border border-border bg-card p-2 text-card-foreground shadow-[0_18px_40px_-20px_oklch(var(--foreground)/0.4)] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
                >
                  <DropdownMenu.Item asChild>
                    <Link to={PATHS.PRODUCTS} className="flex rounded-xl px-3 py-2 text-sm font-semibold outline-none data-[highlighted]:bg-primary/10 data-[highlighted]:text-primary">
                      {t('nav.shopAll')}
                    </Link>
                  </DropdownMenu.Item>
                  {categories.length > 0 && <DropdownMenu.Separator className="my-1 h-px bg-border" />}
                  {categories.map((category) => (
                    <DropdownMenu.Item key={category.id} asChild>
                      <Link
                        to={catalogPath({ category: category.id })}
                        className="flex rounded-xl px-3 py-2 text-sm outline-none data-[highlighted]:bg-primary/10 data-[highlighted]:text-primary"
                      >
                        {category.name}
                      </Link>
                    </DropdownMenu.Item>
                  ))}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
            <NavLink to={catalogPath({ sort: 'newest' })} className={navLink}>
              {t('nav.new')}
            </NavLink>
            {featuredLink && (
              <Link to={featuredLink.to} className={`${navLink} hidden max-w-[12rem] truncate xl:block`}>
                {featuredLink.label}
              </Link>
            )}
            {story.title && (
              <Link to={`${PATHS.HOME}#our-story`} className={navLink}>
                {t('nav.about')}
              </Link>
            )}
          </nav>

          <SearchForm className="ml-auto hidden w-full min-w-[9rem] max-w-xs md:block" />

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
