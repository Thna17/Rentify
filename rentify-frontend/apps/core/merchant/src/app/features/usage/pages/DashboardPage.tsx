import { useMemo, useState } from "react";
import { Button } from "@rentify/shared/ui/button";
import { KpiCard } from "../components/KpiCard";
import { LoadingState } from "../components/LoadingState";
import { ErrorState } from "../components/ErrorState";
import { EmptyState } from "../components/EmptyState";
import { useWebsiteId } from "../hooks/useWebsiteId";
import { useGetUsageSummaryQuery } from "../../../../services/usageApi";

const ranges = [
  { label: "Last 7 days", value: 7 },
  { label: "Last 30 days", value: 30 },
];

export const DashboardPage = () => {
  const { websiteId, isLoading: websiteLoading } = useWebsiteId();
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
      <EmptyState
        title="No store selected"
        description="Select or create a store to see usage data."
      />
    );
  }
  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  return (
    <div className="p-6 space-y-6">
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
