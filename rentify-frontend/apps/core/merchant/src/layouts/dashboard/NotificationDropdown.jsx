import React, { useState, useEffect } from 'react';
import {
  Bell,
  ShoppingBag,
  AlertTriangle,
  Store,
  CreditCard,
  Check,
  Trash2,
} from 'lucide-react';
import { Button } from '@rentify/shared/ui/button';
import { Badge } from '@rentify/shared/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@rentify/shared/ui/dropdown-menu';

const INITIAL_NOTIFICATIONS = [
  {
    id: 'notif-1',
    title: 'New Marketplace Order #ORD-1042',
    description: 'Received order from Central Marketplace ($129.00)',
    time: '15m ago',
    read: false,
    type: 'order',
    path: 'marketplace-orders',
  },
  {
    id: 'notif-2',
    title: 'Low Stock Alert',
    description: 'Wireless Noise-Canceling Earbuds has 2 units remaining.',
    time: '1h ago',
    read: false,
    type: 'stock',
    path: 'products',
  },
  {
    id: 'notif-3',
    title: 'Storefront Synced',
    description: 'Catalog and theme updates published to live storefront.',
    time: '3h ago',
    read: false,
    type: 'system',
    path: 'store-management',
  },
  {
    id: 'notif-4',
    title: 'Weekly Payout Processed',
    description: 'Settlement payment of $450.00 was disbursed to your account.',
    time: '1d ago',
    read: true,
    type: 'payout',
    path: 'usage/billing',
  },
];

export function NotificationDropdown({ onTabChange }) {
  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem('merchant_notifications');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // Fallback
    }
    return INITIAL_NOTIFICATIONS;
  });

  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('merchant_notifications', JSON.stringify(notifications));
    } catch {
      // Ignore
    }
  }, [notifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAllRead = (e) => {
    e.stopPropagation();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleClearAll = (e) => {
    e.stopPropagation();
    setNotifications([]);
  };

  const handleItemClick = (item) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, read: true } : n))
    );
    setIsOpen(false);
    if (item.path && onTabChange) {
      onTabChange(item.path);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'order':
        return (
          <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <ShoppingBag className="h-4 w-4" />
          </div>
        );
      case 'stock':
        return (
          <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-4 w-4" />
          </div>
        );
      case 'payout':
        return (
          <div className="h-8 w-8 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <CreditCard className="h-4 w-4" />
          </div>
        );
      case 'system':
      default:
        return (
          <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Store className="h-4 w-4" />
          </div>
        );
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative shrink-0 text-muted-foreground hover:text-foreground"
          aria-label="Notifications"
          title="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-xs ring-2 ring-background animate-in fade-in">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-80 sm:w-96 p-0 shadow-lg border-border bg-popover"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3.5 border-b border-border/80">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-foreground">Notifications</span>
            {unreadCount > 0 && (
              <Badge
                variant="secondary"
                className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-0 text-[11px] font-semibold px-1.5 py-0.5"
              >
                {unreadCount} new
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllRead}
                className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground"
                title="Mark all as read"
              >
                <Check className="h-3.5 w-3.5 mr-1" />
                Mark all read
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClearAll}
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                title="Clear all"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="max-h-80 overflow-y-auto divide-y divide-border/40">
          {notifications.length > 0 ? (
            notifications.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleItemClick(item)}
                className={`w-full flex items-start gap-3 p-3 text-left transition-colors hover:bg-muted/50 ${
                  !item.read ? 'bg-muted/20' : ''
                }`}
              >
                {getIcon(item.type)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span
                      className={`text-xs truncate ${
                        !item.read
                          ? 'font-semibold text-foreground'
                          : 'font-medium text-foreground/80'
                      }`}
                    >
                      {item.title}
                    </span>
                    <span className="text-[10px] text-muted-foreground/70 shrink-0">
                      {item.time}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                </div>
                {!item.read && (
                  <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                )}
              </button>
            ))
          ) : (
            <div className="py-8 px-4 text-center">
              <div className="mx-auto h-10 w-10 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground mb-2">
                <Bell className="h-5 w-5 opacity-50" />
              </div>
              <p className="text-xs font-medium text-foreground">All caught up!</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                No new notifications at this time.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="p-2 border-t border-border/80 bg-muted/20 flex justify-center">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onTabChange?.('orders');
              }}
              className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline py-1"
            >
              View all orders &amp; activity &rarr;
            </button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default NotificationDropdown;
