import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@rentify/shared/ui/button";
import { Card, CardContent } from "@rentify/shared/ui/card";
import { Badge } from "@rentify/shared/ui/badge";
import { Check, Sparkles, Store } from "lucide-react";
import { MARKETING_URL } from "@rentify/shared/config/urls";
import { useChannels } from "../../../../context/ChannelContext";
import { KpiCard } from "../components/KpiCard";
import { LoadingState } from "../components/LoadingState";
import { ErrorState } from "../components/ErrorState";
import { UsageTabs } from "../components/UsageTabs";
import { useWebsiteId } from "../hooks/useWebsiteId";
import { useGetUsageSummaryQuery } from "../../../../services/usageApi";

const ranges = [
  { label: "Last 7 days", value: 7 },
  { label: "Last 30 days", value: 30 },
];

export const DashboardPage = () => {
  const { websiteId, isLoading: websiteLoading } = useWebsiteId();
  const { store } = useChannels();
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
        <Card className="border-blue-100 bg-gradient-to-r from-blue-50/80 to-indigo-50/80">
          <CardContent className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5">
                <Store className="h-5 w-5 text-blue-600" />
                <span className="text-lg font-bold text-slate-900">
                  {store?.name || "Your Store"} — Free Plan ($0/mo)
                </span>
                <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                  Active • Free Forever
                </Badge>
              </div>
              <p className="text-sm text-slate-600">
                Includes your Store, one unified catalog, and selling on Rentify Marketplace. Commission applies only on marketplace orders.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <Link to="/settings/billing">Compare All Plans</Link>
              </Button>
              <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                <a href={`${MARKETING_URL}/onboarding/starter?step=template`}>
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  Start 14-Day Free Trial (Starter ≈$5/mo)
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-4">
          <KpiCard label="Current Plan" value="Free ($0/mo)" />
          <KpiCard label="Marketplace Channel" value="Included" />
          <KpiCard label="Subscription Due" value="$0.00" />
          <KpiCard label="Commission" value="Marketplace orders only" />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-slate-200">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900">Starter Plan (≈$5/mo)</h3>
                  <p className="text-xs text-slate-500">Who it’s for: Shop with a counter or brand</p>
                </div>
                <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">14-day free trial</Badge>
              </div>
              <ul className="space-y-1.5 text-xs text-slate-600">
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-600" />Own storefront (subdomain + templates)</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-600" />POS at the counter</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-600" />Store & Marketplace catalog synced automatically</li>
              </ul>
              <Button asChild size="sm" className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                <a href={`${MARKETING_URL}/onboarding/starter?step=template`}>
                  Unlock Storefront + POS (14-Day Free Trial)
                </a>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900">Pro Plan (≈$10/mo)</h3>
                  <p className="text-xs text-slate-500">Who it’s for: Growing shop</p>
                </div>
                <Badge variant="outline">14-day free trial</Badge>
              </div>
              <ul className="space-y-1.5 text-xs text-slate-600">
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-600" />Everything in Starter (Storefront + POS + Marketplace)</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-600" />Custom domain & up to 15 staff accounts</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-600" />Advanced analytics & marketing tools</li>
              </ul>
              <Button asChild variant="outline" size="sm" className="w-full">
                <a href={`${MARKETING_URL}/onboarding/pro?step=template`}>
                  Start Pro 14-Day Free Trial
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
          <div className="text-lg font-semibold">Usage Dashboard</div>
          <div className="text-xs text-muted-foreground">
            You pay only when these events happen.
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
        <KpiCard label="Paid orders" value={orders} />
        <KpiCard label="Paid invoices" value={invoices} />
        <KpiCard label="Store views" value={views} />
        <KpiCard label="Cost so far" value={`$${totalCost.toFixed(2)}`} />
      </div>
    </div>
  );
};

export default DashboardPage;
