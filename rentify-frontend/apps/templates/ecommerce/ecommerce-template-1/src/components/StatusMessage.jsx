import { AlertCircle } from 'lucide-react';
import { useI18n } from '../i18n';

export function EmptyState({ icon: Icon, title, body, children, as: Heading = 'h2', className = '' }) {
  return (
    <div className={`flex flex-col items-center rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center ${className}`}>
      {Icon && (
        <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Icon className="h-6 w-6" aria-hidden="true" />
        </span>
      )}
      <Heading className="text-lg font-semibold text-foreground">{title}</Heading>
      {body && <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{body}</p>}
      {children && <div className="mt-5 flex flex-wrap justify-center gap-3">{children}</div>}
    </div>
  );
}

export function ErrorState({ title, body, onRetry, className = '' }) {
  const { t } = useI18n();
  return (
    <div role="alert" className={`flex flex-col items-center rounded-xl border border-error/30 bg-error/5 px-6 py-10 text-center ${className}`}>
      <AlertCircle className="mb-3 h-7 w-7 text-error" aria-hidden="true" />
      <h2 className="text-base font-semibold text-foreground">{title || t('error.title')}</h2>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{body || t('error.body')}</p>
      {onRetry && (
        <button type="button" className="btn-outline mt-5" onClick={() => onRetry()}>
          {t('error.retry')}
        </button>
      )}
    </div>
  );
}
