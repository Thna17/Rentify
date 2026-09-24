import { useTranslation } from '@rentify/utils';
import React, { useState } from 'react';
import {
  Headphones,
  Mail,
  Send,
  ExternalLink,
  BookOpen,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@rentify/shared/ui/dialog';
import { Button } from '@rentify/shared/ui/button';

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
  const [supportDialogOpen, setSupportDialogOpen] = useState(false);
  const { t } = useTranslation();

  const handleItemClick = (item) => {
    if (item.path === 'help') {
      setSupportDialogOpen(true);
      return;
    }
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
    <>
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
                            ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400 font-semibold border border-emerald-500/20 shadow-xs'
                            : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                        }`}
                      >
                        {item.icon && (
                          <item.icon
                            className={`mr-3.5 h-5 w-5 shrink-0 transition-colors stroke-[1.8] ${
                              isCurrentActive
                                ? 'text-emerald-600 dark:text-emerald-400'
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

      {/* Support Dialog */}
      <Dialog open={supportDialogOpen} onOpenChange={setSupportDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Headphones className="h-4.5 w-4.5" />
              </div>
              <DialogTitle className="text-lg">Merchant Support</DialogTitle>
            </div>
            <DialogDescription>
              We are here to assist you with store operations, marketplace selling, and payments.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <a
              href="mailto:support@rentify.com"
              className="flex items-center justify-between p-3 rounded-xl border border-border hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium text-foreground">Email Support</div>
                  <div className="text-xs text-muted-foreground">support@rentify.com</div>
                </div>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </a>

            <a
              href="https://t.me/rentify_support"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between p-3 rounded-xl border border-border hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Send className="h-5 w-5 text-sky-500" />
                <div>
                  <div className="text-sm font-medium text-foreground">Telegram Community</div>
                  <div className="text-xs text-muted-foreground">Direct merchant chat & updates</div>
                </div>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </a>

            <div className="p-3 rounded-xl bg-muted/40 border border-border/60 text-xs space-y-1">
              <div className="font-semibold text-foreground flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                Helpful Guides
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Check our documentation on managing products, fulfilling orders, and configuring payments.
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={() => setSupportDialogOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default NavMain;