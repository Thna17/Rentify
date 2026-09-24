import { useTranslation } from '@rentify/utils';
import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

const SECTION_TITLES = {
  operations: 'Operations',
  channels: 'Sales Channels',
  system: 'Settings',
};

export function NavMain({ items, currentTab, onTabChange }) {
  const [expandedItems, setExpandedItems] = useState({ settings: true });
  const { t } = useTranslation();

  const toggleExpanded = (path) => {
    setExpandedItems((prev) => ({
      ...prev,
      [path]: !prev[path],
    }));
  };

  const handleItemClick = (item) => {
    onTabChange(item.path);
  };

  // Group items by section
  const sections = [];
  const sectionMap = {};

  items.forEach((item) => {
    const sectionKey = item.section || 'general';
    if (!sectionMap[sectionKey]) {
      sectionMap[sectionKey] = [];
      sections.push({ key: sectionKey, items: sectionMap[sectionKey] });
    }
    sectionMap[sectionKey].push(item);
  });

  const getLabel = (item) => {
    if (item.displayName) return item.displayName;
    if (item.label) return item.label;
    const translated = t(item.name);
    return translated !== item.name ? translated : item.name;
  };

  return (
    <nav className="flex flex-col gap-4 text-sm" aria-label="Sidebar Navigation">
      {sections.map(({ key, items: sectionItems }, sectionIndex) => (
        <div key={key} className="flex flex-col gap-1">
          {SECTION_TITLES[key] && (
            <div className="px-3 pt-2 pb-1 text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider">
              {SECTION_TITLES[key]}
            </div>
          )}

          <ul className="flex flex-col gap-0.5">
            {sectionItems.map((item) => {
              const isActive =
                currentTab.path === item.path ||
                (item.hasSubmenu &&
                  item.subItems?.some(
                    (subItem) => currentTab.path === subItem.path
                  ));

              const isExpanded = expandedItems[item.path] ?? false;
              const label = getLabel(item);

              return (
                <li key={item.path} className="relative">
                  <button
                    type="button"
                    onClick={() =>
                      item.hasSubmenu ? toggleExpanded(item.path) : handleItemClick(item)
                    }
                    className={`group flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-primary/10 text-primary font-semibold'
                        : 'text-muted-foreground hover:bg-accent/40 hover:text-foreground'
                    }`}
                  >
                    {item.icon && (
                      <item.icon
                        className={`mr-3 h-4 w-4 shrink-0 transition-colors ${
                          isActive
                            ? 'text-primary'
                            : 'text-muted-foreground/80 group-hover:text-foreground'
                        }`}
                      />
                    )}
                    <span className="flex-1 truncate">{label}</span>

                    {item.hasSubmenu && (
                      <span className="ml-auto pl-2 text-muted-foreground/60 group-hover:text-muted-foreground">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </span>
                    )}
                  </button>

                  {/* Submenu rendering */}
                  {item.hasSubmenu && isExpanded && item.subItems && (
                    <ul className="ml-5 mt-0.5 space-y-0.5 border-l border-border/60 pl-3 py-1">
                      {item.subItems.map((subItem) => {
                        const isSubActive = currentTab.path === subItem.path;
                        return (
                          <li key={subItem.path}>
                            <button
                              type="button"
                              onClick={() => onTabChange(subItem.path)}
                              className={`flex w-full items-center rounded-md px-2.5 py-1.5 text-xs transition-colors ${
                                isSubActive
                                  ? 'bg-primary/10 text-primary font-medium'
                                  : 'text-muted-foreground hover:bg-accent/30 hover:text-foreground'
                              }`}
                            >
                              <span className="truncate">{subItem.name}</span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
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