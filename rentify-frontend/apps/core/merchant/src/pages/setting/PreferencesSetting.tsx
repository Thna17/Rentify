// preferences-setting.tsx
import React, { useEffect, useState } from 'react';
import { Label } from '@rentify/shared/ui/label';
import { Switch } from '@rentify/shared/ui/switch';
import { Button } from '@rentify/shared/ui/button';
import { Loader2 } from 'lucide-react';
import { RENTIFY_API_BASE } from '@rentify/shared/config/urls';
import { toast } from 'sonner';
import { SettingsLayout } from '../../layouts/setting/SettingsLayout';
import { useChannels } from '../../context/ChannelContext';
import { useTranslation } from '@rentify/utils';

// Notification preferences are stored by Core (/api/notifications/preferences)
type NotificationPrefs = { locale: 'en' | 'km'; optionalEnabled: boolean; emailEnabled: boolean; telegramEnabled: boolean };

const requestPrefs = async (method: 'GET' | 'PUT', body?: NotificationPrefs) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(`${RENTIFY_API_BASE}/api/notifications/preferences`, {
      method,
      credentials: 'include',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    if (!response.ok) throw new Error('Request failed');
    return (await response.json()).data as NotificationPrefs;
  } finally {
    clearTimeout(timer);
  }
};

export const PreferencesSetting = () => {
  const { t, lang, setLanguage } = useTranslation();
  const { hasPos, hasMarketplace, togglePos, toggleMarketplace } = useChannels();
  const [preferences, setPreferences] = useState<NotificationPrefs | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const loadPreferences = async () => {
    setLoadError(false);
    try {
      setPreferences(await requestPrefs('GET'));
    } catch {
      setLoadError(true);
    }
  };
  useEffect(() => { loadPreferences(); }, []);

  const handleSavePreferences = async () => {
    if (!preferences) return;
    setIsSaving(true);
    try {
      const { locale, optionalEnabled, emailEnabled, telegramEnabled } = preferences;
      setPreferences(await requestPrefs('PUT', { locale, optionalEnabled, emailEnabled, telegramEnabled }));
      toast.success(t('merchant.p.preferencesUpdatedSuccessfully'));
    } catch {
      toast.error(t('merchant.p.preferencesCouldNotBe'));
    } finally {
      setIsSaving(false);
    }
  };

  const PreferenceSwitch = ({
    id,
    checked,
    onCheckedChange,
    label,
    description,
  }: {
    id: string;
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    label: string;
    description: string;
  }) => (
    <div className="flex min-h-[56px] items-center justify-between gap-4 py-3">
      <div>
        <Label htmlFor={id} className="cursor-pointer text-sm font-medium">{label}</Label>
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );

  // Only say a channel changed once Core has saved it
  const changeMarketplace = async (checked: boolean) => {
    try {
      await toggleMarketplace(checked);
      toast.success(t(checked ? 'merchant.prefs.marketplaceOn' : 'merchant.prefs.marketplaceOff'));
    } catch {
      toast.error(t('merchant.prefs.channelError'));
    }
  };

  const isKhmer = lang === 'kh' || lang === 'km';
  const section = 'rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]';

  return (
    <SettingsLayout
      title={t('merchant.settings.sections.preferences.title')}
      description={t('merchant.settings.sections.preferences.body')}
    >
      {/* App language (redesign M21: Language) */}
      <section className={`${section} space-y-3`}>
        <h2 className="text-base font-semibold text-foreground">{t('merchant.prefs.appLanguage')}</h2>
        <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label={t('merchant.prefs.appLanguage')}>
          {([['en', 'English'], ['kh', 'ខ្មែរ']] as const).map(([value, label]) => {
            const selected = value === 'kh' ? isKhmer : !isKhmer;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setLanguage(value)}
                className={`min-h-[48px] rounded-xl border-2 px-4 text-left text-sm font-semibold ${selected ? 'border-primary bg-accent' : 'border-border'}`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Notifications (Core /api/notifications/preferences) */}
      <section className={`${section} space-y-2`}>
        <h2 className="text-base font-semibold text-foreground">{t('merchant.p.notificationSettings')}</h2>
        <p className="text-sm text-muted-foreground">{t('merchant.p.securityLegalAndEssential')}</p>
        {loadError && (
          <div role="alert" className="py-2 text-sm text-muted-foreground">
            {t('merchant.prefs.loadError')}{' '}
            <button type="button" className="font-medium text-foreground underline" onClick={loadPreferences}>{t('merchant.p.tryAgain')}</button>
          </div>
        )}
        {!preferences && !loadError && (
          <p role="status" className="py-2 text-sm text-muted-foreground">{t('merchant.p.loadingPreferences')}</p>
        )}
        {preferences && (
          <>
            <div className="divide-y divide-border">
              <PreferenceSwitch
                id="email-notifications"
                checked={preferences.emailEnabled}
                onCheckedChange={(checked) => setPreferences({ ...preferences, emailEnabled: checked })}
                label={t('merchant.p.emailNotifications')}
                description={t('merchant.prefs.emailBody')}
              />
              <PreferenceSwitch
                id="telegram-notifications"
                checked={preferences.telegramEnabled}
                onCheckedChange={(checked) => setPreferences({ ...preferences, telegramEnabled: checked })}
                label={t('merchant.p.telegramNotifications')}
                description={t('merchant.prefs.telegramBody')}
              />
              <PreferenceSwitch
                id="optional-notifications"
                checked={preferences.optionalEnabled}
                onCheckedChange={(checked) => setPreferences({ ...preferences, optionalEnabled: checked })}
                label={t('merchant.p.optionalUpdates')}
                description={t('merchant.prefs.optionalBody')}
              />
            </div>
            <div className="space-y-2 pt-2">
              <p className="text-sm font-medium text-foreground">{t('merchant.p.notificationLanguage')}</p>
              <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label={t('merchant.p.notificationLanguage2')}>
                {([['en', 'English'], ['km', 'ខ្មែរ']] as const).map(([value, label]) => {
                  const selected = preferences.locale === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setPreferences({ ...preferences, locale: value })}
                      className={`min-h-[48px] rounded-xl border-2 px-4 text-left text-sm font-semibold ${selected ? 'border-primary bg-accent' : 'border-border'}`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={handleSavePreferences} disabled={isSaving} className="min-h-[44px] rounded-xl px-6">
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {isSaving ? t('merchant.common.saving') : t('merchant.common.save')}
              </Button>
            </div>
          </>
        )}
      </section>

      {/* Sales channels shown in this dashboard */}
      <section className={`${section} space-y-1`}>
        <h2 className="text-base font-semibold text-foreground">{t('merchant.p.salesChannels')}</h2>
        <div className="divide-y divide-border">
          <PreferenceSwitch
            id="pos-channel"
            checked={hasPos}
            onCheckedChange={(checked) => togglePos(checked)}
            label={t('merchant.p.pointOfSalePos')}
            description={t('merchant.prefs.posBody')}
          />
          <PreferenceSwitch
            id="marketplace-channel"
            checked={hasMarketplace}
            onCheckedChange={changeMarketplace}
            label={t('merchant.p.rentifyMarketplace2')}
            description={t('merchant.prefs.marketplaceBody')}
          />
        </div>
      </section>
    </SettingsLayout>
  );
};

export default PreferencesSetting;