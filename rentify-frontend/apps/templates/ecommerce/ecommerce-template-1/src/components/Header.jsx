import { useState } from 'react';
import { Search, Crown, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@rentify/shared/ui/button';
import { useStorefrontCategories, useHeader, StorefrontUserMenu } from '@rentify/storefront';
import { DASHBOARD_URL } from '@rentify/shared/config/urls';
import { CartPopover } from '@rentify/shared/layouts/main/CartPopover';
import { LanguageSwitcher } from '@rentify/shared/layouts/main/LanguageSwitcher';
import { SocialIcons } from '@rentify/shared/layouts/main/SocialIcons';
import { SearchBar } from '@rentify/shared/layouts/main/SearchBar';
import { NavBar } from '@rentify/shared/layouts/main/NavBar';
import { useTranslation } from '@rentify/storefront';
import { cartSelectors, useAppSelector } from '@rentify/storefront/api';
import { MobileBottomNav } from './MobileBottomNav';

export default function Header() {
  const [mobileSearchVisible, setMobileSearchVisible] = useState(false);

  const { t, language, setLanguage } = useTranslation();

  const cartItems = useAppSelector(cartSelectors.selectAll);

  const cartCount = useAppSelector((state) =>
    cartSelectors
      .selectAll(state)
      .reduce((total, item) => total + item.quantity, 0)
  );

  const [anchorEl, setAnchorEl] = useState(null);
  const handleMenuClose = () => setAnchorEl(null);

  const pages = [
    // { to: '/', label: 'Home' },
    // { to: '/about', label: 'About' },
    // { to: '/contact', label: 'Contact' },
    // { to: '/products', label: 'Shop' },
  ];

  const { categories } = useStorefrontCategories();
  const navItems = [
    ...pages,
    {
      type: 'shop',
      label: 'Shop',
      to: '/products',
      categories: categories,
    },
  ];

  const {
    isMobile,
    searchQuery,
    setSearchQuery,
    visible,
    mobileMenuOpen,
    setMobileMenuOpen,
    bottomNavValue,
    websiteName,
    handleSearch,
    setBottomNavValue,
    isCustomerAuthenticated,
    userData,
    isAuthenticated,
    isOwner,
    profile,
    handleLogout,
  } = useHeader();

  const subtotal = cartItems
    .reduce((sum, item) => sum + item.Product.price * item.quantity, 0)
    .toFixed(2);

  return (
    <>
      {/* Store Owner Bar */}
      {isOwner && (
        <div className="bg-amber-600 text-white px-4 py-1.5 text-xs font-medium flex items-center justify-between shadow-inner sticky top-0 z-[60]">
          <div className="flex items-center gap-2">
            <Crown className="h-3.5 w-3.5 fill-current" />
            <span>
              Store Owner Mode: Logged in as <strong>{profile?.name || userData?.name || 'Owner'}</strong>
            </span>
          </div>
          <a
            href={`${DASHBOARD_URL}/overview`}
            className="inline-flex items-center gap-1 font-semibold hover:underline bg-white/20 hover:bg-white/30 px-2.5 py-0.5 rounded transition text-xs"
          >
            <span>Merchant Dashboard</span>
            <ArrowRight className="h-3 w-3" />
          </a>
        </div>
      )}

      <header className="px-4 sm:px-6 lg:px-8 pt-2 sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        {/* Top strip */}
        {!isMobile && (
          <div className="hidden sm:flex items-center justify-between text-sm border-b py-2 px-4">
            <SocialIcons />
            <div className="flex items-center gap-4">
              <span className="text-primary text-xs">
                Free shipping on orders over $50
              </span>
              <LanguageSwitcher value={language} onChange={setLanguage} />
            </div>
          </div>
        )}

        {/* Main header */}
        <div className="flex items-center justify-between py-3 gap-4 h-16">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <Link to="/" className="font-bold text-xl tracking-tight text-foreground">
              {websiteName}
            </Link>
          </div>

          {!visible ? (
            <div className="hidden sm:flex flex-1 justify-center max-w-xl">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                onSubmit={handleSearch}
                className="max-w-lg"
              />
            </div>
          ) : (
            <div className="hidden sm:flex items-center justify-center py-2 flex-1">
              <NavBar items={navItems} isMobile={isMobile} />
            </div>
          )}

          {/* Mobile search toggle */}
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileSearchVisible(!mobileSearchVisible)}
              className="sm:hidden rounded-md h-9 w-9 hover:bg-accent"
              aria-label="Search"
            >
              <Search className="h-5 w-5 text-muted-foreground" />
            </Button>
          )}

          <div className="block sm:hidden">
            <LanguageSwitcher value={language} onChange={setLanguage} />
          </div>

          <div className="hidden sm:flex items-center gap-3">
            {/* Cart */}
            <CartPopover
              cartItems={cartItems}
              cartCount={cartCount}
              subtotal={subtotal}
            />

            {/* User */}
            <StorefrontUserMenu />
          </div>
        </div>

        {isMobile && mobileSearchVisible && (
          <div className="sm:hidden pb-3">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              onSubmit={handleSearch}
              autoFocus={true}
              onBlur={() => setMobileSearchVisible(false)}
            />
          </div>
        )}

        {/* Desktop nav */}

        <div className="sm:hidden flex items-center justify-center border-t py-2">
          <NavBar items={navItems} isMobile={isMobile} />
        </div>
      </header>
      {isMobile && (
        <MobileBottomNav
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
          bottomNavValue={bottomNavValue}
          cartCount={cartCount}
          setBottomNavValue={setBottomNavValue}
        />
      )}
    </>
  );
}
