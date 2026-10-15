import { useEffect, useState } from 'react';
import { useI18n } from '../i18n';
import { openStatus } from '../storeContent';

const MINUTE_MS = 60 * 1000;

/**
 * "Open now" / "Closed now" from the merchant's opening hours, read on the
 * shopper's clock and refreshed every minute. Renders nothing when today's
 * hours can't be read, so the store never guesses.
 */
export function OpenStatus({ hours, onDark = false, className = '' }) {
  const { t } = useI18n();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!hours?.length) return undefined;
    const timer = window.setInterval(() => setNow(new Date()), MINUTE_MS);
    return () => window.clearInterval(timer);
  }, [hours?.length]);

  const open = hours?.length ? openStatus(hours, now) : null;
  if (open === null) return null;

  const tone = onDark
    ? 'bg-secondary-foreground/10 text-secondary-foreground'
    : open
      ? 'bg-success/10 text-success'
      : 'bg-foreground/[0.06] text-muted-foreground';

  return (
    <p className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${tone} ${className}`}>
      <span className="relative flex h-2 w-2" aria-hidden="true">
        {open && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/60" />}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${open ? 'bg-success' : 'bg-muted-foreground/60'}`} />
      </span>
      {open ? t('visit.openNow') : t('visit.closedNow')}
    </p>
  );
}
