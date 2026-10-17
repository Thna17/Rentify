import React from 'react';
import { AlertCircle, Inbox, Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button.jsx';

const toneClasses = {
  default: {
    container: 'border-border/80 bg-background text-foreground',
    icon: 'bg-muted text-muted-foreground',
    description: 'text-muted-foreground',
  },
  warning: {
    container: 'border-amber-200 bg-amber-50/80 text-amber-950',
    icon: 'bg-amber-100 text-amber-700',
    description: 'text-amber-800',
  },
  destructive: {
    container: 'border-red-200 bg-red-50/80 text-red-950',
    icon: 'bg-red-100 text-red-700',
    description: 'text-red-800',
  },
};

export function FeedbackState({
  title,
  description,
  icon: Icon = Inbox,
  tone = 'default',
  action = null,
  className,
  layout = 'panel',
  role,
  children = null,
}) {
  const palette = toneClasses[tone] || toneClasses.default;

  return (
    <div
      className={cn(
        'flex w-full flex-col items-center justify-center gap-4 rounded-xl border p-6 text-center sm:p-8',
        layout === 'compact' && 'min-h-[180px] p-5 sm:p-6',
        palette.container,
        className
      )}
      role={role}
      aria-live={role === 'alert' ? 'assertive' : role === 'status' ? 'polite' : undefined}
      aria-busy={role === 'status' ? true : undefined}
    >
      <div className={cn('flex h-12 w-12 items-center justify-center rounded-full', palette.icon)}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <div className="space-y-1">
        <h3 className="text-base font-semibold">{title}</h3>
        {description ? (
          <p className={cn('max-w-md text-sm leading-6', palette.description)}>{description}</p>
        ) : null}
      </div>
      {children}
      {action ? <div className="flex flex-wrap items-center justify-center gap-3">{action}</div> : null}
    </div>
  );
}

export function LoadingState({
  title = 'Loading',
  description = 'Please wait while we load this content.',
  className,
  layout = 'panel',
}) {
  return (
    <FeedbackState
      title={title}
      description={description}
      icon={Loader2}
      layout={layout}
      className={className}
      role="status"
    >
      <span className="sr-only">Loading in progress</span>
      <div className="flex items-center gap-2 text-sm text-muted-foreground" aria-hidden="true">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Loading...</span>
      </div>
    </FeedbackState>
  );
}

export function EmptyState({
  title = 'Nothing to show yet',
  description = 'There is no data available for this section right now.',
  icon = Inbox,
  action = null,
  className,
  layout = 'panel',
}) {
  return (
    <FeedbackState
      title={title}
      description={description}
      icon={icon}
      action={action}
      layout={layout}
      className={className}
    />
  );
}

export function ErrorState({
  title = 'Something went wrong',
  description = 'Please try again in a moment.',
  action = null,
  icon = AlertCircle,
  className,
  layout = 'panel',
}) {
  return (
    <FeedbackState
      title={title}
      description={description}
      icon={icon}
      action={action}
      tone="destructive"
      layout={layout}
      className={className}
      role="alert"
    />
  );
}

export function RetryButton({ children = 'Try again', className, ...props }) {
  return (
    <Button variant="outline" className={cn('min-w-[9rem]', className)} {...props}>
      {children}
    </Button>
  );
}
