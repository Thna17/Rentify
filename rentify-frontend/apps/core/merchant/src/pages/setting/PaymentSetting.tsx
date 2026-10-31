import React, { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@rentify/shared/ui/card';
import { Button } from '@rentify/shared/ui/button';
import { Input } from '@rentify/shared/ui/input';
import { Label } from '@rentify/shared/ui/label';
import { Switch } from '@rentify/shared/ui/switch';
import { Separator } from '@rentify/shared/ui/separator';
import { Badge } from '@rentify/shared/ui/badge';
import {
  CreditCard,
  QrCode,
  Building2,
  Key,
  Eye,
  EyeOff,
  Save,
  Loader2,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { SettingsLayout } from '../../layouts/setting/SettingsLayout';
import {
  useUpdateMerchantConfigMutation,
  useGetMerchantConfigQuery,
  ECOMMERCE_API_ROOT,
} from '@rentify/apis';
import { useThemeService } from '@rentify/shared/hooks/useThemeService';

interface CutLuyConfig {
  enabled: boolean;
  apiKey: string;
  webhookSecret: string;
  businessName: string;
}

const SUPPORTED_BANKS = [
  'ABA Mobile',
  'ACLEDA Mobile',
  'Bakong App',
  'Wing Bank',
  'Canadia Bank',
  'Sathapana Bank',
  'Phillip Bank',
  '30+ KHQR Apps',
];

export const PaymentSetting: React.FC = () => {
  const [showApiKey, setShowApiKey] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);
  const [hasExistingApiKey, setHasExistingApiKey] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const { websiteData } = useThemeService();
  const websiteId = websiteData.websiteId;

  const {
    data: merchantConfig,
    isLoading: isConfigLoading,
    refetch: refetchConfig,
  } = useGetMerchantConfigQuery(websiteId);

  const [updateMerchantConfig] = useUpdateMerchantConfigMutation();

  const [cutluyConfig, setCutluyConfig] = useState<CutLuyConfig>({
    enabled: false,
    apiKey: '',
    webhookSecret: '',
    businessName: '',
  });

  // Calculate clean, dynamic Webhook URL
  const webhookUrl = `${ECOMMERCE_API_ROOT || 'https://ecommerce.rentify.mekhla.digital'}/api/payment/payments/cutluy/webhook`;

  // Sync loaded config from server
  useEffect(() => {
    if (merchantConfig && Array.isArray(merchantConfig)) {
      const cutluyConfigFromApi = merchantConfig.find(
        (config: any) => config.gateway === 'cutluy'
      );

      if (cutluyConfigFromApi) {
        setCutluyConfig((prev) => ({
          ...prev,
          enabled: Boolean(cutluyConfigFromApi.enabled),
          businessName: cutluyConfigFromApi.config?.businessName || '',
          apiKey: '',
          webhookSecret: '',
        }));

        setHasExistingApiKey(
          Boolean(cutluyConfigFromApi.hasApiKey || cutluyConfigFromApi.enabled)
        );
      }
    }
  }, [merchantConfig]);

  const handleCopyWebhook = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopiedWebhook(true);
      toast.success('Webhook URL copied to clipboard');
      setTimeout(() => setCopiedWebhook(false), 2500);
    } catch {
      toast.error('Failed to copy webhook URL to clipboard');
    }
  };

  const handleSaveCutLuyConfig = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);

    try {
      const payload = {
        websiteId,
        paymentGateways: {
          cutluy: {
            enabled: cutluyConfig.enabled,
            businessName: cutluyConfig.businessName.trim(),
            ...(cutluyConfig.apiKey.trim()
              ? { apiKey: cutluyConfig.apiKey.trim() }
              : {}),
            ...(cutluyConfig.webhookSecret.trim()
              ? { webhookSecret: cutluyConfig.webhookSecret.trim() }
              : {}),
          },
        },
      };

      await updateMerchantConfig(payload).unwrap();
      await refetchConfig();
      if (cutluyConfig.apiKey.trim()) {
        setHasExistingApiKey(true);
      }
      setCutluyConfig((prev) => ({ ...prev, apiKey: '', webhookSecret: '' }));
      toast.success('CutLuy payment settings saved successfully');
    } catch (error: any) {
      console.error('Failed to save CutLuy config:', error);
      const errorMessage =
        error.data?.error ||
        error.message ||
        'Failed to save CutLuy payment configuration';
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  if (isConfigLoading) {
    return (
      <SettingsLayout
        title="Payment Gateway Settings"
        description="Configure CutLuy Instant KHQR payments for your online storefront and POS"
        icon={<CreditCard />}
      >
        <div className="flex flex-col justify-center items-center h-80 space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Loading payment settings...
          </p>
        </div>
      </SettingsLayout>
    );
  }

  const isConfiguredAndActive = cutluyConfig.enabled && hasExistingApiKey;

  return (
    <SettingsLayout
      title="Payment Gateway Settings"
      description="Accept instant QR payments from Cambodian bank accounts via CutLuy"
      icon={<CreditCard />}
    >
      <div className="space-y-6 max-w-4xl">
        {/* Main Gateway Status Card */}
        <Card className="overflow-hidden border border-border shadow-sm">
          <div className="p-6 sm:p-7">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-border">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                  <QrCode className="h-7 w-7" />
                </div>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h2 className="text-xl font-semibold tracking-tight text-foreground">
                      CutLuy Instant KHQR
                    </h2>
                    {isConfiguredAndActive ? (
                      <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 border-emerald-500/30 font-medium px-2.5 py-0.5 flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Active & Accepting Payments
                      </Badge>
                    ) : cutluyConfig.enabled ? (
                      <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 px-2.5 py-0.5">
                        Enabled (API Key Required)
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="px-2.5 py-0.5">
                        Inactive
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Accept zero-middleman KHQR payments with real-time settlement directly to your bank account.
                  </p>
                </div>
              </div>

              {/* Enable / Disable Switch */}
              <div className="flex items-center gap-3 self-end sm:self-center bg-muted/40 p-2.5 px-4 rounded-xl border border-border shrink-0">
                <div className="text-right">
                  <Label
                    htmlFor="cutluy-enabled-toggle"
                    className="text-xs font-semibold uppercase tracking-wider block cursor-pointer"
                  >
                    Accept Payments
                  </Label>
                  <span className="text-xs text-muted-foreground">
                    {cutluyConfig.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <Switch
                  id="cutluy-enabled-toggle"
                  checked={cutluyConfig.enabled}
                  onCheckedChange={(checked) =>
                    setCutluyConfig((prev) => ({ ...prev, enabled: checked }))
                  }
                />
              </div>
            </div>

            {/* Supported Banks & Direct Settlement Value Banner */}
            <div className="pt-5 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground mr-1">
                  Supported Banks:
                </span>
                {SUPPORTED_BANKS.map((bank) => (
                  <span
                    key={bank}
                    className="text-xs font-medium px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground border border-border/60"
                  >
                    {bank}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-900/40 text-xs text-emerald-900 dark:text-emerald-200 space-y-1">
                  <div className="font-semibold flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
                    <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>Direct Merchant Settlement</span>
                  </div>
                  <p className="text-emerald-700/90 dark:text-emerald-300/80 leading-relaxed">
                    Customer payments settle 100% directly into your Cambodian bank account. Rentify never holds or touches your funds.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200/70 dark:border-blue-900/40 text-xs text-blue-900 dark:text-blue-200 space-y-1">
                  <div className="font-semibold flex items-center gap-1.5 text-blue-800 dark:text-blue-300">
                    <Zap className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    <span>Zero Commission & Free Tier</span>
                  </div>
                  <p className="text-blue-700/90 dark:text-blue-300/80 leading-relaxed">
                    CutLuy offers 50 free transactions each month with no setup fee.
                    {' '}
                    <a
                      href="https://cutluy.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold underline hover:text-blue-950 dark:hover:text-white inline-flex items-center gap-0.5"
                    >
                      Sign up at cutluy.com
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* API Credentials Configuration */}
        <Card className="border border-border shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Key className="h-4 w-4 text-primary" />
                  <span>API Credentials</span>
                </CardTitle>
                <CardDescription>
                  Enter your CutLuy API keys to authenticate dynamic KHQR code generation.
                </CardDescription>
              </div>
              <a
                href="https://cutluy.com/dashboard/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1"
              >
                <span>Get API Key</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* CutLuy API Key */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="cutluy-api-key" className="text-sm font-medium">
                  CutLuy API Key <span className="text-destructive">*</span>
                </Label>
                {hasExistingApiKey && (
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    API key encrypted and saved
                  </span>
                )}
              </div>
              <div className="relative">
                <Input
                  id="cutluy-api-key"
                  type={showApiKey ? 'text' : 'password'}
                  value={cutluyConfig.apiKey}
                  onChange={(e) =>
                    setCutluyConfig((prev) => ({
                      ...prev,
                      apiKey: e.target.value,
                    }))
                  }
                  placeholder={
                    hasExistingApiKey
                      ? '•••••••••••••••••••••••••••••••• (Leave blank to keep existing key)'
                      : 'ck_live_xxxxxxxxxxxxxxxxxxxxxxxx'
                  }
                  className="pr-10 font-mono text-sm"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  tabIndex={-1}
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent text-muted-foreground hover:text-foreground"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Your production secret key starts with{' '}
                <code className="text-xs px-1 py-0.5 rounded bg-muted">
                  ck_live_
                </code>
                {' '}(or{' '}
                <code className="text-xs px-1 py-0.5 rounded bg-muted">
                  ck_test_
                </code>
                {' '}for sandbox testing).
              </p>
            </div>

            {/* Webhook Secret (Optional) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="cutluy-webhook-secret"
                  className="text-sm font-medium"
                >
                  Webhook Secret{' '}
                  <span className="text-xs text-muted-foreground font-normal">
                    (Optional)
                  </span>
                </Label>
              </div>
              <div className="relative">
                <Input
                  id="cutluy-webhook-secret"
                  type={showWebhookSecret ? 'text' : 'password'}
                  value={cutluyConfig.webhookSecret}
                  onChange={(e) =>
                    setCutluyConfig((prev) => ({
                      ...prev,
                      webhookSecret: e.target.value,
                    }))
                  }
                  placeholder="whsec_xxxxxxxxxxxxxxxxxxxxxxxx"
                  className="pr-10 font-mono text-sm"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  tabIndex={-1}
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent text-muted-foreground hover:text-foreground"
                  onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                >
                  {showWebhookSecret ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Used to cryptographically verify incoming webhook payloads from CutLuy.
              </p>
            </div>

            {/* Display / Business Name */}
            <div className="space-y-2">
              <Label
                htmlFor="cutluy-business-name"
                className="text-sm font-medium flex items-center gap-1.5"
              >
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span>Store Display Name</span>
                <span className="text-xs text-muted-foreground font-normal">
                  (Optional)
                </span>
              </Label>
              <Input
                id="cutluy-business-name"
                value={cutluyConfig.businessName}
                onChange={(e) =>
                  setCutluyConfig((prev) => ({
                    ...prev,
                    businessName: e.target.value,
                  }))
                }
                placeholder="e.g. My Cambodian Store"
                className="text-sm"
              />
              <p className="text-xs text-muted-foreground">
                The business name shown on the customer's bank app when they scan the generated KHQR code.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Webhook Endpoint Card */}
        <Card className="border border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>Instant Payment Webhook</span>
            </CardTitle>
            <CardDescription>
              Configure this webhook URL in your CutLuy dashboard to automatically mark orders as Paid in real time.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Webhook Notification URL
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={webhookUrl}
                  className="bg-muted/50 font-mono text-xs text-foreground select-all"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyWebhook}
                  className="flex items-center gap-1.5 shrink-0 px-3.5 font-medium"
                >
                  {copiedWebhook ? (
                    <>
                      <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                        Copied
                      </span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      <span>Copy URL</span>
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-muted/30 border border-border text-xs space-y-2">
              <p className="font-semibold text-foreground">
                How to complete webhook setup in 2 steps:
              </p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground leading-relaxed pl-1">
                <li>
                  Open your{' '}
                  <a
                    href="https://cutluy.com/dashboard/webhooks"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline font-medium"
                  >
                    CutLuy Dashboard &gt; Webhooks
                  </a>
                  .
                </li>
                <li>
                  Click <strong>Add Webhook</strong> and paste the Webhook URL above.
                </li>
              </ol>
            </div>
          </CardContent>
        </Card>

        {/* Action Save Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-card border border-border shadow-sm">
          <div className="text-sm">
            {cutluyConfig.enabled ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                CutLuy KHQR active for your Storefront & Point of Sale (POS)
              </span>
            ) : (
              <span className="text-muted-foreground">
                Toggle the switch above and click Save to activate KHQR checkout for customers.
              </span>
            )}
          </div>

          <Button
            type="button"
            onClick={() => handleSaveCutLuyConfig()}
            disabled={isSaving}
            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-medium flex items-center justify-center gap-2 px-6 shadow-sm"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Save Payment Settings</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </SettingsLayout>
  );
};

export default PaymentSetting;
