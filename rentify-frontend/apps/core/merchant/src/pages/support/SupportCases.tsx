import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ChevronRight, LifeBuoy } from 'lucide-react';
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
    unavailable: 'The response could not be sent. Retry safely using the same request.' },
  km: { title: 'ករណីជំនួយ', description: 'តាមដានករណីរបស់ហាង និងឆ្លើយតបទៅក្រុមជំនួយ។', loading: 'កំពុងផ្ទុក…',
    empty: 'មិនទាន់មានករណីជំនួយទេ។', failed: 'មិនអាចផ្ទុកករណីជំនួយបានទេ។', retry: 'ព្យាយាមម្ដងទៀត', more: 'ផ្ទុកបន្ថែម', back: 'ត្រឡប់ទៅបញ្ជីករណី',
    reply: 'ការឆ្លើយតបរបស់អ្នក', send: 'ផ្ញើការឆ្លើយតប', sending: 'កំពុងផ្ញើ…', sent: 'បានផ្ញើការឆ្លើយតប។',
    conflict: 'ករណីនេះបានផ្លាស់ប្ដូរ។ សូមពិនិត្យព័ត៌មានថ្មីមុនផ្ញើម្ដងទៀត។', closed: 'ករណីនេះបានបិទសម្រាប់ការឆ្លើយតបថ្មី។',
    unavailable: 'មិនអាចផ្ញើការឆ្លើយតបបានទេ។ អ្នកអាចព្យាយាមម្ដងទៀតដោយសុវត្ថិភាព។' },
};
const base = `${RENTIFY_API_BASE}/api/support/cases/mine`;
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

  return (
    <section className="rounded-2xl bg-muted/40 p-5 md:p-6" aria-labelledby="support-cases-title">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-background text-foreground">
          <LifeBuoy className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h2 id="support-cases-title" className="text-base font-semibold text-foreground">{text.title}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{text.description}</p>
        </div>
      </div>

      <div className="mt-4 space-y-2" aria-live="polite">
        {selected && (
          <button
            type="button"
            className="inline-flex min-h-[36px] items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
            onClick={() => { setSelected(null); setBody(''); key.current = null; load(); }}
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />{text.back}
          </button>
        )}
        {loading && <p role="status" className="text-xs text-muted-foreground">{text.loading}</p>}
        {error && (
          <div role="alert" className="rounded-xl bg-destructive/10 px-3 py-2.5 text-xs text-destructive">
            {error}{' '}
            <button type="button" className="font-semibold underline" onClick={() => selected ? show(selected.id) : load()}>{text.retry}</button>
          </div>
        )}
        {!selected && !loading && !error && cases.length === 0 && (
          <p className="rounded-xl bg-background px-4 py-5 text-center text-xs text-muted-foreground">{text.empty}</p>
        )}

        {!selected && cases.map((item) => (
          <button
            type="button"
            key={item.id}
            onClick={() => show(item.id)}
            className="flex w-full min-h-[56px] items-center gap-3 rounded-xl bg-background px-4 py-3 text-left transition-colors hover:bg-background/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-foreground">{item.caseNumber} · {item.summary}</span>
              <span className="text-xs text-muted-foreground">{status(item.status)}</span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          </button>
        ))}
        {!selected && cursor && (
          <Button variant="ghost" size="sm" disabled={loading} onClick={() => load(cursor)}>{text.more}</Button>
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
