import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@rentify/shared/ui/button";
import { Card, CardContent } from "@rentify/shared/ui/card";
import { Badge } from "@rentify/shared/ui/badge";
import { Check, Sparkles, Store } from "lucide-react";
import { useChannels } from "../../../../context/ChannelContext";
import { KpiCard } from "../components/KpiCard";
import { LoadingState } from "../components/LoadingState";
import { ErrorState } from "../components/ErrorState";
import { UsageTabs } from "../components/UsageTabs";
import { useWebsiteId } from "../hooks/useWebsiteId";
import { useGetUsageSummaryQuery } from "../../../../services/usageApi";
import { useTranslation } from '@rentify/utils';

const ranges = [
  { label: "Last 7 days", value: 7 },
  { label: "Last 30 days", value: 30 },
];

export const DashboardPage = () => {
  const { t } = useTranslation();
  const { websiteId, isLoading: websiteLoading } = useWebsiteId();
  const { store, hasStorefront } = useChannels();
  const [rangeDays, setRangeDays] = useState(7);

  const { data, isLoading, error, refetch } = useGetUsageSummaryQuery({
    websiteId,
    rangeDays,
  });

  const breakdown = useMemo(() => data?.data.breakdown || {}, [data]);
  const orders = breakdown.ORDER_PAID?.count || 0;
  const invoices = breakdown.INVOICE_PAID?.count || 0;
  const views = breakdown.STORE_VIEW?.count || 0;
  const totalCost = data?.data.totalCost || 0;

  if (websiteLoading) return <LoadingState />;
  if (!websiteId) {
    return (
      <div className="p-6 space-y-6">
        <UsageTabs />
        {/* The Free-plan banner only describes stores that are on it */}
        {!hasStorefront && (
        <Card className="border-blue-100 bg-gradient-to-r from-blue-50/80 to-indigo-50/80">
          <CardContent className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5">
                <Store className="h-5 w-5 text-blue-600" />
                <span className="text-lg font-bold text-slate-900">
                  {store?.name || "Your Store"} — Free Plan ($0/mo)
                </span>
                <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                  {t('merchant.p2.activeFreeForever')}
                </Badge>
              </div>
              <p className="text-sm text-slate-600">
                {t('merchant.p2.includesYourStoreOne')}
              </p>
            </div>
            <Button asChild className="h-11 w-full sm:h-9 sm:w-auto">
              <Link to="/settings/billing">
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                {t('merchant.p2.seePlans')}
              </Link>
            </Button>
          </CardContent>
        </Card>
        )}

        <div className="grid gap-4 md:grid-cols-4">
          <KpiCard label={t('merchant.p.currentPlan')} value="Free ($0/mo)" />
          <KpiCard label={t('merchant.p2.marketplaceChannel')} value="Included" />
          <KpiCard label={t('merchant.p2.subscriptionDue')} value="$0.00" />
          <KpiCard label={t('merchant.p2.commission')} value="Marketplace orders only" />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-slate-200">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900">{t('merchant.p2.starterPlan5Mo')}</h3>
                  <p className="text-xs text-slate-500">{t('merchant.p2.whoItSFor')}</p>
                </div>
                <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">14-day free trial</Badge>
              </div>
              <ul className="space-y-1.5 text-xs text-slate-600">
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-600" />{t('merchant.p2.ownStorefrontSubdomainTemplates')}</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-600" />{t('merchant.p2.posAtTheCounter')}</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-600" />{t('merchant.p2.storeMarketplaceCatalogSynced')}</li>
              </ul>
              <Button asChild className="h-11 w-full sm:h-9">
                <a href="/settings/billing">
                  {t('merchant.p2.getStarter14Day')}
                </a>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900">{t('merchant.p2.proPlan10Mo')}</h3>
                  <p className="text-xs text-slate-500">{t('merchant.p2.whoItSFor2')}</p>
                </div>
                <Badge variant="outline">14-day free trial</Badge>
              </div>
              <ul className="space-y-1.5 text-xs text-slate-600">
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-600" />{t('merchant.p2.everythingInStarterStorefront')}</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-600" />{t('merchant.p2.customDomainUpTo')}</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-600" />{t('merchant.p2.advancedAnalyticsMarketingTools')}</li>
              </ul>
              <Button asChild variant="outline" className="h-11 w-full sm:h-9">
                <a href="/settings/billing">
                  {t('merchant.p2.getPro')}
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  return (
    <div className="p-6 space-y-6">
      <UsageTabs />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">{t('merchant.p2.usageDashboard')}</div>
          <div className="text-xs text-muted-foreground">
            {t('merchant.p2.youPayOnlyWhen')}
          </div>
        </div>
        <div className="flex gap-2">
          {ranges.map((range) => (
            <Button
              key={range.value}
              size="sm"
              variant={rangeDays === range.value ? "default" : "outline"}
              onClick={() => setRangeDays(range.value)}
            >
              {range.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard label={t('merchant.p2.paidOrders')} value={orders} />
        <KpiCard label={t('merchant.p2.paidInvoices')} value={invoices} />
        <KpiCard label={t('merchant.p2.storeViews')} value={views} />
        <KpiCard label={t('merchant.p2.costSoFar')} value={`$${totalCost.toFixed(2)}`} />
      </div>
    </div>
  );
};

export default DashboardPage;
