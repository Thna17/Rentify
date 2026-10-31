import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

/**
 * The page frame every merchant screen shares (redesign M1–M30): one width, one padding,
 * a plain title with its actions, then filter chips and work tabs in the same style everywhere.
 * Phones get no breadcrumb, page icon or subtitle (audit P6).
 */
export function PageShell({ children, width = 'wide' }: { children: ReactNode; width?: 'narrow' | 'medium' | 'wide' }) {
  const max = width === 'narrow' ? 'max-w-3xl' : width === 'medium' ? 'max-w-4xl' : 'max-w-6xl';
  return (
    <div className="min-h-full">
      <div className={`mx-auto ${max} space-y-5 px-4 py-6 sm:px-6 md:px-8 md:py-8`}>{children}</div>
    </div>
  );
}

export function PageTitle({
  title,
  description,
  actions,
  back,
}: {
  title: ReactNode;
  /** Shown from tablet width up only. */
  description?: ReactNode;
  actions?: ReactNode;
  back?: { to: string; label: string };
}) {
  return (
    <div className="space-y-3">
      {back && (
        <Link
          to={back.to}
          className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {back.label}
        </Link>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="break-words text-2xl font-semibold tracking-tight text-foreground md:text-3xl">{title}</h1>
          {description && <p className="mt-1 hidden max-w-2xl text-sm text-muted-foreground sm:block">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 sm:shrink-0">{actions}</div>}
      </div>
    </div>
  );
}

export interface ChipItem<T extends string> {
  id: T;
  label: string;
  count?: number;
}

/** Filters that narrow a list (channels, periods). One choice at a time. */
export function FilterChips<T extends string>({
  items,
  value,
  onChange,
  label,
}: {
  items: ChipItem<T>[];
  value: T;
  onChange: (id: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0">
      {items.map((item) => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(item.id)}
            className={`inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition-colors ${
              active
                ? 'bg-foreground text-background'
                : 'border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            {item.label}
            {item.count !== undefined && <span className={active ? 'opacity-80' : 'opacity-70'}>{item.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** Work states of one list (Orders, Invoices, Reports). Underlined, scrolls sideways on phones. */
export function TabBar<T extends string>({
  items,
  value,
  onChange,
  label,
}: {
  items: ChipItem<T>[];
  value: T;
  onChange: (id: T) => void;
  label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="-mx-4 flex overflow-x-auto border-b border-border px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
      {items.map((item) => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.id)}
            className={`-mb-px inline-flex min-h-[44px] shrink-0 items-center gap-1.5 border-b-2 px-3 text-sm font-semibold transition-colors ${
              active ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {item.label}
            {item.count ? (
              <span className="rounded-full bg-muted px-1.5 text-xs font-semibold tabular-nums text-foreground">{item.count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/** Empty, error and blocked states: what happened, and one way forward. */
export function StatePanel({
  icon,
  title,
  body,
  action,
  tone = 'neutral',
}: {
  icon?: ReactNode;
  title: ReactNode;
  body?: ReactNode;
  action?: ReactNode;
  tone?: 'neutral' | 'error';
}) {
  return (
    <div
      role={tone === 'error' ? 'alert' : undefined}
      className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card px-6 py-10 text-center shadow-[var(--shadow-soft)]"
    >
      {icon && (
        <span
          className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
            tone === 'error' ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'
          }`}
          aria-hidden="true"
        >
          {icon}
        </span>
      )}
      <p className="text-base font-semibold text-foreground">{title}</p>
      {body && <p className="max-w-md text-sm text-muted-foreground">{body}</p>}
      {action}
    </div>
  );
}

export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] ${className}`}>{children}</div>;
}
