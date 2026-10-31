import { Badge } from '@rentify/shared/ui/badge';

const VARIANT = { success: 'success', warning: 'warning', danger: 'danger', info: 'info', neutral: 'outline' };
const DOT = {
  success: 'bg-[var(--rentify-color-success-text)]',
  warning: 'bg-[var(--rentify-color-warning-text)]',
  danger: 'bg-[var(--rentify-color-danger-text)]',
  info: 'bg-[var(--rentify-color-info-text)]',
  neutral: 'bg-muted-foreground',
};

/** Dot + label status badge used in record tables. Tone: success | warning | danger | info | neutral. */
export function StatusPill({ tone = 'neutral', children, className = '' }) {
  return (
    <Badge variant={VARIANT[tone] || 'outline'} className={`gap-1.5 rounded-full px-2.5 py-0.5 font-medium ${className}`}>
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOT[tone] || DOT.neutral}`} aria-hidden="true" />
      {children}
    </Badge>
  );
}

export default StatusPill;
