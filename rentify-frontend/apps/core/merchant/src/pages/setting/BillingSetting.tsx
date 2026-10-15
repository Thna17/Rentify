import React, { useState } from 'react';
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
  Download,
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
import { MARKETING_URL } from '@rentify/shared/config/urls';

const PLAN_TIERS = [
  {
    key: 'free',
    name: 'Free',
    priceLabel: '$0/mo',
    whoItsFor: 'Facebook seller, new seller',
    commission: 'Only on marketplace orders',
    features: [
      { label: 'Store and one catalog', included: true },
      { label: 'Sell on Rentify Marketplace', included: true },
      { label: 'Own storefront (subdomain + templates)', included: false },
      { label: 'POS at the counter', included: false },
      { label: 'Custom domain, staff accounts, analytics, marketing tools', included: false },
    ],
  },
  {
    key: 'starter',
    name: 'Starter',
    priceLabel: '≈$5/mo',
    trial: '14-day free trial',
    whoItsFor: 'Shop with a counter or brand',
    commission: 'Only on marketplace orders',
    recommended: true,
    features: [
      { label: 'Store and one catalog', included: true },
      { label: 'Sell on Rentify Marketplace', included: true },
      { label: 'Own storefront (subdomain + templates)', included: true },
      { label: 'POS at the counter', included: true },
      { label: 'Custom domain, staff accounts, analytics, marketing tools', included: false },
    ],
  },
  {
    key: 'pro',
    name: 'Pro',
    priceLabel: '≈$10/mo',
    trial: '14-day free trial',
    whoItsFor: 'Growing shop',
    commission: 'Only on marketplace orders',
    features: [
      { label: 'Store and one catalog', included: true },
      { label: 'Sell on Rentify Marketplace', included: true },
      { label: 'Own storefront (subdomain + templates)', included: true },
      { label: 'POS at the counter', included: true },
      { label: 'Custom domain, staff accounts, analytics, marketing tools', included: true },
    ],
  },
];

export const BillingSetting = () => {
  const { hasStorefront } = useChannels();
  const currentTierKey = hasStorefront ? 'starter' : 'free';
  const currentTier = PLAN_TIERS.find((p) => p.key === currentTierKey) || PLAN_TIERS[0];

  const [paymentMethods] = useState([
    {
      id: 1,
      type: 'KHQR / ABA PayWay',
      last4: '8899',
      expiry: 'Active',
      isDefault: true,
    },
  ]);

  const [invoices] = useState([
    {
      id: 'INV-2026-001',
      date: 'Current Cycle',
      amount: hasStorefront ? '$0.00 (14-Day Free Trial)' : '$0.00 (Free Plan)',
      status: 'Active',
    },
  ]);

  const addPaymentMethod = () => {
    toast.success('Redirecting to payment method setup...');
  };

  const downloadInvoice = (invoiceId: string) => {
    toast.success(`Downloading invoice ${invoiceId}...`);
  };

  return (
    <SettingsLayout
      title="Billing & Plans"
      description="Manage your Rentify plan, storefront trial, and billing details"
      icon={<CreditCard />}
    >
      {/* Current Plan */}
      <Card className="shadow-sm border-0">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Current Plan</CardTitle>
          <CardDescription>
            One unified catalog across Marketplace, Storefront, and POS
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
            <div>
              <div className="flex items-center space-x-2.5">
                <h3 className="text-xl font-bold text-slate-900">
                  {currentTier.name} Plan ({currentTier.priceLabel})
                </h3>
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">
                  {currentTier.trial || 'Active'}
                </Badge>
              </div>
              <p className="text-slate-600 text-sm mt-1">
                Who it’s for: {currentTier.whoItsFor} • Commission: {currentTier.commission}
              </p>
            </div>
            {!hasStorefront && (
              <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white">
                <a href={`${MARKETING_URL}/onboarding/starter?step=template`}>
                  Unlock Starter (14-Day Free Trial)
                </a>
              </Button>
            )}
          </div>

          {/* 3-Tier Plan Comparison */}
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {PLAN_TIERS.map((plan) => {
              const isCurrent = plan.key === currentTierKey;
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
                    {plan.features.map((feat) => (
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
                    <strong>Commission:</strong> {plan.commission}
                  </div>

                  <div className="mt-4">
                    {isCurrent ? (
                      <Button variant="outline" disabled className="w-full text-xs">
                        Current Plan
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
                        <a href={`${MARKETING_URL}/onboarding/${plan.key}?step=template`}>
                          {plan.key === 'free' ? 'Included' : `Start 14-Day Free Trial`}
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
              <CardTitle className="text-lg font-semibold">Payment Methods</CardTitle>
              <CardDescription>
                Manage your saved payout and billing methods
              </CardDescription>
            </div>
            <Button onClick={addPaymentMethod} className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>Add Payment Method</span>
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
                      Default
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
          <CardTitle className="text-lg font-semibold">Billing History</CardTitle>
          <CardDescription>View and download your past statements</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <Receipt className="h-4 w-4 text-gray-600" />
                  </div>
                  <div>
                    <div className="font-medium">{invoice.id}</div>
                    <div className="text-sm text-gray-500 flex items-center space-x-2">
                      <Calendar className="h-3 w-3" />
                      <span>{invoice.date}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="font-medium">{invoice.amount}</div>
                    <Badge variant="outline" className="bg-green-50 text-green-700">
                      {invoice.status}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => downloadInvoice(invoice.id)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </SettingsLayout>
  );
};

export default BillingSetting;