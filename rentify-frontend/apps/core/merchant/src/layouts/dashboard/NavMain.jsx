import { useTranslation } from '@rentify/utils';
import { ArrowUpRight, Plus } from 'lucide-react';
import { Button } from '@rentify/shared/ui/button';
import React from 'react';

// Grouped by what a merchant is doing, not by system module
const SECTION_ORDER = ['overview', 'sell', 'channels', 'grow', 'money', 'settings'];

const DEFAULT_SECTION_TITLES = {
  sell: 'Sell',
  channels: 'Sales channels',
  grow: 'Customers & insights',
  money: 'Money',
  settings: 'Account',
};

export function NavMain({ items, currentTab, onTabChange, extraChannelItems = [] }) {
  const { t } = useTranslation();

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
    const sectionKey = item.section || 'overview';
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
    <nav className="flex flex-col gap-5 text-sm" aria-label="Sidebar Navigation">
      {orderedSections.map(({ key, items: sectionItems }) => (
        <div key={key} className="flex flex-col">
          {key !== 'overview' && (
            <div className="px-3 pb-1.5 text-[11px] font-medium text-muted-foreground/70 select-none">
              {getSectionTitle(key)}
            </div>
          )}

          <ul className="flex flex-col gap-0.5">
            {sectionItems.map((item) => {
              const isActive =
                !item.externalHref &&
                !item.action &&
                (currentTab?.path === item.path ||
                  (item.path !== 'overview' && currentTab?.path?.startsWith(`${item.path}/`)));
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
