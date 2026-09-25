import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { LayoutGrid, Menu, ReceiptText, Search, ShoppingBag, X } from 'lucide-react';
import { safeUrl } from '@rentify/storefront/content';
import { useI18n, LANGUAGES } from '../i18n';
import { PATHS, catalogPath } from '../paths';
import { FlagEnglish, FlagKhmer, KhmerSkyline, LotusCorner, RiversideScene } from './decor/Artwork';
import { NavDrawer } from './NavDrawer';
import { SearchForm } from './SearchForm';
import { SocialIcons } from './SocialIcons';
import { StoreMark } from './StoreMark';

const SCENES = { heritage: KhmerSkyline, riverside: RiversideScene };
const FLAGS = { en: FlagEnglish, kh: FlagKhmer };

const roundButton =
  'relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-foreground/75 bg-card/80 text-foreground shadow-sm transition-colors hover:bg-card focus-visible:ring-offset-0';

/** True while any part of the element is still within the viewport. */
function useOnScreen(ref) {
  const [onScreen, setOnScreen] = useState(true);
  useEffect(() => {
    const update = () => {
      const node = ref.current;
      if (node) setOnScreen(node.getBoundingClientRect().bottom > 0);
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [ref]);
  return onScreen;
}

function CartButton({ count, className = '' }) {
  const { t } = useI18n();
  return (
    <Link to={PATHS.CART} className={className} aria-label={t('nav.cartCount', { count })}>
      <ShoppingBag className="h-5 w-5" aria-hidden="true" />
      {count > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[0.6875rem] font-bold leading-none text-primary-foreground tabular-nums ring-2 ring-card">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
}

function LanguageFlagButton() {
  const { language, setLanguage, t } = useI18n();
  const current = LANGUAGES.find((item) => item.code === language) || LANGUAGES[0];
  const next = LANGUAGES.find((item) => item.code !== current.code) || current;
  const Flag = FLAGS[current.code];
  return (
    <button
      type="button"
      onClick={() => setLanguage(next.code)}
      aria-label={t('language.switch', { current: current.name, next: next.name })}
      title={next.name}
      className="h-11 w-11 shrink-0 overflow-hidden rounded-full border-2 border-card shadow-md ring-1 ring-foreground/15 transition-transform hover:scale-105"
    >
      <Flag className="h-full w-full" />
    </button>
  );
}

function CategoryPills({ categories, activeId }) {
  const { t } = useI18n();
  const pill = (active) =>
    `inline-flex h-11 shrink-0 snap-start items-center gap-2 whitespace-nowrap rounded-full border-2 pl-1.5 pr-4 text-sm font-semibold shadow-sm transition-colors ${
      active
        ? 'border-primary bg-primary text-primary-foreground'
        : 'border-foreground/75 bg-card/80 text-foreground hover:bg-card'
    }`;

  return (
    <nav aria-label={t('nav.categories')} className="min-w-0 flex-1">
      <ul className="scrollbar-none -my-2 -mr-4 flex gap-2 overflow-x-auto py-2 pr-4 sm:mr-0 sm:pr-0">
        <li className="shrink-0">
          <Link to={PATHS.PRODUCTS} className={pill(!activeId)} aria-current={!activeId ? 'page' : undefined}>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground/5">
              <LayoutGrid className="h-4 w-4" aria-hidden="true" />
            </span>
            {t('category.all')}
          </Link>
        </li>
        {categories.map((category) => {
          const active = String(category.id) === String(activeId);
          const image = safeUrl(category.image);
          return (
            <li key={category.id} className="shrink-0">
              <Link to={catalogPath({ category: category.id })} className={pill(active)} aria-current={active ? 'page' : undefined}>
                {image ? (
                  <img src={image} alt="" loading="lazy" decoding="async" className="h-8 w-8 rounded-full bg-muted object-cover" />
                ) : (
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground/5 text-xs font-bold" aria-hidden="true">
                    {category.name?.charAt(0)}
                  </span>
                )}
                {category.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * Illustrated store header: theme-tinted band with original Cambodian scene
 * artwork, round logo badge, social links, round actions and category pills.
 * A slim sticky bar takes over once the band scrolls out of view.
 */
export function SceneHeader({ identity, categories, cartCount, scene = 'heritage' }) {
  const { t } = useI18n();
  const location = useLocation();
  const [params] = useSearchParams();
  const band = useRef(null);
  const bandOnScreen = useOnScreen(band);
  const menuButton = useRef(null);
  const compactMenuButton = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [routeKey, setRouteKey] = useState(location.pathname);

  if (routeKey !== location.pathname) {
    setRouteKey(location.pathname);
    setSearchOpen(false);
  }

  const Scene = SCENES[scene] || KhmerSkyline;
  const activeCategory = location.pathname === PATHS.PRODUCTS ? params.get('category') || '' : null;

  return (
    <>
      {identity.announcement && (
        <p className="bg-foreground px-4 py-2 text-center text-xs font-medium text-background sm:text-sm">{identity.announcement}</p>
      )}

      <header ref={band} className="relative overflow-hidden bg-primary/[0.09]">
        <Scene className="pointer-events-none absolute inset-x-0 bottom-0 h-36 w-full text-primary sm:h-44" />
        <LotusCorner className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 sm:-right-2 sm:-top-4 sm:h-36 sm:w-36" />

        <div className="store-container relative pb-12 pt-4 sm:pb-14 sm:pt-6">
          <div className="flex items-start justify-between gap-2 pr-6 sm:gap-3 sm:pr-24">
            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
              <Link
                to={PATHS.HOME}
                className="relative shrink-0 rounded-full border-2 border-foreground/75 bg-card p-1 shadow-md"
                aria-label={identity.name || t('nav.home')}
              >
                {identity.logoUrl ? (
                  <img src={identity.logoUrl} alt="" className="h-14 w-14 rounded-full object-contain sm:h-[4.5rem] sm:w-[4.5rem]" />
                ) : (
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground sm:h-[4.5rem] sm:w-[4.5rem] sm:text-3xl">
                    {identity.name?.trim().charAt(0).toUpperCase() || '•'}
                  </span>
                )}
              </Link>
              <div className="min-w-0">
                <Link to={PATHS.HOME} className="line-clamp-2 text-lg font-bold leading-tight tracking-tight text-foreground sm:line-clamp-1 sm:text-2xl">
                  {identity.name}
                </Link>
                <SocialIcons
                  links={identity.socialLinks}
                  label={t('footer.follow')}
                  className="mt-1.5"
                  itemClassName="flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-background transition-transform hover:-translate-y-0.5"
                />
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Link to={PATHS.ACCOUNT} className={`${roundButton} hidden sm:inline-flex`} aria-label={t('account.orders')} title={t('account.orders')}>
                <ReceiptText className="h-5 w-5" aria-hidden="true" />
              </Link>
              <CartButton count={cartCount} className={roundButton} />
              <LanguageFlagButton />
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 sm:mt-5">
            <button
              ref={menuButton}
              type="button"
              className={`${roundButton} sm:hidden`}
              onClick={() => setMenuOpen(true)}
              aria-label={t('nav.openMenu')}
              aria-haspopup="dialog"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              className={roundButton}
              onClick={() => setSearchOpen((open) => !open)}
              aria-label={searchOpen ? t('search.close') : t('search.open')}
              aria-expanded={searchOpen}
              aria-controls="scene-search"
            >
              {searchOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Search className="h-5 w-5" aria-hidden="true" />}
            </button>
            {searchOpen ? (
              <div id="scene-search" className="min-w-0 flex-1 sm:max-w-md">
                <SearchForm autoFocus onSubmitted={() => setSearchOpen(false)} />
              </div>
            ) : (
              <CategoryPills categories={categories} activeId={activeCategory} />
            )}
          </div>
        </div>
      </header>

      {/* Compact bar shown only after the illustrated band has scrolled away. */}
      <div
        aria-hidden={bandOnScreen}
        className={`fixed inset-x-0 top-0 z-40 border-b border-border/80 bg-card/95 shadow-sm backdrop-blur transition-transform duration-200 ${
          bandOnScreen ? 'invisible -translate-y-full' : 'visible translate-y-0'
        }`}
      >
        <div className="store-container flex h-14 items-center gap-2">
          <button
            ref={compactMenuButton}
            type="button"
            className="-ml-2 inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted"
            onClick={() => setMenuOpen(true)}
            aria-label={t('nav.openMenu')}
            aria-haspopup="dialog"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
          <Link to={PATHS.HOME} className="flex min-w-0 items-center gap-2.5">
            <StoreMark identity={identity} />
          </Link>
          <SearchForm className="mx-auto hidden w-full max-w-md md:block" />
          <CartButton count={cartCount} className="relative ml-auto inline-flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted md:ml-0" />
        </div>
      </div>

      <NavDrawer
        open={menuOpen}
        onOpenChange={setMenuOpen}
        storeName={identity.name}
        categories={categories}
        returnFocusRef={bandOnScreen ? menuButton : compactMenuButton}
      />
    </>
  );
}
