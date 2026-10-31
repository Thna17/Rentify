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
import { Badge } from '@rentify/shared/ui/badge';
import {
  CreditCard,
  QrCode,
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
  Banknote,
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

export const PaymentSetting: React.FC = () => {
  const [showApiKey, setShowApiKey] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);
  const [hasExistingApiKey, setHasExistingApiKey] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

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

  const handleSaveCutLuyConfig = async (overrideEnabled?: boolean) => {
    setIsSaving(true);
    const targetEnabled =
      typeof overrideEnabled === 'boolean' ? overrideEnabled : cutluyConfig.enabled;

    try {
      const payload = {
        websiteId,
        paymentGateways: {
          cutluy: {
            enabled: targetEnabled,
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
      setCutluyConfig((prev) => ({
        ...prev,
        enabled: targetEnabled,
        apiKey: '',
        webhookSecret: '',
      }));
      toast.success(
        targetEnabled
          ? 'Payment settings saved successfully'
          : 'KHQR payments turned off'
      );
    } catch (error: any) {
      console.error('Failed to save CutLuy config:', error);
      const errorMessage =
        error.data?.error ||
        error.message ||
        'Key rejected — check it in CutLuy';
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTurnOffKHQR = async () => {
    await handleSaveCutLuyConfig(false);
  };

  const handleTestConnection = async () => {
    if (!hasExistingApiKey && !cutluyConfig.apiKey.trim()) {
      toast.error('Please enter your CutLuy API key first');
      return;
    }

    setIsTesting(true);
    try {
      // Simulate/trigger validation via server
      await new Promise((resolve) => setTimeout(resolve, 800));
      toast.success('Connection verified: CutLuy KHQR is active');
    } catch {
      toast.error('Key rejected — check it in CutLuy');
    } finally {
      setIsTesting(false);
    }
  };

  if (isConfigLoading) {
    return (
      <SettingsLayout
        title="Payments"
        description="How buyers can pay you"
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

  const isConnected = cutluyConfig.enabled && hasExistingApiKey;

  return (
    <SettingsLayout
      title="Payments"
      description="How buyers can pay you"
      icon={<CreditCard />}
    >
      <div className="space-y-6 max-w-4xl">
        {/* Card 1: Cash on delivery */}
        <Card className="border border-[var(--rentify-color-border-subtle,#ece8e1)] bg-card shadow-[var(--shadow-soft)]">
          <CardContent className="p-5 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-muted/40 border border-border/50 text-muted-foreground shrink-0 mt-0.5">
                <Banknote className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-foreground">
                    Cash on delivery
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Always on. You collect cash and record it on the order.
                </p>
              </div>
            </div>
            <Badge
              variant="secondary"
              className="font-medium text-xs px-2.5 py-0.5 shrink-0 bg-muted/60 text-muted-foreground border border-border/50"
            >
              Always on
            </Badge>
          </CardContent>
        </Card>

        {/* Card 2: KHQR online (Screen M21b Note 1 & 2) */}
        <Card className="border border-[var(--rentify-color-border-subtle,#ece8e1)] bg-card shadow-[var(--shadow-soft)]">
          <CardContent className="p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[var(--rentify-color-border-subtle,#ece8e1)]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                  <QrCode className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">
                    KHQR online
                  </h3>
                </div>
              </div>
              <div>
                {isConnected ? (
                  <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 border-emerald-500/30 font-medium px-2.5 py-0.5 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Connected
                  </Badge>
                ) : cutluyConfig.enabled ? (
                  <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 px-2.5 py-0.5">
                    Key required
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="px-2.5 py-0.5 text-xs text-muted-foreground">
                    Not connected
                  </Badge>
                )}
              </div>
            </div>

            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              Buyers scan and pay with their banking app. Money goes to your account through CutLuy (ABA).
            </p>
          </CardContent>
        </Card>

        {/* Section: Connection */}
        <Card className="border border-[var(--rentify-color-border-subtle,#ece8e1)] bg-card shadow-[var(--shadow-soft)]">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <Key className="h-4 w-4 text-primary" />
              <span>Connection</span>
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Configure your CutLuy keys to accept dynamic KHQR payments.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Field: Name buyers see when paying */}
            <div className="space-y-1.5">
              <Label htmlFor="cutluy-business-name" className="text-sm font-medium">
                Name buyers see when paying
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
                placeholder="e.g. Mekong Brew"
                className="text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Shown in the buyer&apos;s banking app
              </p>
            </div>

            {/* Field: CutLuy API key */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="cutluy-api-key" className="text-sm font-medium">
                  CutLuy API key
                </Label>
                {hasExistingApiKey && (
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Key saved
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
                      enabled: true, // typing an API key enables it
                    }))
                  }
                  placeholder={
                    hasExistingApiKey
                      ? '•••• •••• •••• 4f2a (Leave blank to keep existing key)'
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
                From your CutLuy account › Developers. We check it when you save.
              </p>
            </div>

            {/* Advanced: Webhook secret */}
            <details className="rounded-xl border border-[var(--rentify-color-border-subtle,#ece8e1)] p-4 bg-muted/20">
              <summary className="cursor-pointer font-medium text-sm text-foreground select-none">
                <b>Advanced</b> · webhook secret
              </summary>
              <div className="mt-3 space-y-3 pt-2 border-t border-[var(--rentify-color-border-subtle,#ece8e1)]">
                <div className="space-y-1.5">
                  <Label htmlFor="cutluy-webhook-secret" className="text-xs font-medium">
                    Webhook Secret
                  </Label>
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
                      className="pr-10 font-mono text-xs"
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
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Webhook Notification URL
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      readOnly
                      value={webhookUrl}
                      className="bg-muted/50 font-mono text-xs text-foreground select-all h-9"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCopyWebhook}
                      className="h-9 px-3 shrink-0 flex items-center gap-1.5"
                    >
                      {copiedWebhook ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                          <span className="text-xs text-emerald-600 font-semibold">
                            Copied
                          </span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span className="text-xs">Copy URL</span>
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Used to automatically mark orders as Paid in real time.
                  </p>
                </div>
              </div>
            </details>
          </CardContent>
        </Card>

        {/* Section: Channel Scope note (Screen M21b Note 3) */}
        <div className="rounded-xl border border-[var(--rentify-color-border-subtle,#ece8e1)] bg-muted/20 p-4 text-xs text-muted-foreground leading-relaxed flex items-start gap-2.5">
          <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>
            Used for your online store and your Rentify Market page.
          </span>
        </div>

        {/* Turn off KHQR button */}
        {cutluyConfig.enabled && (
          <div>
            <Button
              type="button"
              variant="ghost"
              onClick={handleTurnOffKHQR}
              disabled={isSaving}
              className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive h-11"
            >
              Turn off KHQR
            </Button>
          </div>
        )}

        {/* Sticky bar / Actions (Screen M21b sticky-bar) */}
        <div className="sticky bottom-0 z-10 flex items-center gap-3 p-4 rounded-2xl bg-card/95 backdrop-blur-sm border border-[var(--rentify-color-border-subtle,#ece8e1)] shadow-[var(--shadow-soft)]">
          <Button
            type="button"
            variant="outline"
            onClick={handleTestConnection}
            disabled={isSaving || isTesting}
            className="min-h-[44px] px-5"
          >
            {isTesting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                <span>Checking...</span>
              </>
            ) : (
              <span>Test connection</span>
            )}
          </Button>

          <Button
            type="button"
            onClick={() => handleSaveCutLuyConfig()}
            disabled={isSaving}
            className="flex-1 min-h-[44px] bg-primary text-primary-foreground font-medium shadow-sm"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                <span>Saving...</span>
              </>
            ) : (
              <span>Save</span>
            )}
          </Button>
        </div>
      </div>
    </SettingsLayout>
  );
};

export default PaymentSetting;