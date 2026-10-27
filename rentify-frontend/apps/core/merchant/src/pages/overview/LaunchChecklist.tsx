import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '@rentify/utils';
import { AlertCircle, ArrowRight, CheckCircle2, CircleDashed, Clock3, RefreshCw, ShieldAlert, XCircle } from 'lucide-react';
import { Button } from '@rentify/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@rentify/shared/ui/card';
import { actionLabel, actionTarget, checklistCopy, emitActivation, itemLabels, reasonLabel, type ChecklistStatus } from './launchChecklistModel';
import { useLaunchChecklist, type ChecklistLoadState } from './useLaunchChecklist';

const statusStyle: Record<ChecklistStatus, string> = {
  complete: 'border-emerald-600/30 bg-emerald-600/10 text-emerald-800 dark:text-emerald-300',
  incomplete: 'border-amber-600/30 bg-amber-600/10 text-amber-900 dark:text-amber-300',
  blocked: 'border-slate-500/30 bg-slate-500/10 text-slate-800 dark:text-slate-200',
  pending: 'border-blue-600/30 bg-blue-600/10 text-blue-800 dark:text-blue-300',
  failed: 'border-destructive/30 bg-destructive/10 text-destructive',
};

const StatusIcon = ({ status }: { status: ChecklistStatus }) => {
  const Icon = status === 'complete' ? CheckCircle2 : status === 'pending' ? Clock3 : status === 'failed' ? XCircle : status === 'blocked' ? ShieldAlert : CircleDashed;
  return <Icon className="h-5 w-5" aria-hidden="true" />;
};

const StateCard = ({ state, language, onRetry }: { state: Exclude<ChecklistLoadState, 'ready'>; language?: string; onRetry: () => void }) => {
  const copy = checklistCopy(language);
  if (state === 'loading') return (
    <Card aria-busy="true" aria-label={copy.loading}>
      <CardContent className="space-y-4 p-5 sm:p-6">
        <span className="sr-only" role="status">{copy.loading}</span>
        <div className="h-6 w-48 animate-pulse rounded bg-muted motion-reduce:animate-none" />
        {[0, 1, 2].map((value) => <div key={value} className="h-20 animate-pulse rounded-xl bg-muted/70 motion-reduce:animate-none" />)}
      </CardContent>
    </Card>
  );
  const content = state === 'forbidden' ? [copy.forbiddenTitle, copy.forbiddenBody] : state === 'offline' ? [copy.offlineTitle, copy.offlineBody] : state === 'timeout' ? [copy.timeoutTitle, copy.timeoutBody] : state === 'empty' ? [copy.emptyTitle, copy.emptyBody] : [copy.errorTitle, copy.errorBody];
  return (
    <Card role="alert" className="border-destructive/20">
      <CardContent className="flex flex-col items-start gap-3 p-5 sm:p-6">
        <AlertCircle className="h-6 w-6 text-destructive" aria-hidden="true" />
        <div><h2 className="font-semibold">{content[0]}</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">{content[1]}</p></div>
        {state !== 'forbidden' && <Button type="button" variant="outline" onClick={onRetry}><RefreshCw className="mr-2 h-4 w-4" />{copy.retry}</Button>}
      </CardContent>
    </Card>
  );
};

export const LaunchChecklist = () => {
  const navigate = useNavigate();
  const { language } = useTranslation() as { language?: string };
  const locale = language === 'kh' ? 'kh' : 'en';
  const copy = checklistCopy(locale);
  const { data, state, refresh } = useLaunchChecklist();

  useEffect(() => {
    if (state === 'ready' && data) {
      emitActivation('launch_checklist_viewed', { path: data.merchantPath, total: data.summary.totalCount, complete: data.summary.completeCount, stale: data.stale });
      if (!data.stale && data.summary.totalCount > 0 && data.summary.completeCount === data.summary.totalCount) {
        emitActivation('launch_checklist_completed', { path: data.merchantPath, total: data.summary.totalCount });
      }
    }
  }, [data, state]);

  if (state !== 'ready' || !data) return <StateCard state={state === 'ready' ? 'empty' : state} language={locale} onRetry={() => { emitActivation('launch_checklist_retry'); void refresh(); }} />;

  const handleAction = (code: string, itemId: string, status: ChecklistStatus) => {
    emitActivation('launch_checklist_action', { action: code, item: itemId, status });
    if (code === 'RETRY_CHECKLIST') void refresh();
    else if (code === 'COMPLETE_REQUIRED_ITEMS') document.getElementById('launch-checklist-items')?.focus();
    else {
      const target = actionTarget(code);
      if (target) navigate(target);
    }
  };

  return (
    <Card aria-labelledby="launch-checklist-heading" className="overflow-hidden border-border/80 shadow-[var(--shadow-soft)]">
      <CardHeader className="border-b border-border/70 bg-muted/25 p-5 sm:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle id="launch-checklist-heading" className="text-xl">{copy.title}</CardTitle>
              <span className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                {data.merchantPath === 'storefront' ? copy.storefrontPath : copy.marketplacePath}
              </span>
            </div>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{copy.description}</p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <span className="rounded-full bg-foreground px-3 py-1.5 text-xs font-semibold text-background" aria-label={copy.completeLabel(data.summary.completeCount, data.summary.totalCount)}>
              {copy.completeLabel(data.summary.completeCount, data.summary.totalCount)}
            </span>
            <Button type="button" size="sm" variant="outline" onClick={() => { emitActivation('launch_checklist_refresh'); void refresh(); }}>
              <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />{copy.refresh}
            </Button>
          </div>
        </div>
        {data.stale && (
          <div role="status" className="mt-4 flex items-start gap-3 rounded-xl border border-amber-600/30 bg-amber-500/10 p-3 text-amber-950 dark:text-amber-200">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <div><p className="text-sm font-semibold">{copy.staleTitle}</p><p className="mt-0.5 text-sm leading-6">{copy.staleBody}</p></div>
          </div>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <ul id="launch-checklist-items" tabIndex={-1} className="divide-y divide-border/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
          {data.items.map((item) => (
            <li key={item.id} className="grid gap-3 p-4 sm:p-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
              <div className="flex min-w-0 items-start gap-3">
                <span className={`mt-0.5 rounded-full p-1 ${statusStyle[item.status]}`}><StatusIcon status={item.status} /></span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="break-words text-sm font-semibold sm:text-base">{itemLabels[locale][item.id] || item.id}</h3>
                    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusStyle[item.status]}`}>{copy.status[item.status]}</span>
                  </div>
                  {item.reasonCode && <p className="mt-1 text-sm leading-6 text-muted-foreground">{reasonLabel(item.reasonCode, locale)}</p>}
                  {item.detail && <p className="mt-1 rounded-lg bg-muted px-3 py-2 text-sm leading-6 text-foreground">{item.detail}</p>}
                </div>
              </div>
              {item.nextAction && (
                <Button type="button" size="sm" variant={item.status === 'failed' || item.status === 'blocked' ? 'default' : 'outline'} className="w-full justify-between md:w-auto" onClick={() => handleAction(item.nextAction!.code, item.id, item.status)}>
                  {actionLabel(item.nextAction.code, locale)}<ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Button>
              )}
            </li>
          ))}
        </ul>
        <div className="border-t border-border/70 px-5 py-3 text-xs text-muted-foreground">
          {copy.updated}: <time dateTime={data.observedAt}>{new Intl.DateTimeFormat(locale === 'kh' ? 'km-KH' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(data.observedAt))}</time>
        </div>
      </CardContent>
    </Card>
  );
};
