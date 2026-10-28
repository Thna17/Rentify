import React, { useState } from 'react';
import { Bell } from 'lucide-react';
import { useTranslation } from '@rentify/utils';
import { Button } from '@rentify/shared/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@rentify/shared/ui/dropdown-menu';

// The platform does not yet expose a merchant notifications contract. Keep an
// honest empty state here instead of deriving activity or seeding demo data.
export function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useTranslation();

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative min-h-10 min-w-10 shrink-0 text-muted-foreground hover:text-foreground"
          aria-label={t('dashboard.shell.notifications')}
          title={t('dashboard.shell.notifications')}
        >
          <Bell className="h-5 w-5" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[min(22rem,calc(100vw-1rem))] p-0 shadow-lg">
        <div className="border-b border-border/80 p-4">
          <h2 className="text-sm font-semibold">{t('dashboard.shell.notifications')}</h2>
        </div>
        <div className="px-5 py-8 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Bell className="h-5 w-5" aria-hidden="true" />
          </div>
          <p className="mt-3 text-sm font-medium">{t('dashboard.shell.no_notifications')}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {t('dashboard.shell.no_notifications_description')}
          </p>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default NotificationDropdown;
