import { useMemo, useState } from "react";
import { Button } from "@rentify/shared/ui/button";
import { AtRiskTable } from "../components/AtRiskTable";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { useWebsiteId } from "../hooks/useWebsiteId";
import { useGetAtRiskInvoicesQuery } from "../../../../services/opsApi";

const dueSoonOptions = [3, 5, 7];

export const AtRiskPage = () => {
  const { websiteId, isLoading: websiteLoading } = useWebsiteId();
  const [dueSoonDays, setDueSoonDays] = useState(3);

  const { data, isLoading, error, refetch } = useGetAtRiskInvoicesQuery({
    websiteId,
    dueSoonDays,
  });

  const overdue = useMemo(() => data?.data.overdue || [], [data]);
  const dueSoon = useMemo(() => data?.data.dueSoon || [], [data]);

  if (websiteLoading) return <LoadingState />;
  if (!websiteId) {
    return (
      <EmptyState
        title="No store selected"
        description="Select or create a store to see at-risk invoices."
      />
    );
  }
  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  if (!overdue.length && !dueSoon.length) {
    return (
      <EmptyState
        title="No at-risk invoices"
        description="All invoices are on track."
      />
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">At-risk invoices</div>
          <div className="text-xs text-muted-foreground">
            Focus on invoices that need attention.
          </div>
        </div>
        <div className="flex items-center gap-2">
          {dueSoonOptions.map((option) => (
            <Button
              key={option}
              variant={dueSoonDays === option ? "default" : "outline"}
              size="sm"
              onClick={() => setDueSoonDays(option)}
            >
              Due in {option} days
            </Button>
          ))}
        </div>
      </div>

      <AtRiskTable title="Overdue" rows={overdue} />
      <AtRiskTable title="Due soon" rows={dueSoon} />
    </div>
  );
};

export default AtRiskPage;
