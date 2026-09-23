import React from 'react';
import { Link } from 'react-router-dom';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@rentify/shared/ui/navigation-menu';
import { useNavBar } from '@rentify/utils/hooks/useNavBar';

export function NavBar({ items }) {
  const { moreOpen, shopOpen, setMoreOpen, setShopOpen, maxCategoriesToShow } =
    useNavBar();

  const renderStaticPageLink = (item, index) => (
    <NavigationMenuItem key={`page-${index}`}>
      <NavigationMenuLink asChild>
        <Link
          to={item.to}
          className="px-4 py-2 rounded-md text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors duration-200"
        >
          {item.label}
        </Link>
      </NavigationMenuLink>
    </NavigationMenuItem>
  );

  const renderCategoryLinks = (categories) => (
    <>
      {categories.slice(0, maxCategoriesToShow).map((cat) => (
        <NavigationMenuItem key={`cat-${cat.id}`}>
          <NavigationMenuLink asChild>
            <Link
              to={`/products?category=${cat.name}`}
              className="px-4 py-2 rounded-md text-sm hover:bg-accent hover:text-accent-foreground transition-colors duration-200"
            >
              {cat.name}
            </Link>
          </NavigationMenuLink>
        </NavigationMenuItem>
      ))}

      {categories.length > maxCategoriesToShow && (
        <NavigationMenuItem
          onMouseEnter={() => setMoreOpen(true)}
          onMouseLeave={() => setMoreOpen(false)}
        >
          <NavigationMenuTrigger className="px-4 py-2 rounded-md text-sm font-medium bg-transparent hover:bg-accent transition-colors duration-200">
            More
          </NavigationMenuTrigger>
          {moreOpen && (
            <NavigationMenuContent className="p-3 grid gap-2 w-56 rounded-lg shadow-md bg-card border">
              {categories.slice(maxCategoriesToShow).map((cat) => (
                <Link
                  key={`more-cat-${cat.id}`}
                  to={`/products?category=${cat.name}`}
                  className="rounded-md p-3 hover:bg-accent hover:text-accent-foreground text-sm transition-colors duration-200"
                >
                  {cat.name}
                </Link>
              ))}
            </NavigationMenuContent>
          )}
        </NavigationMenuItem>
      )}
    </>
  );

  const renderShopDropdown = (categories) => (
    <NavigationMenuItem
      onMouseEnter={() => setShopOpen(true)}
      onMouseLeave={() => setShopOpen(false)}
    >
      <NavigationMenuTrigger className="px-4 py-2 rounded-md text-sm font-medium bg-transparent hover:bg-accent transition-colors duration-200">
        Shop
      </NavigationMenuTrigger>
      {shopOpen && (
        <NavigationMenuContent className="z-50 p-4 grid grid-cols-2 gap-3 sm:w-[500px] lg:w-[600px] rounded-lg shadow-md bg-card border">
          <Link
            to="/products"
            className="rounded-md p-3 hover:bg-accent font-medium text-sm transition-colors duration-200"
          >
            Shop All
          </Link>
          {categories.map((cat) => (
            <Link
              key={`dropdown-cat-${cat.id}`}
              to={`/products?category=${cat.name}`}
              className="rounded-md p-3 hover:bg-accent text-sm transition-colors duration-200"
            >
              {cat.name}
            </Link>
          ))}
        </NavigationMenuContent>
      )}
    </NavigationMenuItem>
  );

  const renderNavItem = (item, index) => {
    if (item.to && !item.type) {
      return renderStaticPageLink(item, index);
    }

    if (item.type === 'shop') {
      if (item.categories?.length === 1) {
        const cat = item.categories[0];
        return renderStaticPageLink(
          { to: `/products?category=${cat.name}`, label: cat.name },
          index
        );
      }

      return items.length > 1
        ? renderShopDropdown(item.categories)
        : renderCategoryLinks(item.categories);
    }

    return null;
  };

  return (
    <NavigationMenu>
      <NavigationMenuList className="gap-2">
        {items.length <= 1 &&
          renderStaticPageLink({ to: '/products', label: 'Shop' })}
        {items.map((item, index) => (
          <React.Fragment key={`nav-item-${index}`}>
            {renderNavItem(item, index)}
          </React.Fragment>
        ))}
      </NavigationMenuList>
    </NavigationMenu>
  );
}
