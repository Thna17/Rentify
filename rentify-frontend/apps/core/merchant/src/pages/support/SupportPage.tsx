import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from '@rentify/utils';
import { RENTIFY_API_BASE } from '@rentify/shared/config/urls';
import { Button } from '@rentify/shared/ui/button';

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
export default function SupportPage() {
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
  return <main className="mx-auto max-w-4xl space-y-5 p-4 sm:p-6">
    <div><h1 className="text-2xl font-bold">{text.title}</h1><p className="mt-1 text-sm text-muted-foreground">{text.description}</p></div>
    {selected && <button type="button" className="text-sm underline" onClick={() => { setSelected(null); setBody(''); key.current = null; load(); }}>{text.back}</button>}
    {loading && <p role="status">{text.loading}</p>}
    {error && <div role="alert" className="rounded border p-3 text-sm">{error} <button type="button" className="underline" onClick={() => selected ? show(selected.id) : load()}>{text.retry}</button></div>}
    {!selected && !loading && !error && cases.length === 0 && <p>{text.empty}</p>}
    {!selected && <div className="space-y-2">{cases.map((item) => <button type="button" key={item.id} onClick={() => show(item.id)}
      className="block w-full rounded border p-4 text-left hover:bg-muted focus-visible:outline focus-visible:outline-2">
      <span className="block font-semibold">{item.caseNumber} · {item.summary}</span><span className="text-sm text-muted-foreground">{status(item.status)}</span>
    </button>)}{cursor && <Button variant="outline" disabled={loading} onClick={() => load(cursor)}>{text.more}</Button>}</div>}
    {selected && <section className="space-y-4 rounded border p-4">
      <h2 className="font-semibold">{selected.caseNumber} · {selected.summary}</h2><p className="text-sm">{status(selected.status)}</p>
      <div className="space-y-3">{selected.notes?.map((note) => <div key={note.id} className="rounded bg-muted p-3 text-sm whitespace-pre-wrap">{note.body}</div>)}</div>
      {['resolved', 'closed'].includes(selected.status) ? <p className="text-sm">{text.closed}</p> :
        <form onSubmit={send} className="space-y-2"><label htmlFor="support-response" className="block text-sm font-medium">{text.reply}</label>
          <textarea id="support-response" className="w-full rounded border bg-background p-3" maxLength={10000} required value={body}
            onChange={(event) => { setBody(event.target.value); key.current = null; }} rows={4} />
          <Button type="submit" disabled={sending || !body.trim()}>{sending ? text.sending : text.send}</Button>
          {sent && <p role="status" className="text-sm">{text.sent}</p>}
        </form>}
    </section>}
  </main>;
}
