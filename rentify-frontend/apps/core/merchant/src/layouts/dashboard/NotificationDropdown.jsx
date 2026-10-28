import React, { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { useTranslation } from '@rentify/utils';
import { RENTIFY_API_BASE } from '@rentify/shared/config/urls';
import { Button } from '@rentify/shared/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@rentify/shared/ui/dropdown-menu';

const labels = {
  en: { title: 'Notifications', loading: 'Loading notifications…', empty: 'No notifications yet.',
    error: 'Notifications could not be loaded.', retry: 'Try again', more: 'Load more', mark: 'Mark as read', unread: 'Mark as unread' },
  km: { title: 'សេចក្ដីជូនដំណឹង', loading: 'កំពុងផ្ទុកសេចក្ដីជូនដំណឹង…', empty: 'មិនទាន់មានសេចក្ដីជូនដំណឹងទេ។',
    error: 'មិនអាចផ្ទុកសេចក្ដីជូនដំណឹងបានទេ។', retry: 'ព្យាយាមម្ដងទៀត', more: 'ផ្ទុកបន្ថែម', mark: 'សម្គាល់ថាបានអាន', unread: 'សម្គាល់ថាមិនទាន់អាន' },
};

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

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative min-h-10 min-w-10 shrink-0" aria-label={text.title} title={text.title}>
          <Bell className="h-5 w-5" aria-hidden="true" />
          {items.some((item) => !item.readAt) && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-blue-600" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(22rem,calc(100vw-1rem))] p-0 shadow-lg">
        <h2 className="border-b p-4 text-sm font-semibold">{text.title}</h2>
        <div className="max-h-[min(65vh,32rem)] overflow-y-auto" aria-live="polite">
          {loading && <p className="p-4 text-sm">{text.loading}</p>}
          {error && <div role="alert" className="p-4 text-sm">{text.error} <button type="button" className="underline" onClick={() => load()}>{text.retry}</button></div>}
          {!loading && !error && !items.length && <p className="p-5 text-sm text-muted-foreground">{text.empty}</p>}
          {items.map((item) => <div key={item.id} className="border-b p-4 text-sm">
            <p className={item.readAt ? 'font-medium' : 'font-bold'}>{item.title}</p>
            <p className="mt-1 text-muted-foreground">{item.body}</p>
            <button type="button" className="mt-2 text-xs underline" onClick={() => toggleRead(item)}>{item.readAt ? text.unread : text.mark}</button>
          </div>)}
          {cursor && <button type="button" className="w-full p-4 text-sm underline" disabled={loading} onClick={() => load(cursor)}>{text.more}</button>}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
export default NotificationDropdown;
