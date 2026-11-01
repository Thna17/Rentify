import { useTranslation } from '@rentify/utils';
import { useLocation } from 'react-router-dom';
import { ArrowUpRight, Plus } from 'lucide-react';
import { Button } from '@rentify/shared/ui/button';
import React from 'react';

// Sidebar groups match the wireframe M_MENU exactly:
// 1. main (Home, Orders, Products, Customers, Analytics, Invoices) - no section header
// 2. channels (Marketplace, Online store, Point of sale) - "Sales channels"
// 3. more (Returns & problems, Share your store, Settings, Help) - "More"
const SECTION_ORDER = ['main', 'channels', 'more'];

const DEFAULT_SECTION_TITLES = {
  main: '',
  channels: 'Sales channels',
  more: 'More',
};

/**
 * Determines whether a sidebar nav item should be highlighted as active.
 * Handles subroutes (e.g. /settings/delivery -> Settings), query strings, and aliases.
 */
export const isNavItemActive = (item, currentPath = '', currentTab = null) => {
  if (!item || item.externalHref || item.action) return false;
  const itemPath = item.path;
  const cleanPath = (currentPath || '').replace(/^\/+/, '').split('?')[0];
  const tabPath = currentTab?.path;
  const parentPath = currentTab?.parentPath;

  if (itemPath === 'overview') {
    return cleanPath === '' || cleanPath === 'overview' || (tabPath === 'overview' && cleanPath === '');
  }

  // Exact match on item path
  if (cleanPath === itemPath || tabPath === itemPath) {
    return true;
  }

  // Subroutes / parent-child match
  if (
    cleanPath.startsWith(`${itemPath}/`) ||
    (tabPath && tabPath.startsWith(`${itemPath}/`)) ||
    parentPath === itemPath
  ) {
    return true;
  }

  // Known route aliases
  if (itemPath === 'products' && (cleanPath === 'categories' || cleanPath.startsWith('categories/'))) {
    return true;
  }
  if (itemPath === 'online-store' && (cleanPath === 'customization' || cleanPath.startsWith('customization/'))) {
    return true;
  }
  if (itemPath === 'marketplace' && (cleanPath.startsWith('marketplace/customization') || cleanPath.startsWith('marketplace/design'))) {
    return true;
  }

  return false;
};

export function NavMain({ items, currentTab, onTabChange, extraChannelItems = [] }) {
  const { t } = useTranslation();
  const location = useLocation();
  const currentPath = location?.pathname || '';

  const getLabel = (item) => {
    if (item.displayName) return item.displayName;
    if (item.label) return item.label;
    const translated = t(item.name);
    return translated !== item.name ? translated : item.name;
  };

  const getSectionTitle = (sectionKey) => {
    const translationKey = `dashboard.sections.${sectionKey}`;
    const translated = t(translationKey);
    return translated && translated !== translationKey
      ? translated
      : DEFAULT_SECTION_TITLES[sectionKey] || sectionKey;
  };

  const handleItemClick = (item) => {
    if (item.externalHref) {
      window.open(item.externalHref, '_blank', 'noopener,noreferrer');
      return;
    }
    onTabChange(item.path);
  };

  const sectionItemsMap = {};
  items.forEach((item) => {
    const sectionKey = item.section || 'main';
    (sectionItemsMap[sectionKey] ||= []).push(item);
  });
  if (extraChannelItems.length) {
    (sectionItemsMap.channels ||= []).push(...extraChannelItems);
  }

  const orderedSections = SECTION_ORDER.filter((key) => sectionItemsMap[key]?.length).map((key) => ({
    key,
    items: sectionItemsMap[key],
  }));

  return (
    <nav className="flex flex-col gap-5 text-sm" aria-label={t('merchant.shell.sidebarNavigation')}>
      {orderedSections.map(({ key, items: sectionItems }) => (
        <div key={key} className="flex flex-col">
          {key !== 'main' && (
            <div className="px-3 pb-1.5 text-[11px] font-medium text-muted-foreground/70 select-none">
              {getSectionTitle(key)}
            </div>
          )}

          <ul className="flex flex-col gap-0.5">
            {sectionItems.map((item) => {
              const isActive = isNavItemActive(item, currentPath, currentTab);
              const label = getLabel(item);
              const Icon = item.icon;

              // "Add a channel" entries link to onboarding and look quieter than real pages
              if (item.action) {
                return (
                  <li key={item.key}>
                    <Button asChild variant="ghost" className="group h-10 w-full justify-start rounded-lg px-3 text-[13.5px] font-medium text-primary hover:bg-primary/[0.08] hover:text-primary">
                      <a href={item.href}>
                      <span className="flex h-[22px] w-[22px] items-center justify-center rounded-lg bg-primary/10">
                        <Plus className="h-3.5 w-3.5" />
                      </span>
                      <span className="flex-1 truncate">{item.label}</span>
                      </a>
                    </Button>
                  </li>
                );
              }

              return (
                <li key={item.path}>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => handleItemClick(item)}
                    aria-current={isActive ? 'page' : undefined}
                    title={item.hint}
                    className={`group h-10 w-full justify-start rounded-lg px-3 text-left text-[13.5px] ${
                      isActive
                        ? 'bg-sidebar-primary text-sidebar-primary-foreground font-semibold shadow-sm hover:bg-sidebar-primary/90 hover:text-sidebar-primary-foreground'
                        : 'font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                    }`}
                  >
                    {Icon && (
                      <Icon
                        className={`h-[18px] w-[18px] shrink-0 stroke-[1.8] ${
                          isActive ? 'text-sidebar-primary-foreground' : 'text-sidebar-foreground/50 group-hover:text-sidebar-accent-foreground'
                        }`}
                      />
                    )}
                    <span className="flex-1 truncate">{label}</span>
                    {item.badge > 0 && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${
                          isActive ? 'bg-sidebar-primary-foreground/20 text-sidebar-primary-foreground' : 'bg-muted text-foreground'
                        }`}
                      >
                        {item.badge}
                        <span className="sr-only"> {item.badgeLabel}</span>
                      </span>
                    )}
                    {item.externalHref && (
                      <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-foreground/40 group-hover:text-foreground" />
                    )}
                  </Button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export default NavMain;
