import { useRef, useState } from 'react';
import { Banknote, Loader2, QrCode } from 'lucide-react';
import { CAMBODIA_PROVINCES, validateCheckout } from '@rentify/storefront/checkout';
import { useI18n } from '../i18n';
import { UPCOMING_PAYMENT_METHODS } from './PaymentMethods';

const FIELD_ORDER = ['name', 'phone', 'email', 'province', 'district', 'commune', 'street', 'note', 'paymentMethod'];

function Field({ name, label, hint, error, required, children }) {
  const { t } = useI18n();
  const hintId = hint ? `${name}-hint` : undefined;
  const errorId = error ? `${name}-error` : undefined;
  return (
    <div>
      <label htmlFor={`checkout-${name}`} className="field-label">
        {label}
        {required && (
          <span className="ml-0.5 text-error" aria-hidden="true">
            *
          </span>
        )}
        {required && <span className="sr-only"> ({t('checkout.required')})</span>}
      </label>
      {children({ id: `checkout-${name}`, 'aria-invalid': Boolean(error), 'aria-describedby': [errorId, hintId].filter(Boolean).join(' ') || undefined })}
      {error ? (
        <p id={errorId} className="field-error">
          {t(`validation.${error}`)}
        </p>
      ) : hint ? (
        <p id={hintId} className="field-hint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Customer contact, delivery and payment details. Validation follows the
 * storefront checkout contract; `onSubmit` receives valid data only.
 */
export function CheckoutForm({ details, paymentMethod, paymentMethods = ['COD', 'KHQR'], onDetailsChange, onPaymentMethodChange, onSubmit, submitting, submitError }) {
  const { t } = useI18n();
  const formRef = useRef(null);
  const [errors, setErrors] = useState({});
  const [attempted, setAttempted] = useState(false);

  const update = (field) => (event) => {
    const next = { ...details, [field]: event.target.value };
    onDetailsChange(next);
    if (attempted) setErrors(validateCheckout(next, paymentMethod));
  };

  const submit = (event) => {
    event.preventDefault();
    if (submitting) return;
    const found = validateCheckout(details, paymentMethod);
    setErrors(found);
    setAttempted(true);
    const first = FIELD_ORDER.find((field) => found[field]);
    if (first) {
      formRef.current?.querySelector(`[name="${first}"]`)?.focus();
      return;
    }
    onSubmit();
  };

  const methods = [
    { value: 'COD', icon: Banknote, title: t('checkout.cod'), hint: t('checkout.codHint') },
    { value: 'KHQR', icon: QrCode, title: t('checkout.khqr'), hint: t('checkout.khqrHint') },
  ].filter((method) => paymentMethods.includes(method.value));
  // Online methods this store does not take yet are listed, disabled, as coming soon.
  const upcoming = UPCOMING_PAYMENT_METHODS.filter((name) => !(name === 'Bakong KHQR' && paymentMethods.includes('KHQR')));
  const hasErrors = Object.keys(errors).length > 0;

  return (
    <form ref={formRef} onSubmit={submit} noValidate className="space-y-8" aria-describedby={hasErrors ? 'checkout-errors' : undefined}>
      {hasErrors && (
        <p id="checkout-errors" role="alert" className="rounded-lg bg-error/10 px-4 py-3 text-sm font-medium text-error">
          {t('checkout.fixErrors')}
        </p>
      )}

      <section aria-labelledby="checkout-contact" className="space-y-4">
        <h2 id="checkout-contact" className="text-lg font-semibold text-foreground">
          {t('checkout.contact')}
        </h2>
        <Field name="name" label={t('checkout.name')} error={errors.name} required>
          {(props) => <input {...props} name="name" autoComplete="name" className="field-input" value={details.name} onChange={update('name')} maxLength={120} />}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="phone" label={t('checkout.phone')} hint={t('checkout.phoneHint')} error={errors.phone} required>
            {(props) => (
              <input
                {...props}
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                className="field-input"
                value={details.phone}
                onChange={update('phone')}
                maxLength={20}
              />
            )}
          </Field>
          <Field name="email" label={t('checkout.email')} error={errors.email}>
            {(props) => (
              <input
                {...props}
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                className="field-input"
                value={details.email}
                onChange={update('email')}
                maxLength={160}
              />
            )}
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="province" label={t('checkout.province')} error={errors.province} required>
            {(props) => (
              <select {...props} name="province" autoComplete="address-level1" className="field-input" value={details.province} onChange={update('province')}>
                <option value="">{t('checkout.selectProvince')}</option>
                {CAMBODIA_PROVINCES.map((province) => (
                  <option key={province} value={province}>
                    {province}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field name="district" label={t('checkout.district')} error={errors.district}>
            {(props) => <input {...props} name="district" autoComplete="address-level2" className="field-input" value={details.district} onChange={update('district')} maxLength={120} />}
          </Field>
        </div>
        <Field name="commune" label={t('checkout.commune')} error={errors.commune}>
          {(props) => <input {...props} name="commune" autoComplete="address-level3" className="field-input" value={details.commune} onChange={update('commune')} maxLength={120} />}
        </Field>
        <Field name="street" label={t('checkout.street')} hint={t('checkout.streetHint')} error={errors.street} required>
          {(props) => <input {...props} name="street" autoComplete="street-address" className="field-input" value={details.street} onChange={update('street')} maxLength={255} />}
        </Field>
        <Field name="note" label={t('checkout.note')} error={errors.note}>
          {(props) => <textarea {...props} name="note" rows={3} className="field-input" value={details.note} onChange={update('note')} maxLength={255} />}
        </Field>
      </section>

      <fieldset className="space-y-3" aria-describedby={errors.paymentMethod ? 'paymentMethod-error' : undefined}>
        <legend className="mb-1 text-lg font-semibold text-foreground">{t('checkout.payment')}</legend>
        {methods.map(({ value, icon: Icon, title, hint }) => {
          const checked = paymentMethod === value;
          return (
            <label
              key={value}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring ${
                checked ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-foreground/30'
              }`}
            >
              <input
                type="radio"
                name="paymentMethod"
                value={value}
                checked={checked}
                onChange={() => onPaymentMethodChange(value)}
                className="mt-1 h-4 w-4 accent-[oklch(var(--primary))]"
              />
              <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <span>
                <span className="block text-sm font-semibold text-foreground">{title}</span>
                <span className="mt-0.5 block text-sm text-muted-foreground">{hint}</span>
              </span>
            </label>
          );
        })}
        {upcoming.length > 0 && (
          <ul className="space-y-2" aria-label={t('payments.soonHint')}>
            {upcoming.map((name) => (
              <li
                key={name}
                aria-disabled="true"
                className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground"
              >
                <span>{name}</span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">{t('payments.soon')}</span>
              </li>
            ))}
          </ul>
        )}
        {errors.paymentMethod && (
          <p id="paymentMethod-error" className="field-error">
            {t(`validation.${errors.paymentMethod}`)}
          </p>
        )}
      </fieldset>

      {submitError && (
        <div role="alert" className="rounded-lg border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">
          {submitError}
        </div>
      )}

      <button type="submit" className="btn-primary min-h-12 w-full text-base" disabled={submitting}>
        {submitting && <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />}
        {submitting ? t('checkout.placing') : t('checkout.place')}
      </button>
    </form>
  );
}
