import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@rentify/shared/ui/card';
import { Button } from '@rentify/shared/ui/button';
import { Badge } from '@rentify/shared/ui/badge';
import {
  CreditCard,
  Plus,
  Receipt,
  Calendar,
  CheckCircle2,
  Trash2,
  Edit,
  Check,
  Minus,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { SettingsLayout } from '../../layouts/setting/SettingsLayout';
import { useChannels } from '../../context/ChannelContext';
import { MARKETING_URL, RENTIFY_API_BASE } from '@rentify/shared/config/urls';
import { useGetPackagesQuery } from '@rentify/apis';
import { useTranslation } from '@rentify/utils';

type PlanPayment = { id: string; currency: string; amountMinor: number | null; status: string; createdAt: string };
const PAYMENT_STATUS: Record<string, string> = {
  pending: 'Pending', completed: 'Completed', failed: 'Failed', expired: 'Expired', cancelled: 'Cancelled',
};
const formatPaymentAmount = (payment: PlanPayment) =>
  payment.amountMinor === null
    ? 'Amount unavailable'
    : new Intl.NumberFormat('en-US', { style: 'currency', currency: payment.currency })
        .format(payment.amountMinor / (payment.currency === 'USD' ? 100 : 1));

const PLAN_TIERS = [
  {
    key: 'free_pilot',
    name: 'Free Pilot',
    priceLabel: '$0/mo',
    trial: '6-Month Pilot',
    whoItsFor: 'Marketplace-only seller, social seller',
    commission: 'Only on marketplace orders',
    productLimit: 25,
    staffLimit: 1,
    features: [
      { label: 'Store and one canonical catalog', included: true },
      { label: 'Sell on Rentify Marketplace (25 products)', included: true },
      { label: '1 Staff user account', included: true },
      { label: 'Counter POS & manual receipts', included: true },
      { label: 'Own storefront (subdomain + templates)', included: false },
      { label: 'Custom domain browse', included: false },
    ],
  },
  {
    key: 'starter',
    name: 'Starter Storefront',
    priceLabel: '$15/mo',
    trial: '14-Day Free Trial',
    whoItsFor: 'Shop with a brand or storefront counter',
    commission: 'Only on marketplace orders',
    recommended: true,
    productLimit: 100,
    staffLimit: 2,
    features: [
      { label: 'Store and one canonical catalog', included: true },
      { label: 'Sell on Rentify Marketplace (100 products)', included: true },
      { label: 'Own storefront (*.rentifystore.shop)', included: true },
      { label: '2 Staff user accounts', included: true },
      { label: 'Counter POS & customer invoices', included: true },
      { label: 'Custom domain browse', included: false },
    ],
  },
  {
    key: 'business',
    name: 'Business Storefront',
    priceLabel: '$35/mo',
    trial: '14-Day Free Trial',
    whoItsFor: 'Growing store with custom domain and team',
    commission: 'Only on marketplace orders',
    productLimit: 500,
    staffLimit: 5,
    features: [
      { label: 'Store and one canonical catalog', included: true },
      { label: 'Sell on Rentify Marketplace (500 products)', included: true },
      { label: 'Own storefront (*.rentifystore.shop)', included: true },
      { label: '5 Staff user accounts', included: true },
      { label: 'Counter POS & customer invoices', included: true },
      { label: 'Custom domain browse', included: true },
    ],
  },
];

export const BillingSetting = () => {
  const { t } = useTranslation();
  const { hasStorefront } = useChannels();
  const [entitlements, setEntitlements] = useState<any>(null);

  useEffect(() => {
    fetch(`${RENTIFY_API_BASE}/api/stores/mine/entitlements`, { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((res) => {
        if (res?.data) setEntitlements(res.data);
      })
      .catch((err) => {
        console.warn('Failed to load store entitlements', err);
      });
  }, []);

  // Name, price and trial come from Core's packages; the tier list only adds copy.
  const { data: packageList } = useGetPackagesQuery(undefined);
  const packages: any[] = Array.isArray(packageList) ? packageList : (packageList as any)?.data || [];
  const PACKAGE_FOR_TIER: Record<string, (pkg: any) => boolean> = {
    free_pilot: (pkg) => Number(pkg.price) === 0,
    starter: (pkg) => String(pkg.name).toLowerCase() === 'starter',
    business: (pkg) => String(pkg.name).toLowerCase() === 'pro',
  };
  const limitsOf = (pkg: any) => {
    if (!pkg?.limits) return {};
    if (typeof pkg.limits !== 'string') return pkg.limits;
    try { return JSON.parse(pkg.limits); } catch { return {}; }
  };
  const tiers = PLAN_TIERS.map((tier) => {
    const pkg = packages.find(PACKAGE_FOR_TIER[tier.key] || (() => false));
    if (!pkg) return tier;
    const trialDays = Number(limitsOf(pkg).trialDays) || 0;
    return {
      ...tier,
      name: pkg.name,
      onboardingKey: String(pkg.name).toLowerCase(),
      priceLabel: `$${Number(pkg.price).toFixed(Number(pkg.price) % 1 ? 2 : 0)}/mo`,
      trial: trialDays ? `${trialDays}-day free trial` : Number(pkg.price) > 0 ? 'Paid by KHQR' : 'Free',
      hasTrial: trialDays > 0,
    };
  });

  const activeTierKey = entitlements?.tier || (hasStorefront ? 'starter' : 'free_pilot');
  const currentTier = tiers.find((p) => p.key === activeTierKey) || tiers[0];
  const isGracePeriod = entitlements?.isGracePeriod;
  const isSuspended = entitlements?.isSuspended;
  const isTrial = entitlements?.isTrial;

  const [paymentMethods] = useState([
    {
      id: 1,
      type: 'KHQR / ABA PayWay',
      last4: '8899',
      expiry: 'Active',
      isDefault: true,
    },
  ]);

  // Real plan payments from Core (/api/payment/history)
  const [payments, setPayments] = useState<PlanPayment[] | null>(null);
  const [paymentError, setPaymentError] = useState(false);
  const loadPayments = async () => {
    setPaymentError(false);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(`${RENTIFY_API_BASE}/api/payment/history`, { credentials: 'include', signal: controller.signal });
      if (!response.ok) throw new Error('Payment history unavailable');
      setPayments((await response.json()).data);
    } catch {
      setPaymentError(true);
    } finally {
      clearTimeout(timer);
    }
  };
  useEffect(() => { loadPayments(); }, []);

  const addPaymentMethod = () => {
    toast.success(t('merchant.p.redirectingToPaymentMethod'));
  };


  return (
    <SettingsLayout
      title={t('merchant.settings.sections.billing.title')}
      description={t('merchant.settings.sections.billing.body')}
      icon={<CreditCard />}
    >
      {/* Grace / suspended status is shown once, by the dashboard layout banner. */}
      {/* Current Plan */}
      <Card className="shadow-sm border-0">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">{t('merchant.p.currentPlan')}</CardTitle>
          <CardDescription>
            {t('merchant.p.oneUnifiedCatalogAcross')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
            <div>
              <div className="flex items-center space-x-2.5">
                <h3 className="text-xl font-bold text-slate-900">
                  {currentTier.name} Plan ({currentTier.priceLabel})
                </h3>
                <Badge
                  variant="secondary"
                  className={
                    isSuspended
                      ? 'bg-red-100 text-red-800'
                      : isGracePeriod
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }
                >
                  {isSuspended
                    ? 'Suspended (90-Day Read Access)'
                    : isGracePeriod
                    ? 'Grace Period Active'
                    : isTrial
                    ? '14-Day Free Trial'
                    : currentTier.trial || 'Active'}
                </Badge>
              </div>
              <p className="text-slate-600 text-sm mt-1">
                Who it’s for: {currentTier.whoItsFor} • Commission: {currentTier.commission}
              </p>
            </div>
            {!hasStorefront && (
              <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white">
                <a href={`${MARKETING_URL}/onboarding/starter?step=template`}>
                  {t('merchant.p.addOnlineStore14')}
                </a>
              </Button>
            )}
          </div>

          {/* This month usage section (P4, P7) */}
          <div className="mt-6 rounded-xl border border-[var(--rentify-color-border-subtle,#ece8e1)] bg-card p-5 shadow-[var(--shadow-soft)]">
            <h4 className="text-base font-semibold text-foreground">This month</h4>
            <p className="text-xs text-muted-foreground mt-0.5">You pay only when these happen.</p>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
                <span className="text-xs text-muted-foreground">Paid orders</span>
                <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">0</p>
              </div>
              <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
                <span className="text-xs text-muted-foreground">Paid invoices</span>
                <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">0</p>
              </div>
              <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
                <span className="text-xs text-muted-foreground">Cost so far</span>
                <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">$0.00</p>
              </div>
            </div>
          </div>

          {/* 3-Tier Plan Comparison */}
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {tiers.map((plan: any) => {
              const isCurrent = plan.key === activeTierKey;
              return (
                <div
                  key={plan.key}
                  className={`flex flex-col rounded-2xl border p-5 ${
                    plan.recommended
                      ? 'border-blue-600 ring-1 ring-blue-600/20 bg-blue-50/10'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-lg font-bold text-slate-900">{plan.name}</span>
                    {plan.recommended && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700">
                        <Sparkles className="h-3 w-3" />
                        14-day trial
                      </span>
                    )}
                  </div>
                  <div className="mt-2 text-2xl font-extrabold text-slate-900">
                    {plan.priceLabel}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Who it’s for: {plan.whoItsFor}
                  </p>

                  <ul className="mt-4 flex-1 space-y-2.5 border-t pt-4 text-xs">
                    {plan.features.map((feat: any) => (
                      <li
                        key={feat.label}
                        className={`flex items-start gap-2 ${
                          feat.included ? 'text-slate-800 font-medium' : 'text-slate-400'
                        }`}
                      >
                        {feat.included ? (
                          <Check className="h-4 w-4 shrink-0 text-emerald-600" />
                        ) : (
                          <Minus className="h-4 w-4 shrink-0 text-slate-300" />
                        )}
                        <span>{feat.label}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-4 rounded-lg bg-slate-100 px-3 py-2 text-[11px] text-slate-600">
                    <strong>{t('merchant.p.commission')}</strong> {plan.commission}
                  </div>

                  <div className="mt-4">
                    {isCurrent ? (
                      <Button variant="outline" disabled className="w-full text-xs">
                        {t('merchant.p.currentPlan')}
                      </Button>
                    ) : (
                      <Button
                        asChild
                        variant={plan.recommended ? 'default' : 'outline'}
                        className={
                          plan.recommended
                            ? 'w-full bg-blue-600 hover:bg-blue-700 text-white text-xs'
                            : 'w-full text-xs'
                        }
                      >
                        {/* Setup only adds a website to a Store without one; switching an
                            existing website's plan has no self-serve endpoint yet. */}
                        <a href={plan.key === 'free_pilot' ? '#' : hasStorefront ? '/support' : `${MARKETING_URL}/onboarding/${plan.onboardingKey || plan.key}?step=template`}>
                          {plan.key === 'free_pilot'
                            ? 'Included'
                            : hasStorefront
                              ? 'Ask to change plan'
                              : plan.hasTrial ? 'Add online store (free trial)' : 'Add online store'}
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Payment Methods */}
      <Card className="shadow-sm border-0">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold">{t('merchant.p.paymentMethods')}</CardTitle>
              <CardDescription>
                {t('merchant.p.manageYourSavedPayout')}
              </CardDescription>
            </div>
            <Button onClick={addPaymentMethod} className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>{t('merchant.p.addPaymentMethod')}</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {paymentMethods.map((method) => (
              <div
                key={method.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <CreditCard className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <div className="font-medium">
                      {method.type} •••• {method.last4}
                    </div>
                    <div className="text-sm text-gray-500">
                      Status: {method.expiry}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {method.isDefault && (
                    <Badge variant="secondary" className="bg-green-50 text-green-700">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      {t('merchant.p.default')}
                    </Badge>
                  )}
                  <Button variant="ghost" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Billing History */}
      <Card className="shadow-sm border-0">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">{t('merchant.p.billingHistory')}</CardTitle>
          <CardDescription>{t('merchant.p.yourPastPlanPayments')}</CardDescription>
        </CardHeader>
        <CardContent aria-live="polite">
          {paymentError ? (
            <p role="alert" className="text-sm text-gray-500">
              Payment history could not be loaded.{' '}
              <button type="button" className="font-medium text-foreground underline" onClick={loadPayments}>{t('merchant.p.tryAgain')}</button>
            </p>
          ) : payments === null ? (
            <p role="status" className="text-sm text-gray-500">{t('merchant.p.loadingPaymentHistory')}</p>
          ) : payments.length === 0 ? (
            <p className="text-sm text-gray-500">{t('merchant.p.noPlanPaymentsYet')}</p>
          ) : (
          <div className="space-y-3">
            {payments.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <Receipt className="h-4 w-4 text-gray-600" />
                  </div>
                  <div>
                    <div className="font-medium">{formatPaymentAmount(payment)}</div>
                    <div className="text-sm text-gray-500 flex items-center space-x-2">
                      <Calendar className="h-3 w-3" />
                      <span>{new Date(payment.createdAt).toLocaleDateString('en-US')}</span>
                    </div>
                  </div>
                </div>
                <Badge variant="outline" className={payment.status === 'completed' ? 'bg-green-50 text-green-700' : ''}>
                  {PAYMENT_STATUS[payment.status] || payment.status}
                </Badge>
              </div>
            ))}
          </div>
          )}
        </CardContent>
      </Card>
    </SettingsLayout>
  );
};

export default BillingSetting;