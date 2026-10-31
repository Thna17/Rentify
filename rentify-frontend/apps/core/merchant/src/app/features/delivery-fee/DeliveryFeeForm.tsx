import React, { useEffect, useState } from 'react';
import { useTranslation } from '@rentify/utils';
import { Button } from '@rentify/shared/ui/button';
import { Input } from '@rentify/shared/ui/input';
import { Label } from '@rentify/shared/ui/label';
import { getDeliveryPolicy, parseDeliveryFee, saveDeliveryPolicy, type DeliveryPolicy } from './deliveryFeeApi';

interface DeliveryFeeFormProps {
  storeId?: string | null;
  onSaved?: (policy: DeliveryPolicy) => void;
  /** Full-width button for the bottom sheet on phones. */
  block?: boolean;
}

/** The one place a Store's delivery fee is edited: used by the setup-guide sheet and Settings › Delivery. */
export function DeliveryFeeForm({ storeId, onSaved, block = false }: DeliveryFeeFormProps) {
  const { t } = useTranslation();
  const [policy, setPolicy] = useState<DeliveryPolicy | null>(null);
  const [fee, setFee] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);

  useEffect(() => {
    if (!storeId) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    getDeliveryPolicy(storeId)
      .then((current) => {
        if (!active) return;
        setPolicy(current);
        setFee(current?.flatFee ?? '');
      })
      .catch(() => active && setMessage({ tone: 'error', text: t('merchant.setup.deliveryLoadError') }))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [storeId, t]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!storeId) {
      setMessage({ tone: 'error', text: t('merchant.setup.deliveryNoStore') });
      return;
    }
    const amount = parseDeliveryFee(fee);
    if (amount === null) {
      setMessage({ tone: 'error', text: t('merchant.setup.deliveryInvalid') });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const saved = await saveDeliveryPolicy(storeId, amount, policy);
      if (saved) {
        setPolicy(saved);
        setFee(saved.flatFee);
        setMessage({ tone: 'success', text: t('merchant.setup.deliverySaved') });
        onSaved?.(saved);
      }
    } catch (error) {
      setMessage({ tone: 'error', text: error instanceof Error ? error.message : t('merchant.setup.deliveryLoadError') });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="delivery-fee">{t('merchant.setup.deliveryFeeLabel')}</Label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true">$</span>
          <Input
            id="delivery-fee"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="1.50"
            className={`h-11 pl-7 ${block ? 'w-full' : 'w-40'}`}
            value={fee}
            disabled={loading}
            aria-invalid={message?.tone === 'error' || undefined}
            aria-describedby={message ? 'delivery-fee-message' : undefined}
            onChange={(event) => setFee(event.target.value)}
          />
        </div>
      </div>
      {message && (
        <p
          id="delivery-fee-message"
          role={message.tone === 'error' ? 'alert' : 'status'}
          className={`text-sm ${message.tone === 'error' ? 'text-destructive' : 'text-[var(--rentify-color-success-text)]'}`}
        >
          {message.text}
        </p>
      )}
      <Button type="submit" className={`h-11 ${block ? 'w-full' : ''}`} disabled={busy || loading || !storeId}>
        {busy ? t('merchant.setup.deliverySaving') : t('merchant.setup.deliverySave')}
      </Button>
    </form>
  );
}

export default DeliveryFeeForm;
