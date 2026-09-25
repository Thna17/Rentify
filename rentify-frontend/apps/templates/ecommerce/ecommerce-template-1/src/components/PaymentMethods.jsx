import { useI18n } from '../i18n';

/**
 * Online payment methods Rentify is adding; shown as "coming soon" so shoppers
 * know what to expect. Cash on delivery is the method stores accept today.
 */
export const UPCOMING_PAYMENT_METHODS = ['Bakong KHQR', 'ABA PayWay', 'Visa / Mastercard'];

const TONES = {
  // On the template's light surfaces.
  light: {
    title: 'text-foreground',
    chip: 'border-border bg-card text-foreground',
    dot: 'bg-success',
    soonChip: 'border-dashed border-border bg-card/60 text-muted-foreground',
    pill: 'bg-muted text-muted-foreground',
  },
  // On a primary-coloured band, such as Template 1's footer.
  primary: {
    title: 'text-primary-foreground',
    chip: 'border-primary-foreground/40 text-primary-foreground',
    dot: 'bg-primary-foreground',
    soonChip: 'border-dashed border-primary-foreground/30 text-primary-foreground/80',
    pill: 'bg-primary-foreground/15 text-primary-foreground',
  },
};

export function PaymentMethods({ tone = 'light', className = '' }) {
  const { t } = useI18n();
  const style = TONES[tone] || TONES.light;
  return (
    <div className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${className}`}>
      <p className={`text-xs font-semibold uppercase tracking-wider ${style.title}`}>{t('payments.title')}</p>
      <ul className="flex flex-wrap gap-2 text-xs font-medium">
        <li className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 ${style.chip}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} aria-hidden="true" />
          {t('payments.cod')}
          <span className="sr-only">: {t('payments.available')}</span>
        </li>
        {UPCOMING_PAYMENT_METHODS.map((name) => (
          <li key={name} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 ${style.soonChip}`}>
            {name}
            <span className={`rounded px-1.5 py-0.5 text-[0.625rem] font-bold uppercase tracking-wide ${style.pill}`}>{t('payments.soon')}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
