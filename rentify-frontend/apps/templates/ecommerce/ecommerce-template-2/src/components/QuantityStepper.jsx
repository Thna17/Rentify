import { useEffect, useId, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { clampQuantity } from '@rentify/storefront/commerce';
import { useI18n } from '../i18n';

/**
 * Quantity input bounded to [1, max]. Typed values are clamped on blur and
 * attempts to go past the maximum surface a short explanation.
 */
export function QuantityStepper({ value, max, onChange, disabled = false, label, size = 'md', id }) {
  const { t } = useI18n();
  const generatedId = useId();
  const inputId = id || `${generatedId}-quantity`;
  const hintId = `${inputId}-hint`;
  const [draft, setDraft] = useState(String(value));
  const [limitHit, setLimitHit] = useState(false);

  useEffect(() => setDraft(String(value)), [value]);

  const commit = (next) => {
    const requested = Math.floor(Number(next));
    const clamped = clampQuantity(next, max);
    setLimitHit(Number.isFinite(requested) && requested > max && max > 0);
    setDraft(String(clamped || value));
    if (clamped && clamped !== value) onChange(clamped);
  };

  const height = size === 'sm' ? 'h-9' : 'h-11';
  const inactive = disabled || max < 1;

  return (
    <div>
      {label && (
        <label htmlFor={inputId} className="field-label">
          {label}
        </label>
      )}
      <div className={`inline-flex ${height} items-stretch overflow-hidden rounded-lg border border-input bg-card`}>
        <button
          type="button"
          className="flex w-10 items-center justify-center text-foreground hover:bg-muted disabled:opacity-40"
          onClick={() => commit(value - 1)}
          disabled={inactive || value <= 1}
          aria-label={t('product.decrease')}
          aria-controls={inputId}
        >
          <Minus className="h-4 w-4" aria-hidden="true" />
        </button>
        <input
          id={inputId}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={draft}
          disabled={inactive}
          aria-label={label ? undefined : t('product.quantity')}
          aria-describedby={limitHit ? hintId : undefined}
          onChange={(event) => setDraft(event.target.value.replace(/\D/g, '').slice(0, 3))}
          onBlur={() => commit(draft)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              commit(draft);
            }
          }}
          className="w-12 border-x border-input bg-transparent text-center text-base font-medium tabular-nums focus:outline-none sm:text-sm"
        />
        <button
          type="button"
          className="flex w-10 items-center justify-center text-foreground hover:bg-muted disabled:opacity-40"
          onClick={() => (value >= max ? setLimitHit(true) : commit(value + 1))}
          disabled={inactive}
          aria-label={t('product.increase')}
          aria-controls={inputId}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      {limitHit && (
        <p id={hintId} role="status" className="field-hint text-warning">
          {t('product.maxReached', { count: max })}
        </p>
      )}
    </div>
  );
}
