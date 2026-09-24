import { useTranslation } from '@rentify/utils';
import React from 'react';

// Section ordering to match clean domain hierarchy
const SECTION_ORDER = [
  'overview',
  'inventory',
  'orders',
  'channels',
  'analytics',
  'billing',
  'settings',
  'support',
];

// Fallback section headers if not translated
const DEFAULT_SECTION_TITLES = {
  inventory: 'Catalog & Products',
  orders: 'Sales & Orders',
  channels: 'Sales Channels',
  analytics: 'Analytics',
  billing: 'Store Plan & Billing',
  settings: 'Store Settings',
  support: 'Issues & Support',
};

export function NavMain({ items, currentTab, onTabChange }) {
  const { t } = useTranslation();

  const handleItemClick = (item) => {
    onTabChange(item.path);
  };

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

  // Group items by their defined section
  const sectionItemsMap = {};
  items.forEach((item) => {
    const sectionKey = item.section || 'overview';
    if (!sectionItemsMap[sectionKey]) {
      sectionItemsMap[sectionKey] = [];
    }
    sectionItemsMap[sectionKey].push(item);
  });

  // Keep defined section ordering
  const orderedSections = SECTION_ORDER.filter(
    (key) => sectionItemsMap[key] && sectionItemsMap[key].length > 0
  ).map((key) => ({
    key,
    items: sectionItemsMap[key],
  }));

  return (
    <nav className="flex flex-col text-sm" aria-label="Sidebar Navigation">
      {orderedSections.map(({ key, items: sectionItems }, sectionIdx) => {
        const isOverviewSection = key === 'overview';
        const sectionTitle = getSectionTitle(key);

        return (
          <div
            key={key}
            className={`flex flex-col ${sectionIdx > 0 && !isOverviewSection ? 'mt-5' : ''}`}
          >
            {/* Uppercase Section Header with clean spacing (skip for Overview) */}
            {!isOverviewSection && sectionTitle && (
              <div className="px-3 pb-1.5 text-[11px] font-bold text-muted-foreground/60 dark:text-muted-foreground/50 tracking-wider uppercase select-none">
                {sectionTitle}
              </div>
            )}

            {/* Feature List Under this Section */}
            <ul className="flex flex-col gap-1">
              {sectionItems.map((item) => {
                const isCurrentActive =
                  currentTab?.path === item.path ||
                  (item.path !== 'overview' && currentTab?.path?.startsWith(`${item.path}/`));

                const label = getLabel(item);

                return (
                  <li key={item.path} className="relative">
                    <button
                      type="button"
                      onClick={() => handleItemClick(item)}
                      className={`group flex w-full items-center rounded-xl px-3.5 py-2.5 text-left text-[14px] font-medium transition-all duration-150 ${
                        isCurrentActive
                          ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 font-semibold border border-blue-200 dark:border-blue-900/60 shadow-xs'
                          : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                      }`}
                    >
                      {item.icon && (
                        <item.icon
                          className={`mr-3.5 h-5 w-5 shrink-0 transition-colors stroke-[1.8] ${
                            isCurrentActive
                              ? 'text-blue-600 dark:text-blue-400'
                              : 'text-muted-foreground/70 group-hover:text-foreground'
                          }`}
                        />
                      )}

                      <span className="flex-1 truncate">{label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

export default NavMain;