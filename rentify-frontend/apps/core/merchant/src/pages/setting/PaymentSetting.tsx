import { useEffect, useState } from 'react';
import { Check, Copy, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@rentify/utils';
import { Button } from '@rentify/shared/ui/button';
import { Input } from '@rentify/shared/ui/input';
import { Label } from '@rentify/shared/ui/label';
import { Skeleton } from '@rentify/shared/ui/skeleton';
import { useGetMerchantConfigQuery, useUpdateMerchantConfigMutation } from '@rentify/apis';
import { useThemeService } from '@rentify/shared/hooks/useThemeService';
import { ECOMMERCE_API_ROOT } from '@rentify/shared/config/urls';
import { SettingsLayout } from '../../layouts/setting/SettingsLayout';
import { StatusPill } from '../../components/data-table/StatusPill';
import { Panel } from '../../components/page/PagePrimitives';

/**
 * Settings › Payments (redesign M21b, DEC-029): cash on delivery is always on; KHQR goes through the
 * merchant's own CutLuy account. Commerce checks the API key with CutLuy when it is saved, so
 * "Connected" means a key is saved and was not rejected.
 */
export function PaymentSetting() {
  const { t } = useTranslation();
  const { websiteData } = useThemeService();
  const websiteId: string | undefined = websiteData?.websiteId || undefined;
  const { data, isLoading, error, refetch } = useGetMerchantConfigQuery(websiteId, { skip: !websiteId });
  const [save, { isLoading: saving }] = useUpdateMerchantConfigMutation();

  const notConfigured = (error as any)?.status === 404;
  const cutluy = Array.isArray(data) ? data.find((c: any) => c.gateway === 'cutluy') : null;
  const enabled = Boolean(cutluy?.enabled);
  const hasKey = Boolean(cutluy?.hasApiKey);
  const connected = enabled && hasKey;

  const [businessName, setBusinessName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setBusinessName(cutluy?.config?.businessName || '');
  }, [cutluy?.config?.businessName]);

  const webhookUrl = `${ECOMMERCE_API_ROOT}/api/payment/payments/cutluy/webhook`;

  const submit = async (turnOn: boolean) => {
    if (!websiteId) return;
    if (turnOn && !hasKey && !apiKey.trim()) {
      toast.error(t('merchant.payments.keyRequired'));
      return;
    }
    try {
      await save({
        websiteId,
        paymentGateways: {
          cutluy: {
            enabled: turnOn,
            businessName: businessName.trim(),
            ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
            ...(webhookSecret.trim() ? { webhookSecret: webhookSecret.trim() } : {}),
          },
        },
      }).unwrap();
      setApiKey('');
      setWebhookSecret('');
      await refetch();
      toast.success(t(turnOn ? 'merchant.payments.saved' : 'merchant.payments.turnedOff'));
    } catch (err: any) {
      toast.error(t(err?.status === 400 ? 'merchant.payments.keyRejected' : 'merchant.payments.saveError'));
    }
  };

  const copyWebhook = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t('merchant.payments.copyError'));
    }
  };

  const loadFailed = Boolean(error) && !notConfigured;

  return (
    <SettingsLayout title={t('merchant.payments.title')} description={t('merchant.payments.subtitle')}>
      {isLoading || !websiteId ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
      ) : (
        <div className="space-y-4">
          <Panel className="space-y-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-foreground">{t('merchant.payments.cod')}</h2>
              <StatusPill tone="success">{t('merchant.payments.alwaysOn')}</StatusPill>
            </div>
            <p className="text-sm text-muted-foreground">{t('merchant.payments.codBody')}</p>
          </Panel>

          <Panel className="space-y-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-foreground">{t('merchant.payments.khqr')}</h2>
              {loadFailed ? (
                <StatusPill tone="neutral">{t('merchant.payments.status.unknown')}</StatusPill>
              ) : connected ? (
                <StatusPill tone="success">{t('merchant.payments.status.connected')}</StatusPill>
              ) : enabled ? (
                <StatusPill tone="warning">{t('merchant.payments.status.keyMissing')}</StatusPill>
              ) : (
                <StatusPill tone="neutral">{t('merchant.payments.status.off')}</StatusPill>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{t('merchant.payments.khqrBody')}</p>
            {loadFailed && (
              <Button variant="outline" onClick={() => refetch()} className="mt-2 min-h-[44px] rounded-xl">
                {t('merchant.common.retry')}
              </Button>
            )}
          </Panel>

          <Panel className="space-y-4">
            <h2 className="text-base font-semibold text-foreground">{t('merchant.payments.connection')}</h2>
            <div className="space-y-1.5">
              <Label htmlFor="cutluy-business-name">{t('merchant.payments.businessName')}</Label>
              <Input id="cutluy-business-name" value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="h-11 rounded-xl" />
              <p className="text-sm text-muted-foreground">{t('merchant.payments.businessNameHint')}</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cutluy-api-key">{t('merchant.payments.apiKey')}</Label>
              <div className="relative">
                <Input
                  id="cutluy-api-key"
                  type={showKey ? 'text' : 'password'}
                  autoComplete="off"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={hasKey ? t('merchant.payments.keySaved') : ''}
                  className="h-11 rounded-xl pr-12 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowKey((v) => !v)}
                  aria-label={t(showKey ? 'merchant.payments.hide' : 'merchant.payments.show')}
                  aria-pressed={showKey}
                  className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center text-muted-foreground hover:text-foreground"
                >
                  {showKey ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                </button>
              </div>
              <p className="text-sm text-muted-foreground">{t('merchant.payments.apiKeyHint')}</p>
            </div>

            <details className="rounded-xl border border-border p-4">
              <summary className="min-h-[24px] cursor-pointer text-sm font-semibold text-foreground">{t('merchant.payments.advanced')}</summary>
              <div className="mt-4 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="cutluy-webhook-secret">{t('merchant.payments.webhookSecret')}</Label>
                  <div className="relative">
                    <Input
                      id="cutluy-webhook-secret"
                      type={showSecret ? 'text' : 'password'}
                      autoComplete="off"
                      value={webhookSecret}
                      onChange={(e) => setWebhookSecret(e.target.value)}
                      className="h-11 rounded-xl pr-12 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret((v) => !v)}
                      aria-label={t(showSecret ? 'merchant.payments.hide' : 'merchant.payments.show')}
                      aria-pressed={showSecret}
                      className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center text-muted-foreground hover:text-foreground"
                    >
                      {showSecret ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cutluy-webhook-url">{t('merchant.payments.webhookUrl')}</Label>
                  <div className="flex gap-2">
                    <Input id="cutluy-webhook-url" readOnly value={webhookUrl} className="h-11 rounded-xl font-mono text-xs" />
                    <Button type="button" variant="outline" onClick={copyWebhook} className="min-h-[44px] shrink-0 rounded-xl">
                      {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
                      {t(copied ? 'merchant.payments.copied' : 'merchant.payments.copy')}
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">{t('merchant.payments.webhookHint')}</p>
                </div>
              </div>
            </details>
            <p className="text-sm text-muted-foreground">{t('merchant.payments.scope')}</p>
          </Panel>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            {enabled && (
              <Button type="button" variant="ghost" disabled={saving} onClick={() => submit(false)} className="min-h-[48px] rounded-xl text-destructive">
                {t('merchant.payments.turnOff')}
              </Button>
            )}
            <Button type="button" disabled={saving} onClick={() => submit(true)} className="min-h-[48px] rounded-xl">
              {saving ? t('merchant.common.saving') : t(enabled ? 'merchant.common.save' : 'merchant.payments.turnOn')}
            </Button>
          </div>
        </div>
      )}
    </SettingsLayout>
  );
}

export default PaymentSetting;
