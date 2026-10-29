// payment-setting.tsx
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@rentify/shared/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@rentify/shared/ui/tabs';
import {
  CreditCard,
  Shield,
  QrCode,
  Building,
  MapPin,
  Key,
  Eye,
  EyeOff,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Wallet,
  Globe,
  Smartphone,
  Copy,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { SettingsLayout } from '../../layouts/setting/SettingsLayout';
import {
  useUpdateMerchantConfigMutation,
  useGetMerchantConfigQuery,
} from '@rentify/apis';
import { useThemeService } from '@rentify/shared/hooks/useThemeService';

interface CutLuyConfig {
  enabled: boolean;
  apiKey: string;
  webhookSecret: string;
  businessName: string;
}

interface KHQRConfig {
  enabled: boolean;
  bakongAccount: string;
  businessName: string;
  businessCity: string;
  apiKey: string;
  currency: string;
  merchantId: string;
}

interface ABAConfig {
  enabled: boolean;
  merchantId: string;
  merchantName: string;
  apiKey: string;
  apiSecret: string;
  environment: 'sandbox' | 'production';
}

interface StripeConfig {
  enabled: boolean;
  publishableKey: string;
  secretKey: string;
  webhookSecret: string;
  accountId: string;
  environment: 'test' | 'live';
}

interface CreditCardConfig {
  enabled: boolean;
  acceptedCards: string[];
  requireCvv: boolean;
  allowSaveCards: boolean;
  autoCapture: boolean;
}


export const PaymentSetting = () => {
  const [activeTab, setActiveTab] = useState('cutluy');
  const [showApiKeys, setShowApiKeys] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { websiteData } = useThemeService();
  const websiteId = websiteData.websiteId;

  // API Hooks for KHQR
  const { data: merchantConfig, isLoading: isConfigLoading, refetch: refetchConfig } = useGetMerchantConfigQuery(websiteId);
  const [updateMerchantConfig] = useUpdateMerchantConfigMutation();

  // Initialize KHQR config from API
  const [khqrConfig, setKhqrConfig] = useState<KHQRConfig>({
    enabled: true,
    bakongAccount: '',
    businessName: '',
    businessCity: '',
    apiKey: '',
    currency: 'USD',
    merchantId: '',
  });

  // CutLuy Instant KHQR Config
  const [cutluyConfig, setCutluyConfig] = useState<CutLuyConfig>({
    enabled: false,
    apiKey: '',
    webhookSecret: '',
    businessName: '',
  });

  // Other gateways remain static for now
  const [abaPaywayConfig, setAbaPaywayConfig] = useState<ABAConfig>({
    enabled: false,
    merchantId: '',
    merchantName: '',
    apiKey: '',
    apiSecret: '',
    environment: 'sandbox',
  });

  const [stripeConfig, setStripeConfig] = useState<StripeConfig>({
    enabled: false,
    publishableKey: '',
    secretKey: '',
    webhookSecret: '',
    accountId: '',
    environment: 'test',
  });

  const [creditCardConfig, setCreditCardConfig] = useState<CreditCardConfig>({
    enabled: true,
    acceptedCards: ['visa', 'mastercard', 'amex', 'unionpay'],
    requireCvv: true,
    allowSaveCards: true,
    autoCapture: true,
  });

  // Load gateway configs from API when component mounts or config changes
  useEffect(() => {
    if (merchantConfig && Array.isArray(merchantConfig)) {
      const khqrConfigFromApi = merchantConfig.find((config: any) => config.gateway === 'khqr')?.config;
      if (khqrConfigFromApi) {
        setKhqrConfig(prev => ({
          ...prev,
          bakongAccount: khqrConfigFromApi.bakongAccount || '',
          businessName: khqrConfigFromApi.businessName || '',
          businessCity: khqrConfigFromApi.businessCity || '',
          // Provider keys are deliberately write-only and are never returned by the API.
          apiKey: '',
          currency: khqrConfigFromApi.currency || 'USD',
          merchantId: khqrConfigFromApi.merchantId || prev.merchantId,
        }));
      }

      const cutluyConfigFromApi = merchantConfig.find((config: any) => config.gateway === 'cutluy');
      if (cutluyConfigFromApi) {
        setCutluyConfig(prev => ({
          ...prev,
          enabled: Boolean(cutluyConfigFromApi.enabled),
          businessName: cutluyConfigFromApi.config?.businessName || '',
          apiKey: '',
          webhookSecret: '',
        }));
      }
    }
  }, [merchantConfig]);

  const handleSaveCutLuyConfig = async () => {
    setIsSaving(true);
    try {
      const payload = {
        websiteId,
        paymentGateways: {
          cutluy: {
            enabled: cutluyConfig.enabled,
            businessName: cutluyConfig.businessName,
            ...(cutluyConfig.apiKey ? { apiKey: cutluyConfig.apiKey } : {}),
            ...(cutluyConfig.webhookSecret ? { webhookSecret: cutluyConfig.webhookSecret } : {}),
          },
        },
      };

      await updateMerchantConfig(payload).unwrap();
      await refetchConfig();
      toast.success('CutLuy payment configuration saved successfully');
    } catch (error: any) {
      console.error('Failed to save CutLuy config:', error);
      const errorMessage = error.data?.error || error.message || 'Failed to save CutLuy configuration';
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveKHQRConfig = async () => {
    setIsSaving(true);
    
    try {
      const payload = {
        websiteId,
        bakongAccount: khqrConfig.bakongAccount,
        businessName: khqrConfig.businessName,
        businessCity: khqrConfig.businessCity,
        bakongApiKey: khqrConfig.apiKey,
        currency: khqrConfig.currency,
        // Include merchantId if your API supports it
        ...(khqrConfig.merchantId && { merchantId: khqrConfig.merchantId }),
      };

      await updateMerchantConfig(payload).unwrap();
      
      // Refetch the latest config
      await refetchConfig();
      
      toast.success('KHQR configuration saved successfully');
    } catch (error: any) {
      console.error('Failed to save KHQR config:', error);
      
      const errorMessage = error.data?.error || 'Failed to save KHQR configuration';
      const errorDetails = error.data?.details;
      
      toast.error(
        <div>
          <div className="font-medium">{errorMessage}</div>
          {errorDetails && <div className="text-sm mt-1">{errorDetails}</div>}
        </div>
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveConfig = async (gateway: string) => {
    if (gateway === 'cutluy') {
      await handleSaveCutLuyConfig();
      return;
    }
    if (gateway === 'khqr') {
      await handleSaveKHQRConfig();
      return;
    }

    // Keep existing static saving for other gateways
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsSaving(false);
    toast.success(`${getGatewayName(gateway)} configuration saved successfully`);
  };

  const getGatewayName = (gateway: string) => {
    const names = {
      cutluy: 'CutLuy (Instant KHQR)',
      khqr: 'Bakong KHQR',
      aba: 'ABA Payway',
      stripe: 'Stripe',
      creditcard: 'Credit Card'
    };
    return names[gateway as keyof typeof names] || gateway;
  };

  const toggleApiKeyVisibility = () => {
    setShowApiKeys(!showApiKeys);
  };

  const GatewayStatus = ({ enabled, gateway, canToggle = true }: { enabled: boolean; gateway: string; canToggle?: boolean }) => (
    <div className="flex items-center space-x-2">
      {canToggle && (
        <Switch
          checked={enabled}
          onCheckedChange={(checked) => {
            const configs = {
              cutluy: setCutluyConfig,
              khqr: setKhqrConfig,
              aba: setAbaPaywayConfig,
              stripe: setStripeConfig,
              creditcard: setCreditCardConfig
            };
            configs[gateway as keyof typeof configs]((prev: any) => ({ ...prev, enabled: checked }));
          }}
        />
      )}
      <Badge variant={enabled ? "default" : "secondary"} className={enabled ? "bg-green-100 text-green-800" : ""}>
        {enabled ? 'Active' : 'Inactive'}
      </Badge>
    </div>
  );

  const ApiKeyField = ({ value, label, placeholder, onChange }: { value: string; label: string; placeholder?: string; onChange?: (value: string) => void }) => (
    <div className="space-y-2">
      <Label htmlFor={label.toLowerCase().replace(/\s+/g, '-')}>{label}</Label>
      <div className="relative">
        <Input
          id={label.toLowerCase().replace(/\s+/g, '-')}
          type={showApiKeys ? "text" : "password"}
          value={value}
          placeholder={placeholder}
          className="pr-10 font-mono text-sm"
          onChange={onChange ? (e) => onChange(e.target.value) : undefined}
          readOnly={!onChange}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
          onClick={toggleApiKeyVisibility}
        >
          {showApiKeys ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );

  if (isConfigLoading) {
    return (
      <SettingsLayout
        title="Payment Gateway Settings"
        description="Configure and manage your payment gateway integrations"
        icon={<CreditCard />}
      >
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading payment settings...</span>
        </div>
      </SettingsLayout>
    );
  }


  return (
    <SettingsLayout
      title="Payment Gateway Settings"
      description="Configure and manage your payment gateway integrations"
      icon={<CreditCard />}
    >
      {/* Gateway Status Overview */}
      <Card className="shadow-sm border-0">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Payment Gateway Status</CardTitle>
          <CardDescription>
            Overview of your active payment gateways and their status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { gateway: 'cutluy', name: 'CutLuy (Instant KHQR)', enabled: cutluyConfig.enabled, icon: QrCode, color: 'bg-emerald-600' },
              { gateway: 'khqr', name: 'Bakong KHQR', enabled: khqrConfig.enabled, icon: QrCode, color: 'bg-blue-500' },
              { gateway: 'aba', name: 'ABA Payway', enabled: abaPaywayConfig.enabled, icon: Building, color: 'bg-red-500' },
              { gateway: 'stripe', name: 'Stripe', enabled: stripeConfig.enabled, icon: CreditCard, color: 'bg-purple-500' },
              { gateway: 'creditcard', name: 'Credit Cards', enabled: creditCardConfig.enabled, icon: Wallet, color: 'bg-gray-700' },
            ].map(({ gateway, name, enabled, icon: Icon, color }) => (
              <div
                key={gateway}
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  activeTab === gateway ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setActiveTab(gateway)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${color} text-white`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="font-medium">{name}</span>
                  </div>
                  <Badge variant={enabled ? "default" : "secondary"} className={enabled ? "bg-green-100 text-green-800" : ""}>
                    {enabled ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div className="mt-2 text-sm text-gray-500">
                  {enabled ? 'Ready to accept payments' : 'Click to configure'}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Gateway Configuration Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 gap-1">
          <TabsTrigger value="cutluy" className="flex items-center space-x-2">
            <QrCode className="h-4 w-4 text-emerald-600" />
            <span>CutLuy (KHQR)</span>
          </TabsTrigger>
          <TabsTrigger value="khqr" className="flex items-center space-x-2">
            <QrCode className="h-4 w-4" />
            <span>Bakong KHQR</span>
          </TabsTrigger>
          <TabsTrigger value="aba" className="flex items-center space-x-2">
            <Building className="h-4 w-4" />
            <span>ABA Payway</span>
          </TabsTrigger>
          <TabsTrigger value="stripe" className="flex items-center space-x-2">
            <CreditCard className="h-4 w-4" />
            <span>Stripe</span>
          </TabsTrigger>
          <TabsTrigger value="creditcard" className="flex items-center space-x-2">
            <Wallet className="h-4 w-4" />
            <span>Credit Cards</span>
          </TabsTrigger>
        </TabsList>

        {/* CutLuy Instant KHQR Configuration */}
        <TabsContent value="cutluy">
          <Card className="shadow-sm border-0">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold flex items-center space-x-2">
                    <div className="p-2 bg-emerald-100 rounded-lg">
                      <QrCode className="h-5 w-5 text-emerald-600" />
                    </div>
                    <span>CutLuy Instant KHQR</span>
                  </CardTitle>
                  <CardDescription>
                    Accept KHQR payments with 100% direct bank settlement into your Cambodian bank account (ABA, ACLEDA, Wing, Canadia).
                  </CardDescription>
                </div>
                <GatewayStatus enabled={cutluyConfig.enabled} gateway="cutluy" />
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Direct settlement notice */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm space-y-2">
                <div className="font-semibold flex items-center space-x-2 text-emerald-900">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Direct Merchant Settlement (Zero Middleman)</span>
                </div>
                <p className="text-emerald-800 leading-relaxed text-xs sm:text-sm">
                  Customer payments arrive 100% directly into your bank account connected to CutLuy. Rentify never touches or holds your customer funds.
                </p>
                <div className="pt-2 flex flex-wrap items-center gap-3 text-xs">
                  <a
                    href="https://cutluy.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-1 font-semibold text-emerald-700 hover:text-emerald-900 underline"
                  >
                    <span>Create a CutLuy account at cutluy.com</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  <span className="text-emerald-400">•</span>
                  <span className="text-emerald-700">50 free transactions/mo on Free tier</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ApiKeyField
                  value={cutluyConfig.apiKey}
                  label="CutLuy API Key"
                  placeholder="ck_live_xxxxxxxxxxxxxxxx"
                  onChange={(value) => setCutluyConfig({ ...cutluyConfig, apiKey: value })}
                />

                <ApiKeyField
                  value={cutluyConfig.webhookSecret}
                  label="Webhook Secret (Optional)"
                  placeholder="whsec_xxxxxxxxxxxxxxxx"
                  onChange={(value) => setCutluyConfig({ ...cutluyConfig, webhookSecret: value })}
                />

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="cutluy-business-name" className="flex items-center space-x-2">
                    <Building className="h-4 w-4" />
                    <span>Business / Display Name (Optional)</span>
                  </Label>
                  <Input
                    id="cutluy-business-name"
                    value={cutluyConfig.businessName}
                    onChange={(e) => setCutluyConfig({ ...cutluyConfig, businessName: e.target.value })}
                    placeholder="Your Store Name"
                  />
                </div>
              </div>

              {/* Webhook Endpoint Box */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
                <Label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Your Webhook URL (Paste this into your CutLuy Dashboard)
                </Label>
                <div className="flex items-center space-x-2">
                  <Input
                    readOnly
                    value="https://ecommerce.rentify.mekhla.digital/api/payments/cutluy/webhook"
                    className="bg-white font-mono text-xs text-gray-700"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText('https://ecommerce.rentify.mekhla.digital/api/payments/cutluy/webhook');
                      toast.success('Webhook URL copied to clipboard');
                    }}
                    className="flex items-center space-x-1 shrink-0"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy</span>
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  CutLuy notifies this endpoint instantly when a customer pays, confirming orders automatically.
                </p>
              </div>

              <Separator />

              <div className="flex justify-between items-center">
                <div className="text-xs text-gray-500">
                  {cutluyConfig.enabled ? (
                    <span className="text-emerald-600 font-medium flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      CutLuy active for your Storefront and POS
                    </span>
                  ) : (
                    <span>Enable toggle at top-right to activate CutLuy on your store</span>
                  )}
                </div>
                <Button
                  onClick={() => handleSaveConfig('cutluy')}
                  disabled={isSaving}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center space-x-2"
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  <span>{isSaving ? 'Saving...' : 'Save CutLuy Settings'}</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* KHQR Configuration - Now Dynamic */}
        <TabsContent value="khqr">
          <Card className="shadow-sm border-0">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold flex items-center space-x-2">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <QrCode className="h-5 w-5 text-blue-600" />
                    </div>
                    <span>KHQR Configuration</span>
                  </CardTitle>
                  <CardDescription>
                    Set up your KHQR (Bakong) payment gateway for Cambodian payments
                  </CardDescription>
                </div>
                <GatewayStatus enabled={khqrConfig.enabled} gateway="khqr" />
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="bakong-account" className="flex items-center space-x-2">
                    <Smartphone className="h-4 w-4" />
                    <span>Bakong Account</span>
                  </Label>
                  <Input
                    id="bakong-account"
                    value={khqrConfig.bakongAccount}
                    onChange={(e) => setKhqrConfig({...khqrConfig, bakongAccount: e.target.value})}
                    placeholder="yourname@bakong.kh"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="merchant-id">Merchant ID</Label>
                  <Input
                    id="merchant-id"
                    value={khqrConfig.merchantId}
                    onChange={(e) => setKhqrConfig({...khqrConfig, merchantId: e.target.value})}
                    placeholder="MCH123456"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="business-name" className="flex items-center space-x-2">
                    <Building className="h-4 w-4" />
                    <span>Business Name</span>
                  </Label>
                  <Input
                    id="business-name"
                    value={khqrConfig.businessName}
                    onChange={(e) => setKhqrConfig({...khqrConfig, businessName: e.target.value})}
                    placeholder="Your Business Name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="business-city" className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4" />
                    <span>Business City</span>
                  </Label>
                  <Input
                    id="business-city"
                    value={khqrConfig.businessCity}
                    onChange={(e) => setKhqrConfig({...khqrConfig, businessCity: e.target.value})}
                    placeholder="Phnom Penh"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select value={khqrConfig.currency} onValueChange={(value) => setKhqrConfig({...khqrConfig, currency: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="KHR">KHR (៛)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <ApiKeyField 
                  value={khqrConfig.apiKey} 
                  label="KHQR API Key" 
                  placeholder="khqr_sk_test_xxxxxxxx"
                  onChange={(value) => setKhqrConfig({...khqrConfig, apiKey: value})}
                />
              </div>

              <Separator />

              <div className="flex justify-end">
                <Button 
                  onClick={() => handleSaveConfig('khqr')}
                  disabled={isSaving}
                  className="flex items-center space-x-2"
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  <span>{isSaving ? 'Saving...' : 'Save KHQR Settings'}</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA Payway Configuration */}
        <TabsContent value="aba">
          <Card className="shadow-sm border-0">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold flex items-center space-x-2">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <Building className="h-5 w-5 text-red-600" />
                    </div>
                    <span>ABA Payway Configuration</span>
                  </CardTitle>
                  <CardDescription>
                    Configure ABA Payway for processing payments in Cambodia
                  </CardDescription>
                </div>
                <GatewayStatus enabled={abaPaywayConfig.enabled} gateway="aba" />
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="aba-merchant-id">Merchant ID</Label>
                  <Input
                    id="aba-merchant-id"
                    value={abaPaywayConfig.merchantId}
                    onChange={(e) => setAbaPaywayConfig({...abaPaywayConfig, merchantId: e.target.value})}
                    placeholder="ABA123456789"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="aba-merchant-name">Merchant Name</Label>
                  <Input
                    id="aba-merchant-name"
                    value={abaPaywayConfig.merchantName}
                    onChange={(e) => setAbaPaywayConfig({...abaPaywayConfig, merchantName: e.target.value})}
                    placeholder="Your Merchant Name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="aba-environment">Environment</Label>
                  <Select value={abaPaywayConfig.environment} onValueChange={(value: 'sandbox' | 'production') => setAbaPaywayConfig({...abaPaywayConfig, environment: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sandbox">Sandbox (Testing)</SelectItem>
                      <SelectItem value="production">Production (Live)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <ApiKeyField 
                  value={abaPaywayConfig.apiKey} 
                  label="API Key" 
                  placeholder="aba_pw_sk_test_xxxxxxxx"
                />

                <div className="md:col-span-2 space-y-2">
                  <ApiKeyField 
                    value={abaPaywayConfig.apiSecret} 
                    label="API Secret" 
                    placeholder="aba_secret_xxxxxxxx"
                  />
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 text-yellow-800">
                  <AlertCircle className="h-4 w-4" />
                  <span className="font-medium">Important</span>
                </div>
                <p className="text-yellow-700 text-sm mt-1">
                  Make sure to whitelist your server IP addresses in the ABA Payway merchant portal for API access.
                </p>
              </div>

              <Separator />

              <div className="flex justify-end">
                <Button 
                  onClick={() => handleSaveConfig('aba')}
                  disabled={isSaving}
                  className="flex items-center space-x-2"
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  <span>{isSaving ? 'Saving...' : 'Save ABA Payway Settings'}</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stripe Configuration */}
        <TabsContent value="stripe">
          <Card className="shadow-sm border-0">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold flex items-center space-x-2">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <CreditCard className="h-5 w-5 text-purple-600" />
                    </div>
                    <span>Stripe Configuration</span>
                  </CardTitle>
                  <CardDescription>
                    Set up Stripe for international credit card payments
                  </CardDescription>
                </div>
                <GatewayStatus enabled={stripeConfig.enabled} gateway="stripe" />
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="stripe-account">Stripe Account ID</Label>
                  <Input
                    id="stripe-account"
                    value={stripeConfig.accountId}
                    onChange={(e) => setStripeConfig({...stripeConfig, accountId: e.target.value})}
                    placeholder="acct_xxxxxxxxxxxx"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stripe-environment">Environment</Label>
                  <Select value={stripeConfig.environment} onValueChange={(value: 'test' | 'live') => setStripeConfig({...stripeConfig, environment: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="test">Test Mode</SelectItem>
                      <SelectItem value="live">Live Mode</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <ApiKeyField 
                  value={stripeConfig.publishableKey} 
                  label="Publishable Key" 
                  placeholder="pk_test_xxxxxxxx"
                />

                <ApiKeyField 
                  value={stripeConfig.secretKey} 
                  label="Secret Key" 
                  placeholder="sk_test_xxxxxxxx"
                />

                <div className="md:col-span-2 space-y-2">
                  <ApiKeyField 
                    value={stripeConfig.webhookSecret} 
                    label="Webhook Secret" 
                    placeholder="whsec_xxxxxxxx"
                  />
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 text-blue-800">
                  <Globe className="h-4 w-4" />
                  <span className="font-medium">Webhook Setup</span>
                </div>
                <p className="text-blue-700 text-sm mt-1">
                  Configure your Stripe webhook endpoint to: https://yourdomain.com/api/webhooks/stripe
                </p>
              </div>

              <Separator />

              <div className="flex justify-end">
                <Button 
                  onClick={() => handleSaveConfig('stripe')}
                  disabled={isSaving}
                  className="flex items-center space-x-2"
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  <span>{isSaving ? 'Saving...' : 'Save Stripe Settings'}</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Credit Card Configuration */}
        <TabsContent value="creditcard">
          <Card className="shadow-sm border-0">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold flex items-center space-x-2">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Wallet className="h-5 w-5 text-green-600" />
                    </div>
                    <span>Credit Card Settings</span>
                  </CardTitle>
                  <CardDescription>
                    Configure credit card payment options and security settings
                  </CardDescription>
                </div>
                <GatewayStatus enabled={creditCardConfig.enabled} gateway="creditcard" />
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Accepted Card Types</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                    {[
                      { id: 'visa', name: 'Visa', icon: '💳' },
                      { id: 'mastercard', name: 'Mastercard', icon: '💳' },
                      { id: 'amex', name: 'American Express', icon: '💳' },
                      { id: 'unionpay', name: 'UnionPay', icon: '💳' },
                    ].map((card) => (
                      <div
                        key={card.id}
                        className={`border-2 rounded-lg p-3 cursor-pointer transition-all ${
                          creditCardConfig.acceptedCards.includes(card.id as any)
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200'
                        }`}
                        onClick={() => {
                          const newCards = creditCardConfig.acceptedCards.includes(card.id as any)
                            ? creditCardConfig.acceptedCards.filter(c => c !== card.id)
                            : [...creditCardConfig.acceptedCards, card.id];
                          setCreditCardConfig({...creditCardConfig, acceptedCards: newCards});
                        }}
                      >
                        <div className="flex items-center space-x-2">
                          <span>{card.icon}</span>
                          <span className="font-medium">{card.name}</span>
                        </div>
                        {creditCardConfig.acceptedCards.includes(card.id as any) && (
                          <CheckCircle2 className="h-4 w-4 text-blue-500 mt-1" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="require-cvv">Require CVV</Label>
                      <p className="text-sm text-gray-500">
                        Customers must enter CVV code for added security
                      </p>
                    </div>
                    <Switch
                      id="require-cvv"
                      checked={creditCardConfig.requireCvv}
                      onCheckedChange={(checked) => setCreditCardConfig({...creditCardConfig, requireCvv: checked})}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="allow-save-cards">Allow Saving Cards</Label>
                      <p className="text-sm text-gray-500">
                        Customers can save cards for faster checkout
                      </p>
                    </div>
                    <Switch
                      id="allow-save-cards"
                      checked={creditCardConfig.allowSaveCards}
                      onCheckedChange={(checked) => setCreditCardConfig({...creditCardConfig, allowSaveCards: checked})}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="auto-capture">Auto Capture Payments</Label>
                      <p className="text-sm text-gray-500">
                        Automatically capture payments without manual approval
                      </p>
                    </div>
                    <Switch
                      id="auto-capture"
                      checked={creditCardConfig.autoCapture}
                      onCheckedChange={(checked) => setCreditCardConfig({...creditCardConfig, autoCapture: checked})}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 text-green-800">
                  <Shield className="h-4 w-4" />
                  <span className="font-medium">PCI DSS Compliant</span>
                </div>
                <p className="text-green-700 text-sm mt-1">
                  All credit card payments are processed securely and are PCI DSS compliant.
                </p>
              </div>

              <Separator />

              <div className="flex justify-end">
                <Button 
                  onClick={() => handleSaveConfig('creditcard')}
                  disabled={isSaving}
                  className="flex items-center space-x-2"
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  <span>{isSaving ? 'Saving...' : 'Save Credit Card Settings'}</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </SettingsLayout>
  );
};

export default PaymentSetting;
