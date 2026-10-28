import React, { useEffect, useState } from 'react';
import { CreditCard } from 'lucide-react';
import { useTranslation } from '@rentify/utils';
import { RENTIFY_API_BASE } from '@rentify/shared/config/urls';
import { Card, CardContent, CardHeader, CardTitle } from '@rentify/shared/ui/card';
import { Button } from '@rentify/shared/ui/button';
import { SettingsLayout } from '../../layouts/setting/SettingsLayout';

type Entitlements = { displayName: string; lifecycleState: string; isTrial: boolean; isGracePeriod: boolean;
  isSuspended: boolean; mutationsAllowed: boolean; capabilities: Record<string, boolean | number>;
  dates: { trialEndsAt: string | null; gracePeriodEndsAt: string | null; historicalAccessEndsAt: string | null } };
type PlanPayment = { id: string; currency: string; amountMinor: number | null; status: string; createdAt: string };
const copy = {
  en: { title: 'Billing & plans', description: 'Your current plan and access', loading: 'Loading your plan…',
    error: 'Your plan could not be loaded.', retry: 'Try again', current: 'Current plan', status: 'Status',
    trialEnd: 'Trial ends', daysLeft: 'days remaining', graceEnd: 'Grace period ends', historyEnd: 'Historical access ends',
    grace: 'Your account is in a grace period. Some changes may be restricted.',
    suspended: 'Your subscription is suspended. Check your available historical access below.',
    capabilities: 'Your entitlements', enabled: 'Available', disabled: 'Not available', mutations: 'Changes allowed',
    history: 'Payment history', historyEmpty: 'No plan payments yet.', historyUnavailable: 'Payment history could not be loaded.', amountUnavailable: 'Amount unavailable',
    actions: 'Plan changes', actionsUnavailable: 'Online plan changes and cancellation are not available yet. Contact support for help.' },
  km: { title: 'វិក្កយបត្រ និងគម្រោង', description: 'គម្រោង និងសិទ្ធិប្រើប្រាស់បច្ចុប្បន្ន', loading: 'កំពុងផ្ទុកគម្រោង…',
    error: 'មិនអាចផ្ទុកគម្រោងបានទេ។', retry: 'ព្យាយាមម្ដងទៀត', current: 'គម្រោងបច្ចុប្បន្ន', status: 'ស្ថានភាព',
    trialEnd: 'ថ្ងៃបញ្ចប់សាកល្បង', daysLeft: 'ថ្ងៃនៅសល់', graceEnd: 'ថ្ងៃបញ្ចប់រយៈពេលអនុគ្រោះ', historyEnd: 'ថ្ងៃបញ្ចប់ការមើលប្រវត្តិ',
    grace: 'គណនីរបស់អ្នកស្ថិតក្នុងរយៈពេលអនុគ្រោះ។ ការផ្លាស់ប្ដូរខ្លះអាចត្រូវបានកំណត់។',
    suspended: 'ការជាវរបស់អ្នកត្រូវបានផ្អាក។ សូមពិនិត្យសិទ្ធិមើលប្រវត្តិខាងក្រោម។',
    capabilities: 'សិទ្ធិប្រើប្រាស់', enabled: 'អាចប្រើបាន', disabled: 'មិនអាចប្រើបាន', mutations: 'អាចផ្លាស់ប្ដូរ',
    history: 'ប្រវត្តិការទូទាត់', historyEmpty: 'មិនទាន់មានការទូទាត់គម្រោងទេ។', historyUnavailable: 'មិនអាចផ្ទុកប្រវត្តិការទូទាត់បានទេ។', amountUnavailable: 'មិនមានចំនួនទឹកប្រាក់',
    actions: 'ការផ្លាស់ប្ដូរគម្រោង', actionsUnavailable: 'ការផ្លាស់ប្ដូរ និងបោះបង់គម្រោងតាមអ៊ីនធឺណិតមិនទាន់មានទេ។ សូមទាក់ទងជំនួយ។' },
};
const capabilityLabels: Record<string, [string, string]> = {
  marketplaceListing: ['Marketplace listing', 'បង្ហាញក្នុងផ្សាររួម'], website: ['Storefront', 'ហាងអនឡាញ'],
  productLimit: ['Product limit', 'ចំនួនផលិតផលអតិបរមា'], staffLimit: ['Staff limit', 'ចំនួនបុគ្គលិកអតិបរមា'],
  pos: ['Point of sale', 'ចំណុចលក់'], invoices: ['Invoices', 'វិក្កយបត្រ'],
  customDomainBrowse: ['Custom domain', 'ដែនផ្ទាល់ខ្លួន'], hostedCheckout: ['Storefront checkout', 'ការទូទាត់តាមហាង'],
  historicalOrderRead: ['Historical order access', 'ការមើលប្រវត្តិការបញ្ជាទិញ'],
};
const statusLabels: Record<string, [string, string]> = {
  trial: ['Trial', 'សាកល្បង'], active: ['Active', 'សកម្ម'], grace_period: ['Grace period', 'រយៈពេលអនុគ្រោះ'],
  suspended: ['Suspended', 'បានផ្អាក'], cancelled: ['Cancelled', 'បានបោះបង់'], pending: ['Pending', 'កំពុងរង់ចាំ'],
  completed: ['Completed', 'បានបញ្ចប់'], failed: ['Failed', 'បរាជ័យ'], expired: ['Expired', 'ផុតកំណត់'],
};
export const BillingSetting = () => {
  const { language } = useTranslation() as { language?: string }; const locale = language === 'kh' ? 'km' : 'en'; const text = copy[locale];
  const [entitlements, setEntitlements] = useState<Entitlements | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState(false);
  const [payments, setPayments] = useState<PlanPayment[] | null>(null); const [paymentError, setPaymentError] = useState(false);
  const load = async () => {
    setLoading(true); setError(false); const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 10000);
    try { const response = await fetch(`${RENTIFY_API_BASE}/api/stores/mine/entitlements`, { credentials: 'include', signal: controller.signal });
      if (!response.ok) throw new Error('Entitlements unavailable'); const result = await response.json(); setEntitlements(result.data);
    } catch { setError(true); } finally { clearTimeout(timer); setLoading(false); }
  };
  const loadPayments = async () => {
    setPaymentError(false); const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 10000);
    try { const response = await fetch(`${RENTIFY_API_BASE}/api/payment/history`, { credentials: 'include', signal: controller.signal });
      if (!response.ok) throw new Error('Payment history unavailable'); const result = await response.json(); setPayments(result.data);
    } catch { setPaymentError(true); } finally { clearTimeout(timer); }
  };
  useEffect(() => { load(); loadPayments(); }, []);
  const date = (value: string | null) => value ? new Date(value).toLocaleDateString(locale === 'km' ? 'km-KH' : 'en-US') : null;
  const status = (value: string) => statusLabels[value]?.[locale === 'km' ? 1 : 0] || value;
  return <SettingsLayout title={text.title} description={text.description} icon={<CreditCard />}>
    {loading && <p role="status">{text.loading}</p>}
    {error && <div role="alert">{text.error} <Button variant="link" onClick={load}>{text.retry}</Button></div>}
    {entitlements && <>
      {entitlements.isGracePeriod && <p role="status" className="rounded border border-amber-400 bg-amber-50 p-4 text-amber-900">{text.grace}</p>}
      {entitlements.isSuspended && <p role="status" className="rounded border border-red-400 bg-red-50 p-4 text-red-900">{text.suspended}</p>}
      <Card><CardHeader><CardTitle>{text.current}</CardTitle></CardHeader><CardContent className="space-y-2">
        <p className="font-semibold">{entitlements.displayName}</p><p>{text.status}: {status(entitlements.lifecycleState)}</p>
        {entitlements.dates.trialEndsAt && <p>{text.trialEnd}: {date(entitlements.dates.trialEndsAt)}
          {entitlements.isTrial && ` (${Math.max(0, Math.ceil((new Date(entitlements.dates.trialEndsAt).getTime() - Date.now()) / 86400000))} ${text.daysLeft})`}</p>}
        {entitlements.dates.gracePeriodEndsAt && <p>{text.graceEnd}: {date(entitlements.dates.gracePeriodEndsAt)}</p>}
        {entitlements.dates.historicalAccessEndsAt && <p>{text.historyEnd}: {date(entitlements.dates.historicalAccessEndsAt)}</p>}
      </CardContent></Card>
      <Card><CardHeader><CardTitle>{text.capabilities}</CardTitle></CardHeader><CardContent>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Object.entries(entitlements.capabilities).map(([key, value]) => <div key={key} className="rounded border p-3">
            <dt className="text-sm text-muted-foreground">{capabilityLabels[key]?.[locale === 'km' ? 1 : 0] || key}</dt>
            <dd className="font-semibold">{typeof value === 'boolean' ? value ? text.enabled : text.disabled : value}</dd>
          </div>)}
        </dl><p className="mt-3 text-sm">{text.mutations}: {entitlements.mutationsAllowed ? text.enabled : text.disabled}</p>
      </CardContent></Card>
    </>}
    <Card><CardHeader><CardTitle>{text.history}</CardTitle></CardHeader><CardContent aria-live="polite">
      {paymentError ? <p role="alert">{text.historyUnavailable} <Button variant="link" onClick={loadPayments}>{text.retry}</Button></p>
        : payments === null ? <p>{text.loading}</p> : payments.length === 0 ? <p>{text.historyEmpty}</p>
          : <ul className="space-y-2">{payments.map((payment) => <li key={payment.id} className="flex flex-wrap justify-between gap-2 rounded border p-3 text-sm">
            <span>{date(payment.createdAt)} · {status(payment.status)}</span><span>{payment.amountMinor === null ? text.amountUnavailable
              : new Intl.NumberFormat(locale === 'km' ? 'km-KH' : 'en-US', { style: 'currency', currency: payment.currency }).format(payment.amountMinor / (payment.currency === 'USD' ? 100 : 1))}</span>
          </li>)}</ul>}
    </CardContent></Card>
    <Card><CardHeader><CardTitle>{text.actions}</CardTitle></CardHeader><CardContent><p>{text.actionsUnavailable}</p></CardContent></Card>
  </SettingsLayout>;
};
export default BillingSetting;
