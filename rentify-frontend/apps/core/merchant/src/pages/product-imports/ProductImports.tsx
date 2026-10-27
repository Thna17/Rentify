import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, RefreshCw, Upload, XCircle } from 'lucide-react';
import { useTranslation } from '@rentify/utils';
import { Button } from '@rentify/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@rentify/shared/ui/card';
import { Input } from '@rentify/shared/ui/input';
import { Label } from '@rentify/shared/ui/label';
import { Badge } from '@rentify/shared/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@rentify/shared/ui/alert';
import { PageHeader } from '../../layouts/dashboard/PageHeader';
import { WorkspaceState } from '../../components/WorkspaceState';
import { useChannels } from '../../context/ChannelContext';
import { productImportApi, importErrorKey, importStateFor, type ImportJob } from './productImportApi';

type LoadState = 'loading' | 'ready' | 'forbidden' | 'timeout' | 'offline' | 'conflict' | 'error';
const finished = new Set(['completed', 'completed_with_errors']);

export default function ProductImports() {
  const { t } = useTranslation();
  const { store } = useChannels();
  const storeId = store?.storeId || store?.id;
  const [jobs, setJobs] = useState<ImportJob[]>([]);
  const [activeJob, setActiveJob] = useState<ImportJob | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<LoadState>('loading');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const uploadKey = useRef(crypto.randomUUID());

  const loadHistory = useCallback(async () => {
    if (!storeId) return;
    try {
      setState('loading');
      const result = await productImportApi.history(storeId);
      setJobs(result);
      setState('ready');
    } catch (error) {
      setState(importStateFor(error));
    }
  }, [storeId]);

  useEffect(() => { void loadHistory(); }, [loadHistory]);

  useEffect(() => {
    if (!storeId || !activeJob || !['queued', 'processing'].includes(activeJob.status)) return undefined;
    const timer = window.setInterval(async () => {
      try {
        const next = await productImportApi.get(storeId, activeJob.id);
        setActiveJob(next);
        if (finished.has(next.status) || next.status === 'failed') {
          window.clearInterval(timer);
          void loadHistory();
        }
      } catch (error) {
        setMessage(t(`dashboard.imports.${importStateFor(error)}_message`));
      }
    }, 1500);
    return () => window.clearInterval(timer);
  }, [activeJob, loadHistory, storeId, t]);

  const preview = async () => {
    if (!file || !storeId) return;
    setBusy(true); setMessage('');
    try {
      const job = await productImportApi.preview(storeId, file, uploadKey.current);
      setActiveJob(job);
      setState('ready');
      await loadHistory();
    } catch (error) {
      setState(importStateFor(error));
      setMessage(t(importErrorKey(error)));
    } finally { setBusy(false); }
  };

  const start = async (retry = false) => {
    if (!storeId || !activeJob) return;
    setBusy(true); setMessage('');
    try {
      setActiveJob(await productImportApi.start(storeId, activeJob.id, retry));
    } catch (error) {
      setState(importStateFor(error));
      setMessage(t(importErrorKey(error)));
    } finally { setBusy(false); }
  };

  const chooseJob = async (job: ImportJob) => {
    if (!storeId) return;
    setBusy(true); setMessage('');
    try { setActiveJob(await productImportApi.get(storeId, job.id)); }
    catch (error) { setState(importStateFor(error)); }
    finally { setBusy(false); }
  };

  const newUpload = () => {
    setFile(null); setActiveJob(null); setMessage(''); setState('ready');
    uploadKey.current = crypto.randomUUID();
  };

  if (!storeId) return <WorkspaceState kind="empty" title={t('dashboard.imports.no_store')} />;
  if (state !== 'ready' && state !== 'conflict') {
    return (
      <WorkspaceState
        kind={state}
        title={t(`dashboard.imports.${state}_title`)}
        description={t(`dashboard.imports.${state}_message`)}
        actionLabel={state === 'loading' || state === 'forbidden' ? undefined : t('dashboard.imports.retry')}
        onAction={state === 'loading' || state === 'forbidden' ? undefined : loadHistory}
      />
    );
  }

  return (
    <div className="min-h-full">
      <PageHeader
        title={t('dashboard.imports.title')}
        description={t('dashboard.imports.description')}
        icon={FileSpreadsheet}
        breadcrumb={[
          { label: t('dashboard.product.title'), href: '/products' },
          { label: t('dashboard.imports.title') },
        ]}
        breadcrumbAriaLabel={t('dashboard.imports.breadcrumb')}
        actions={(
          <>
            <Button variant="outline" onClick={() => productImportApi.download(storeId, 'template')}>
              <Download className="mr-2 h-4 w-4" aria-hidden="true" />{t('dashboard.imports.template')}
            </Button>
            <Button variant="outline" onClick={() => productImportApi.download(storeId, 'export')}>
              <Download className="mr-2 h-4 w-4" aria-hidden="true" />{t('dashboard.imports.export')}
            </Button>
          </>
        )}
      />

      <div className="mx-auto grid max-w-[1400px] gap-6 px-4 py-6 sm:px-6 md:px-8 lg:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
        <div className="space-y-6">
          {message && (
            <Alert variant={state === 'conflict' ? 'destructive' : 'default'}>
              <AlertCircle className="h-4 w-4" aria-hidden="true" />
              <AlertTitle>{t('dashboard.imports.attention')}</AlertTitle>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          {!activeJob ? (
            <Card className="border-border/70 shadow-[var(--shadow-soft)]">
              <CardHeader><CardTitle>{t('dashboard.imports.upload_title')}</CardTitle></CardHeader>
              <CardContent className="space-y-5">
                <ol className="list-decimal space-y-2 pl-5 text-sm leading-6 text-muted-foreground">
                  <li>{t('dashboard.imports.step_template')}</li>
                  <li>{t('dashboard.imports.step_upload')}</li>
                  <li>{t('dashboard.imports.step_review')}</li>
                </ol>
                <div className="space-y-2">
                  <Label htmlFor="product-import-file">{t('dashboard.imports.file_label')}</Label>
                  <Input
                    id="product-import-file" type="file" accept=".csv,text/csv" className="h-auto py-2"
                    onChange={(event) => {
                      const selected = event.target.files?.[0] || null;
                      setFile(selected); uploadKey.current = crypto.randomUUID(); setMessage('');
                    }}
                    aria-describedby="product-import-help"
                  />
                  <p id="product-import-help" className="text-xs leading-5 text-muted-foreground">
                    {t('dashboard.imports.file_help')}
                  </p>
                </div>
                <Button onClick={preview} disabled={!file || busy}>
                  <Upload className="mr-2 h-4 w-4" aria-hidden="true" />
                  {busy ? t('dashboard.imports.validating') : t('dashboard.imports.preview')}
                </Button>
                <p className="text-xs leading-5 text-muted-foreground">{t('dashboard.imports.cancel_guidance')}</p>
              </CardContent>
            </Card>
          ) : (
            <JobPanel
              job={activeJob} busy={busy} t={t}
              onStart={() => start(false)} onRetry={() => start(true)} onNew={newUpload}
              onReport={() => productImportApi.download(storeId, 'report', activeJob.id)}
            />
          )}
        </div>

        <Card className="h-fit border-border/70 shadow-[var(--shadow-soft)]">
          <CardHeader className="flex-row items-center justify-between gap-3">
            <CardTitle>{t('dashboard.imports.history')}</CardTitle>
            <Button variant="ghost" size="icon" onClick={loadHistory} aria-label={t('dashboard.imports.refresh')}>
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
            </Button>
          </CardHeader>
          <CardContent>
            {!jobs.length ? <p className="text-sm text-muted-foreground">{t('dashboard.imports.no_history')}</p> : (
              <ul className="space-y-3" aria-label={t('dashboard.imports.history')}>
                {jobs.map((job) => (
                  <li key={job.id}>
                    <button
                      type="button" onClick={() => chooseJob(job)}
                      className="w-full rounded-xl border border-border p-3 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span className="block truncate text-sm font-medium">{job.sourceFilename}</span>
                      <span className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                        <StatusBadge status={job.status} t={t} />
                        <span>{t('dashboard.imports.imported_count', { imported: job.importedRows, total: job.totalRows })}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatusBadge({ status, t }: { status: ImportJob['status']; t: (key: string, options?: any) => string }) {
  const variant = status === 'completed' ? 'default'
    : status === 'failed' || status === 'completed_with_errors' ? 'destructive' : 'secondary';
  return <Badge variant={variant}>{t(`dashboard.imports.status_${status}`)}</Badge>;
}

function JobPanel({ job, busy, t, onStart, onRetry, onNew, onReport }: {
  job: ImportJob; busy: boolean; t: (key: string, options?: any) => string;
  onStart: () => void; onRetry: () => void; onNew: () => void; onReport: () => void;
}) {
  const importable = job.validRows > 0;
  return (
    <Card className="border-border/70 shadow-[var(--shadow-soft)]">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="break-words">{job.sourceFilename}</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">{t('dashboard.imports.template_version', { version: job.templateVersion })}</p>
          </div>
          <StatusBadge status={job.status} t={t} />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label={t('dashboard.imports.summary')}>
          <Summary label={t('dashboard.imports.total')} value={job.totalRows} />
          <Summary label={t('dashboard.imports.valid')} value={job.validRows} tone="success" />
          <Summary label={t('dashboard.imports.warnings')} value={job.warningRows} tone="warning" />
          <Summary label={t('dashboard.imports.errors')} value={job.errorRows + job.failedRows} tone="error" />
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {['queued', 'processing'].includes(job.status) && (
          <div role="status" aria-live="polite" className="rounded-xl bg-muted p-4 text-sm">
            {t('dashboard.imports.progress_exact', { processed: job.processedRows, total: job.validRows })}
          </div>
        )}
        {job.status === 'failed' && (
          <Alert variant="destructive"><XCircle className="h-4 w-4" aria-hidden="true" />
            <AlertTitle>{t('dashboard.imports.interrupted')}</AlertTitle>
            <AlertDescription>{job.failureMessage || t('dashboard.imports.failed_message')}</AlertDescription>
          </Alert>
        )}
        {finished.has(job.status) && (
          <Alert><CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            <AlertTitle>{t('dashboard.imports.result_title')}</AlertTitle>
            <AlertDescription>{t('dashboard.imports.result', { imported: job.importedRows, rejected: job.errorRows + job.failedRows })}</AlertDescription>
          </Alert>
        )}
        {job.status === 'preview_ready' && (
          <p className="text-sm leading-6 text-muted-foreground">
            {job.errorRows
              ? t('dashboard.imports.partial_explanation', { valid: job.validRows, invalid: job.errorRows })
              : t('dashboard.imports.ready_explanation')}
          </p>
        )}

        {job.rows?.length ? (
          <div className="overflow-hidden rounded-xl border border-border">
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/70 text-xs text-muted-foreground">
                  <tr><th className="p-3">{t('dashboard.imports.row')}</th><th className="p-3">{t('dashboard.imports.product')}</th><th className="p-3">SKU</th><th className="p-3">{t('dashboard.imports.validation')}</th></tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {job.rows.map((row) => <Row key={row.number} row={row} mobile={false} t={t} />)}
                </tbody>
              </table>
            </div>
            <div className="divide-y divide-border md:hidden">
              {job.rows.map((row) => <Row key={row.number} row={row} mobile t={t} />)}
            </div>
          </div>
        ) : null}
        {job.previewTruncated && <p className="text-xs text-muted-foreground">{t('dashboard.imports.preview_truncated')}</p>}

        <div className="flex flex-wrap gap-2">
          {job.status === 'preview_ready' && (
            <Button onClick={onStart} disabled={busy || !importable}>{t('dashboard.imports.start')}</Button>
          )}
          {job.status === 'failed' && <Button onClick={onRetry} disabled={busy}>{t('dashboard.imports.resume')}</Button>}
          {(job.errorRows > 0 || job.failedRows > 0) && (
            <Button variant="outline" onClick={onReport}><Download className="mr-2 h-4 w-4" aria-hidden="true" />{t('dashboard.imports.report')}</Button>
          )}
          <Button variant="ghost" onClick={onNew}>{t('dashboard.imports.new_upload')}</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Summary({ label, value, tone }: { label: string; value: number; tone?: 'success' | 'warning' | 'error' }) {
  const color = tone === 'success' ? 'text-emerald-700 dark:text-emerald-300'
    : tone === 'warning' ? 'text-amber-700 dark:text-amber-300'
      : tone === 'error' ? 'text-destructive' : 'text-foreground';
  return <div className="rounded-xl bg-muted/70 p-3"><span className="block text-xs text-muted-foreground">{label}</span><strong className={`text-xl ${color}`}>{value}</strong></div>;
}

function Row({ row, mobile, t }: { row: NonNullable<ImportJob['rows']>[number]; mobile: boolean; t: (key: string) => string }) {
  const problems = row.issues.filter((entry) => entry.level === 'error');
  const warnings = row.issues.filter((entry) => entry.level === 'warning');
  const validation = (
    <div className="space-y-1">
      {problems.map((entry) => <p key={`${entry.code}-${entry.field}`} className="flex gap-1.5 text-xs text-destructive"><XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />{t(`dashboard.imports.issue_${entry.code}`)}</p>)}
      {warnings.map((entry) => <p key={`${entry.code}-${entry.field}`} className="flex gap-1.5 text-xs text-amber-700 dark:text-amber-300"><AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />{t(`dashboard.imports.issue_${entry.code}`)}</p>)}
      {!row.issues.length && <p className="flex gap-1.5 text-xs text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />{t('dashboard.imports.row_valid')}</p>}
    </div>
  );
  if (mobile) return <article className="space-y-3 p-4"><p className="text-xs text-muted-foreground">{t('dashboard.imports.row')} {row.number}</p><p className="font-medium">{row.values.name || t('dashboard.imports.unnamed')}</p><p className="text-xs text-muted-foreground">SKU: {row.values.sku}</p>{validation}</article>;
  return <tr><td className="p-3 align-top text-muted-foreground">{row.number}</td><td className="p-3 align-top font-medium">{row.values.name || t('dashboard.imports.unnamed')}</td><td className="p-3 align-top">{row.values.sku}</td><td className="p-3 align-top">{validation}</td></tr>;
}
