import { useMemo, useState } from "react";
import { Badge } from "@rentify/shared/ui/badge";
import { Button } from "@rentify/shared/ui/button";
import { KpiCard } from "../components/KpiCard";
import { LoadingState } from "../components/LoadingState";
import { ErrorState } from "../components/ErrorState";
import { EmptyState } from "../components/EmptyState";
import { useWebsiteId } from "../hooks/useWebsiteId";
import { useGetOutcomeSummaryQuery } from "../../../../services/opsApi";

const rangeOptions = [
  { label: "Last 7 days", value: 7 },
  { label: "Last 30 days", value: 30 },
];

const getRangeDates = (days: number) => {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - days);
  return { from: from.toISOString(), to: to.toISOString() };
};

const getHealthBadge = (onTimeRate: number, overdueRate: number) => {
  if (onTimeRate >= 0.7 && overdueRate < 0.1) {
    return { label: "Good", variant: "secondary" as const };
  }
  if (onTimeRate < 0.4 || overdueRate >= 0.2) {
    return { label: "Critical", variant: "destructive" as const };
  }
  return { label: "At risk", variant: "outline" as const };
};

export const DashboardPage = () => {
  const { websiteId, isLoading: websiteLoading } = useWebsiteId();
  const [rangeDays, setRangeDays] = useState(7);
  const range = useMemo(() => getRangeDates(rangeDays), [rangeDays]);

  const { data, isLoading, error, refetch } = useGetOutcomeSummaryQuery({
    websiteId,
    from: range.from,
    to: range.to,
  });

  if (websiteLoading) return <LoadingState />;
  if (!websiteId) {
    return (
      <EmptyState
        title="No store selected"
        description="Select or create a store to see RaaS outcomes."
      />
    );
  }

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;
  if (!data) return null;

  const summary = data.data;
  const health = getHealthBadge(summary.onTimeRate, summary.overdueRate);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">RaaS Performance</div>
          <div className="text-xs text-muted-foreground">
            Track on-time payments and reminder effectiveness.
          </div>
        </div>
        <div className="flex items-center gap-2">
          {rangeOptions.map((option) => (
            <Button
              key={option.value}
              variant={rangeDays === option.value ? "default" : "outline"}
              size="sm"
              onClick={() => setRangeDays(option.value)}
            >
              {option.label}
            </Button>
          ))}
          <Badge variant={health.variant}>{health.label}</Badge>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard
          label="On-time rate"
          value={`${Math.round(summary.onTimeRate * 100)}%`}
        />
        <KpiCard label="Paid on time" value={summary.paidOnTime} />
        <KpiCard label="Overdue unpaid" value={summary.overdueUnpaid} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <KpiCard label="Total invoices" value={summary.totalInvoices} />
        <KpiCard label="Reminders sent" value={summary.reminderEffectiveness.totalRemindersSent} />
        <KpiCard
          label="Reminder effectiveness"
          value={`${Math.round(summary.reminderEffectiveness.rate * 100)}%`}
        />
      </div>
    </div>
  );
};

export default DashboardPage;
