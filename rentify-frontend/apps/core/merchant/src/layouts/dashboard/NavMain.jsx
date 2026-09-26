import { useTranslation } from '@rentify/utils';
import React from 'react';

// Section ordering to match clean domain hierarchy
const SECTION_ORDER = [
  'overview',
  'sell',
  'customers',
  'insights',
  'money',
  'settings',
];

// Fallback section headers if not translated
const DEFAULT_SECTION_TITLES = {
  sell: 'Sell',
  customers: 'Customers',
  insights: 'Insights',
  money: 'Money',
  settings: 'Settings',
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
            className={`flex flex-col ${sectionIdx > 0 && !isOverviewSection ? 'mt-3' : ''}`}
          >
            {/* Uppercase Section Header with clean spacing (skip for Overview) */}
            {!isOverviewSection && sectionTitle && (
              <div className="px-2.5 pb-1 text-[10px] font-semibold text-muted-foreground/50 tracking-wide uppercase select-none">
                {sectionTitle}
              </div>
            )}

            {/* Feature List Under this Section */}
            <ul className="flex flex-col gap-0.5">
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
                      className={`group flex w-full items-center h-10 rounded-xl px-3 text-left text-[13.5px] font-medium transition-colors duration-150 ${
                        isCurrentActive
                          ? 'bg-primary/[0.08] text-primary dark:bg-blue-950/30 dark:text-blue-400 font-semibold'
                          : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                      }`}
                    >
                      {item.icon && (
                        <item.icon
                          className={`mr-2.5 h-[18px] w-[18px] shrink-0 transition-colors stroke-[1.8] ${
                            isCurrentActive
                              ? 'text-primary dark:text-blue-400'
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