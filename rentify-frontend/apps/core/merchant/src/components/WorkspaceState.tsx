import { AlertTriangle, Clock3, CloudOff, FileQuestion, Lock, RefreshCw, WifiOff } from 'lucide-react';
import { Button } from '@rentify/shared/ui/button';

const icons = {
  conflict: AlertTriangle,
  empty: FileQuestion,
  error: AlertTriangle,
  forbidden: Lock,
  loading: RefreshCw,
  offline: WifiOff,
  timeout: Clock3,
  unavailable: CloudOff,
};

type WorkspaceStateProps = {
  kind?: keyof typeof icons;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  fullScreen?: boolean;
};

export function WorkspaceState({
  kind = 'empty', title, description, actionLabel, onAction, fullScreen = false,
}: WorkspaceStateProps) {
  const Icon = icons[kind];
  const isLoading = kind === 'loading';

  return (
    <section
      className={`grid place-items-center px-4 py-10 text-center ${fullScreen ? 'min-h-screen' : 'min-h-64'}`}
      aria-live={isLoading ? 'polite' : 'assertive'}
      aria-busy={isLoading}
    >
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)] sm:p-8">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-muted text-foreground">
          <Icon className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
        </div>
        <h1 className="mt-4 text-xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>}
        {actionLabel && onAction && (
          <Button className="mt-5" onClick={onAction}>
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
            {actionLabel}
          </Button>
        )}
      </div>
    </section>
  );
}
