import { useMemo, useState } from 'react';
import { ChevronDown, Mail, Search, Send } from 'lucide-react';
import { useTranslation } from '@rentify/utils';
import { Input } from '@rentify/shared/ui/input';
import { PageShell, PageTitle } from '../../components/page/PagePrimitives';
import SupportCases from './SupportCases';

// Questions merchants ask most; answers follow the decision register (returns, listing, payments).
const FAQ_IDS = ['cod', 'khqr', 'returns', 'marketplace', 'pos', 'staff'] as const;

/** Help (redesign M25): contact Rentify, follow support cases, read common answers. */
export function SupportPage() {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<string | null>(null);

  const faqs = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = FAQ_IDS.map((id) => ({ id, question: t(`merchant.help.faq.${id}.q`), answer: t(`merchant.help.faq.${id}.a`) }));
    return q ? all.filter((f) => `${f.question} ${f.answer}`.toLowerCase().includes(q)) : all;
  }, [query, t]);

  return (
    <PageShell width="medium">
      <PageTitle title={t('merchant.help.title')} description={t('merchant.help.subtitle')} />

      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('merchant.help.search')}
          aria-label={t('merchant.help.search')}
          className="h-11 rounded-xl pl-10"
        />
      </div>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">{t('merchant.help.contact')}</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <a
            href="https://t.me/rentify_support"
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground shadow-[var(--shadow-soft)] hover:bg-muted/60"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
            Telegram
          </a>
          <a
            href="mailto:support@rentify.com"
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground shadow-[var(--shadow-soft)] hover:bg-muted/60"
          >
            <Mail className="h-4 w-4" aria-hidden="true" />
            {t('merchant.help.email')}
          </a>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">{t('merchant.help.cases')}</h2>
        <SupportCases />
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">{t('merchant.help.questions')}</h2>
        {faqs.length === 0 ? (
          <p className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            {t('merchant.help.noMatch', { query })}
          </p>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]">
            {faqs.map((faq) => {
              const expanded = open === faq.id;
              return (
                <li key={faq.id}>
                  <button
                    type="button"
                    aria-expanded={expanded}
                    aria-controls={`faq-${faq.id}`}
                    onClick={() => setOpen(expanded ? null : faq.id)}
                    className="flex min-h-[52px] w-full items-center justify-between gap-3 p-4 text-left hover:bg-muted/40"
                  >
                    <span className="text-sm font-semibold text-foreground">{faq.question}</span>
                    <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`} aria-hidden="true" />
                  </button>
                  {expanded && (
                    <p id={`faq-${faq.id}`} className="px-4 pb-4 text-sm leading-relaxed text-muted-foreground">{faq.answer}</p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </PageShell>
  );
}

export default SupportPage;
