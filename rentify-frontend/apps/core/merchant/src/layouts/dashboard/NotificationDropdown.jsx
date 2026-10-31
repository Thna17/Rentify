import React, { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { useTranslation } from '@rentify/utils';
import { RENTIFY_API_BASE } from '@rentify/shared/config/urls';
import { Button } from '@rentify/shared/ui/button';
import { Badge } from '@rentify/shared/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@rentify/shared/ui/dropdown-menu';

const labels = {
  en: { title: 'Notifications', loading: 'Loading notifications…', empty: 'All caught up!', emptyHint: 'No notifications yet.',
    error: 'Notifications could not be loaded.', retry: 'Try again', more: 'Load more', mark: 'Mark as read', unread: 'Mark as unread', fresh: 'new' },
  km: { title: 'សេចក្ដីជូនដំណឹង', loading: 'កំពុងផ្ទុកសេចក្ដីជូនដំណឹង…', empty: 'គ្មានអ្វីថ្មីទេ!', emptyHint: 'មិនទាន់មានសេចក្ដីជូនដំណឹងទេ។',
    error: 'មិនអាចផ្ទុកសេចក្ដីជូនដំណឹងបានទេ។', retry: 'ព្យាយាមម្ដងទៀត', more: 'ផ្ទុកបន្ថែម', mark: 'សម្គាល់ថាបានអាន', unread: 'សម្គាល់ថាមិនទាន់អាន', fresh: 'ថ្មី' },
};

// Real inbox from Core (/api/notifications/inbox); the layout is the renovated merchant shell's
export function NotificationDropdown() {
  const { language } = useTranslation();
  const text = labels[language === 'kh' ? 'km' : 'en'];
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  async function load(after = null) {
    setLoading(true); setError(false);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      const query = after ? `?after=${encodeURIComponent(after)}` : '';
      const response = await fetch(`${RENTIFY_API_BASE}/api/notifications/inbox${query}`, { credentials: 'include', signal: controller.signal });
      if (!response.ok) throw new Error('Inbox unavailable');
      const result = await response.json();
      setItems((previous) => after ? [...previous, ...result.data] : result.data);
      setCursor(result.page?.nextCursor || null);
    } catch { setError(true); }
    finally { clearTimeout(timer); setLoading(false); }
  }
  useEffect(() => { if (open) load(); }, [open]);

  async function toggleRead(item) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(`${RENTIFY_API_BASE}/api/notifications/inbox/${encodeURIComponent(item.id)}/read`, {
        method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ read: !item.readAt }), signal: controller.signal,
      });
      if (!response.ok) throw new Error('Update failed');
      const result = await response.json();
      setItems((previous) => previous.map((entry) => entry.id === item.id ? result.data : entry));
    } catch { setError(true); }
    finally { clearTimeout(timer); }
  }

  const unread = items.filter((item) => !item.readAt).length;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-11 w-11 shrink-0 text-muted-foreground hover:text-foreground"
          aria-label={text.title}
          title={text.title}
        >
          <Bell className="h-5 w-5" aria-hidden="true" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground ring-2 ring-background">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" collisionPadding={16} className="w-[min(24rem,calc(100vw-2rem))] p-0 shadow-lg bg-popover">
        <div className="flex items-center gap-2 p-3.5">
          <h2 className="font-semibold text-sm text-foreground">{text.title}</h2>
          {unread > 0 && (
            <Badge variant="secondary" className="border-0 text-[11px] font-semibold px-1.5 py-0.5">
              {unread} {text.fresh}
            </Badge>
          )}
        </div>

        <div className="max-h-[min(65vh,32rem)] overflow-y-auto" aria-live="polite">
          {loading && !items.length && <p className="px-4 py-6 text-xs text-muted-foreground">{text.loading}</p>}
          {error && (
            <div role="alert" className="px-4 py-3 text-xs text-foreground">
              {text.error}{' '}
              <button type="button" className="font-medium underline" onClick={() => load()}>{text.retry}</button>
            </div>
          )}
          {!loading && !error && !items.length && (
            <div className="py-8 px-4 text-center">
              <div className="mx-auto h-10 w-10 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground mb-2">
                <Bell className="h-5 w-5 opacity-50" aria-hidden="true" />
              </div>
              <p className="text-xs font-medium text-foreground">{text.empty}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{text.emptyHint}</p>
            </div>
          )}
          {items.map((item) => (
            <div key={item.id} className={`flex items-start gap-3 px-3.5 py-3 ${!item.readAt ? 'bg-muted/30' : ''}`}>
              <div className="flex-1 min-w-0">
                <p className={`text-xs ${!item.readAt ? 'font-semibold text-foreground' : 'font-medium text-foreground/80'}`}>{item.title}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">{item.body}</p>
                <button
                  type="button"
                  className="mt-1.5 min-h-[28px] text-[11px] font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => toggleRead(item)}
                >
                  {item.readAt ? text.unread : text.mark}
                </button>
              </div>
              {!item.readAt && <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" aria-hidden="true" />}
            </div>
          ))}
          {cursor && (
            <button
              type="button"
              className="w-full min-h-[44px] text-xs font-medium text-muted-foreground hover:text-foreground"
              disabled={loading}
              onClick={() => load(cursor)}
            >
              {text.more}
            </button>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
export default NotificationDropdown;
