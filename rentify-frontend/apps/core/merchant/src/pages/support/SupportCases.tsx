import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ChevronRight, LifeBuoy } from 'lucide-react';
import { DataTable, StatusPill } from '../../components/data-table';
import { useTranslation } from '@rentify/utils';
import { RENTIFY_API_BASE } from '@rentify/shared/config/urls';
import { Button } from '@rentify/shared/ui/button';

// Support cases linked to this store (Core /api/support/cases/mine), shown inside the help centre
type Note = { id: string; body: string; createdAt: string };
type Case = { id: string; caseNumber: string; summary: string; status: string; version: number; notes?: Note[] };
const copy = {
  en: { title: 'Support cases', description: 'Follow cases linked to your store and reply to support.', loading: 'Loading…',
    empty: 'No support cases yet.', failed: 'Support cases could not be loaded.', retry: 'Try again', more: 'Load more', back: 'Back to cases',
    reply: 'Your response', send: 'Send response', sending: 'Sending…', sent: 'Response sent.',
    conflict: 'This case changed. Review the latest details before sending again.', closed: 'This case is closed to new responses.',
    unavailable: 'The response could not be sent. Retry safely using the same request.',
    caseColumn: 'Case', summaryColumn: 'Summary', statusColumn: 'Status', actionsColumn: 'Actions', open: 'Open' },
  km: { title: 'ករណីជំនួយ', description: 'តាមដានករណីរបស់ហាង និងឆ្លើយតបទៅក្រុមជំនួយ។', loading: 'កំពុងផ្ទុក…',
    empty: 'មិនទាន់មានករណីជំនួយទេ។', failed: 'មិនអាចផ្ទុកករណីជំនួយបានទេ។', retry: 'ព្យាយាមម្ដងទៀត', more: 'ផ្ទុកបន្ថែម', back: 'ត្រឡប់ទៅបញ្ជីករណី',
    reply: 'ការឆ្លើយតបរបស់អ្នក', send: 'ផ្ញើការឆ្លើយតប', sending: 'កំពុងផ្ញើ…', sent: 'បានផ្ញើការឆ្លើយតប។',
    conflict: 'ករណីនេះបានផ្លាស់ប្ដូរ។ សូមពិនិត្យព័ត៌មានថ្មីមុនផ្ញើម្ដងទៀត។', closed: 'ករណីនេះបានបិទសម្រាប់ការឆ្លើយតបថ្មី។',
    unavailable: 'មិនអាចផ្ញើការឆ្លើយតបបានទេ។ អ្នកអាចព្យាយាមម្ដងទៀតដោយសុវត្ថិភាព។',
    caseColumn: 'ករណី', summaryColumn: 'សេចក្តីសង្ខេប', statusColumn: 'ស្ថានភាព', actionsColumn: 'សកម្មភាព', open: 'បើក' },
};
const base = `${RENTIFY_API_BASE}/api/support/cases/mine`;
const statusTones: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  open: 'info', triaged: 'info', in_progress: 'info', reopened: 'info', waiting_on_merchant: 'warning',
  waiting_on_requester: 'neutral', escalated: 'danger', resolved: 'success', closed: 'neutral',
};
const statusLabels: Record<string, [string, string]> = {
  open: ['Open', 'បើក'], triaged: ['Triaged', 'បានពិនិត្យ'], in_progress: ['In progress', 'កំពុងដំណើរការ'],
  waiting_on_requester: ['Waiting for requester', 'រង់ចាំអ្នកស្នើសុំ'], waiting_on_merchant: ['Waiting for merchant', 'រង់ចាំអ្នកលក់'],
  escalated: ['Escalated', 'បានបញ្ជូនបន្ត'], resolved: ['Resolved', 'បានដោះស្រាយ'],
  closed: ['Closed', 'បានបិទ'], reopened: ['Reopened', 'បានបើកឡើងវិញ'],
};
function newRequestKey() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = new Uint8Array(16); crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
}
async function request(path: string, init: RequestInit = {}) {
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(`${base}${path}`, { ...init, credentials: 'include', signal: controller.signal });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw Object.assign(new Error('Request failed'), { status: response.status, code: data.error?.code });
    return data;
  } finally { clearTimeout(timer); }
}

export default function SupportCases() {
  const { language } = useTranslation() as { language?: string };
  const text = copy[language === 'kh' ? 'km' : 'en'];
  const status = (value: string) => statusLabels[value]?.[language === 'kh' ? 1 : 0] || value;
  const [cases, setCases] = useState<Case[]>([]); const [selected, setSelected] = useState<Case | null>(null);
  const [cursor, setCursor] = useState<string | null>(null); const [loading, setLoading] = useState(true);
  const [error, setError] = useState(''); const [body, setBody] = useState(''); const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false); const key = useRef<string | null>(null);
  const load = async (after?: string) => {
    setLoading(true); setError('');
    try { const result = await request(after ? `?after=${encodeURIComponent(after)}` : '');
      setCases((old) => after ? [...old, ...result.data] : result.data); setCursor(result.page?.nextCursor || null);
    } catch { setError(text.failed); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  const show = async (id: string) => {
    setLoading(true); setError('');
    try { const result = await request(`/${encodeURIComponent(id)}`); setSelected(result.data); }
    catch { setError(text.failed); } finally { setLoading(false); }
  };
  const send = async (event: React.FormEvent) => {
    event.preventDefault(); if (!selected || !body.trim()) return;
    setSending(true); setError(''); setSent(false);
    if (!key.current) key.current = newRequestKey();
    try {
      await request(`/${encodeURIComponent(selected.id)}/responses`, { method: 'POST', headers: {
        'Content-Type': 'application/json', 'Idempotency-Key': key.current },
      body: JSON.stringify({ expectedVersion: selected.version, body }) });
      key.current = null; setBody(''); setSent(true); await show(selected.id);
    } catch (error: any) {
      if (error?.code === 'VERSION_CONFLICT' || error?.status === 409) {
        key.current = null; await show(selected.id); setError(text.conflict);
      } else setError(text.unavailable);
    } finally { setSending(false); }
  };

  const columns = useMemo(() => [
    {
      id: 'case',
      accessorKey: 'caseNumber',
      header: text.caseColumn,
      meta: { sortable: true, mobileHideLabel: true },
      cell: ({ getValue }: any) => <span className="font-medium tabular-nums text-foreground">{getValue()}</span>,
    },
    {
      id: 'summary',
      accessorKey: 'summary',
      header: text.summaryColumn,
      meta: { mobile: 'primary' },
      cell: ({ getValue }: any) => <span className="block max-w-[28rem] truncate text-foreground">{getValue()}</span>,
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: text.statusColumn,
      meta: { sortable: true, mobile: 'badge' },
      cell: ({ getValue }: any) => <StatusPill tone={statusTones[getValue()] || 'neutral'}>{status(getValue())}</StatusPill>,
    },
    {
      id: 'actions',
      header: () => <span className="sr-only">{text.actionsColumn}</span>,
      meta: { label: text.actionsColumn, align: 'right' },
      enableSorting: false,
      cell: ({ row }: any) => (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-11 md:h-9"
          aria-label={`${text.open} ${row.original.caseNumber} · ${row.original.summary}`}
          onClick={() => show(row.original.id)}
        >
          {text.open}<ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      ),
    },
  ], [text, language]);

  return (
    // The Help page titles this section ("Your support cases"), so no second heading here
    <section aria-label={text.title}>
      <div className="space-y-2" aria-live="polite">
        {selected && (
          <button
            type="button"
            className="inline-flex min-h-[36px] items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
            onClick={() => { setSelected(null); setBody(''); key.current = null; load(); }}
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />{text.back}
          </button>
        )}
        {selected && loading && <p role="status" className="text-xs text-muted-foreground">{text.loading}</p>}
        {selected && error && (
          <div role="alert" className="rounded-xl bg-destructive/10 px-3 py-2.5 text-xs text-destructive">
            {error}{' '}
            <button type="button" className="font-semibold underline" onClick={() => show(selected.id)}>{text.retry}</button>
          </div>
        )}

        {!selected && (
          <DataTable
            ariaLabel={text.title}
            columns={columns}
            data={cases}
            isLoading={loading && !cases.length}
            isError={Boolean(error)}
            errorTitle={error}
            onRetry={() => load()}
            empty={{ icon: LifeBuoy, title: text.empty, body: '' }}
            onRowClick={(item: Case) => show(item.id)}
            pagination={false}
            footer={cursor ? (
              <Button variant="ghost" size="sm" className="h-11" disabled={loading} onClick={() => load(cursor)}>{text.more}</Button>
            ) : null}
          />
        )}

        {selected && (
          <div className="space-y-4 rounded-xl bg-background p-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">{selected.caseNumber} · {selected.summary}</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">{status(selected.status)}</p>
            </div>
            <div className="space-y-2">
              {selected.notes?.map((note) => (
                <div key={note.id} className="whitespace-pre-wrap rounded-xl bg-muted/60 p-3 text-sm text-foreground">{note.body}</div>
              ))}
            </div>
            {['resolved', 'closed'].includes(selected.status) ? (
              <p className="text-xs text-muted-foreground">{text.closed}</p>
            ) : (
              <form onSubmit={send} className="space-y-2">
                <label htmlFor="support-response" className="block text-xs font-medium text-foreground">{text.reply}</label>
                <textarea
                  id="support-response"
                  className="w-full rounded-xl bg-muted/60 p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  maxLength={10000}
                  required
                  value={body}
                  onChange={(event) => { setBody(event.target.value); key.current = null; }}
                  rows={4}
                />
                <div className="flex items-center justify-end gap-3">
                  {sent && <p role="status" className="text-xs text-muted-foreground">{text.sent}</p>}
                  <Button type="submit" disabled={sending || !body.trim()}>{sending ? text.sending : text.send}</Button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
