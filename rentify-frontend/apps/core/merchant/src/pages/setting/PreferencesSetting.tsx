// preferences-setting.tsx
import React, { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@rentify/shared/ui/card';
import { Label } from '@rentify/shared/ui/label';
import { Switch } from '@rentify/shared/ui/switch';
import { Separator } from '@rentify/shared/ui/separator';
import { Button } from '@rentify/shared/ui/button';
import { Bell, Mail, Send, Megaphone, Save, Loader2, Store, TerminalSquare, ShoppingBag } from 'lucide-react';
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
  const { t } = useTranslation();
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
    icon 
  }: {
    id: string;
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    label: string;
    description: string;
    icon: React.ReactNode;
  }) => (
    <div className="flex items-center justify-between py-4">
      <div className="flex items-center space-x-4">
        <div className="p-2 bg-muted rounded-lg">
          {icon}
        </div>
        <div>
          <Label htmlFor={id} className="text-sm font-medium cursor-pointer">
            {label}
          </Label>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        </div>
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
      />
    </div>
  );

  return (
    <SettingsLayout
      title={t('merchant.settings.sections.preferences.title')}
      description={t('merchant.settings.sections.preferences.body')}
      icon={<Bell />}
    >
      {/* Sales Channels Management */}
      <Card className="shadow-sm border-border mb-6">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" />
            {t('merchant.p.salesChannels')}
          </CardTitle>
          <CardDescription>
            {t('merchant.p.enableOrDisableSales')}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 px-6">
          <div className="divide-y divide-border">
            <PreferenceSwitch
              id="pos-channel"
              checked={hasPos}
              onCheckedChange={(checked) => {
                togglePos(checked);
                toast.success(checked ? 'POS channel enabled in sidebar' : 'POS channel disabled in sidebar');
              }}
              label={t('merchant.p.pointOfSalePos')}
              description="Enable in-person counter checkout, cash collection, and barcode terminal in dashboard"
              icon={<TerminalSquare className="h-4 w-4 text-muted-foreground" />}
            />
            <PreferenceSwitch
              id="marketplace-channel"
              checked={hasMarketplace}
              onCheckedChange={(checked) => {
                toggleMarketplace(checked);
                toast.success(checked ? 'Marketplace listing enabled' : 'Marketplace listing disabled');
              }}
              label={t('merchant.p.rentifyMarketplace2')}
              description="List eligible store products in the central Rentify marketplace"
              icon={<ShoppingBag className="h-4 w-4 text-[var(--rentify-color-success-text)]" />}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card className="shadow-sm border-0">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold">{t('merchant.p.notificationSettings')}</CardTitle>
              <CardDescription>
                {t('merchant.p.securityLegalAndEssential')}
              </CardDescription>
            </div>
            <Button
              onClick={handleSavePreferences}
              disabled={isSaving || !preferences}
              className="flex items-center space-x-2"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span>{isSaving ? 'Saving...' : 'Save Preferences'}</span>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0 px-6">
          {loadError && (
            <div role="alert" className="py-4 text-sm text-muted-foreground">
              Preferences could not be loaded.{' '}
              <button type="button" className="font-medium text-foreground underline" onClick={loadPreferences}>{t('merchant.p.tryAgain')}</button>
            </div>
          )}
          {!preferences && !loadError && (
            <p role="status" className="py-4 text-sm text-muted-foreground">{t('merchant.p.loadingPreferences')}</p>
          )}
          {preferences && (
          <div className="divide-y divide-border">
            <PreferenceSwitch
              id="email-notifications"
              checked={preferences.emailEnabled}
              onCheckedChange={(checked) => setPreferences({ ...preferences, emailEnabled: checked })}
              label={t('merchant.p.emailNotifications')}
              description="Receive important updates via email"
              icon={<Mail className="h-4 w-4 text-muted-foreground" />}
            />

            <PreferenceSwitch
              id="telegram-notifications"
              checked={preferences.telegramEnabled}
              onCheckedChange={(checked) => setPreferences({ ...preferences, telegramEnabled: checked })}
              label={t('merchant.p.telegramNotifications')}
              description="Get alerts in Telegram when delivery is available"
              icon={<Send className="h-4 w-4 text-muted-foreground" />}
            />

            <PreferenceSwitch
              id="optional-notifications"
              checked={preferences.optionalEnabled}
              onCheckedChange={(checked) => setPreferences({ ...preferences, optionalEnabled: checked })}
              label={t('merchant.p.optionalUpdates')}
              description="Receive product updates, tips, and other non-essential notices"
              icon={<Megaphone className="h-4 w-4 text-muted-foreground" />}
            />
          </div>
          )}
        </CardContent>
      </Card>

      {/* Notification Language */}
      {preferences && (
      <Card className="shadow-sm border-0 mt-6">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">{t('merchant.p.notificationLanguage')}</CardTitle>
          <CardDescription>
            {t('merchant.p.chooseTheLanguageYour')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4" role="radiogroup" aria-label={t('merchant.p.notificationLanguage2')}>
            {([['en', 'English', 'Notices in English'], ['km', 'ខ្មែរ', 'សេចក្ដីជូនដំណឹងជាភាសាខ្មែរ']] as const).map(([value, label, hint]) => {
              const selected = preferences.locale === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setPreferences({ ...preferences, locale: value })}
                  className={`border-2 rounded-lg p-4 text-left cursor-pointer transition-all ${
                    selected
                      ? 'border-primary bg-accent '
                      : 'border-border hover:border-border'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{label}</span>
                    {selected && <div className="w-2 h-2 bg-primary rounded-full"></div>}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{hint}</p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
      )}
    </SettingsLayout>
  );
};

export default PreferencesSetting;