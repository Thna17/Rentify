import { useMemo, useState } from "react";
import { Button } from "@rentify/shared/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@rentify/shared/ui/select";
import { UsageTable } from "../components/UsageTable";
import { LoadingState } from "../components/LoadingState";
import { ErrorState } from "../components/ErrorState";
import { EmptyState } from "../components/EmptyState";
import { useWebsiteId } from "../hooks/useWebsiteId";
import { useGetUsageBreakdownQuery } from "../../../../services/usageApi";

const eventTypes = ["ALL", "ORDER_PAID", "INVOICE_PAID", "STORE_VIEW"];

const getRangeDates = (days: number) => {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - days);
  return { from: from.toISOString(), to: to.toISOString() };
};

export const BreakdownPage = () => {
  const { websiteId, isLoading: websiteLoading } = useWebsiteId();
  const [eventType, setEventType] = useState("ALL");
  const [page, setPage] = useState(1);
  const [rangeDays, setRangeDays] = useState(30);

  const range = useMemo(() => getRangeDates(rangeDays), [rangeDays]);

  const { data, isLoading, error, refetch } = useGetUsageBreakdownQuery({
    websiteId,
    from: range.from,
    to: range.to,
    eventType: eventType === "ALL" ? undefined : eventType,
    page,
    pageSize: 10,
  });

  if (websiteLoading) return <LoadingState />;
  if (!websiteId) {
    return (
      <EmptyState
        title="No store selected"
        description="Select or create a store to see usage breakdown."
      />
    );
  }
  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  const rows = data?.data || [];
  const meta = data?.meta;

  return (
    <div className="p-6 space-y-6">
      <div>
        <div className="text-lg font-semibold">Usage Breakdown</div>
        <div className="text-xs text-muted-foreground">
          Daily usage by event type.
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={eventType} onValueChange={(value) => { setEventType(value); setPage(1); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Event type" />
          </SelectTrigger>
          <SelectContent>
            {eventTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex gap-2">
          {[7, 30].map((days) => (
            <Button
              key={days}
              size="sm"
              variant={rangeDays === days ? "default" : "outline"}
              onClick={() => {
                setRangeDays(days);
                setPage(1);
              }}
            >
              Last {days} days
            </Button>
          ))}
        </div>
      </div>

      <UsageTable rows={rows} />

      {meta && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Page {meta.page} • {meta.total} rows
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
              disabled={meta.page <= 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((prev) => prev + 1)}
              disabled={meta.page * meta.pageSize >= meta.total}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BreakdownPage;
