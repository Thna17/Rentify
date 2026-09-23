import { useMemo, useState } from "react";
import { Button } from "@rentify/shared/ui/button";
import { FiltersBar } from "../components/FiltersBar";
import { ReminderTable } from "../components/ReminderTable";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { useWebsiteId } from "../hooks/useWebsiteId";
import { useGetRemindersQuery } from "../../../../services/opsApi";

export const RemindersPage = () => {
  const { websiteId, isLoading: websiteLoading } = useWebsiteId();
  const [status, setStatus] = useState<string | undefined>();
  const [reminderType, setReminderType] = useState<string | undefined>();
  const [page, setPage] = useState(1);

  const { data, isLoading, error, refetch } = useGetRemindersQuery({
    websiteId,
    status,
    reminderType,
    page,
    limit: 10,
  });

  const reminders = useMemo(() => data?.data || [], [data]);
  const meta = data?.meta;

  if (websiteLoading) return <LoadingState />;
  if (!websiteId) {
    return (
      <EmptyState
        title="No store selected"
        description="Select or create a store to review reminders."
      />
    );
  }
  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  return (
    <div className="p-6 space-y-6">
      <div>
        <div className="text-lg font-semibold">Reminder history</div>
        <div className="text-xs text-muted-foreground">
          Monitor reminder status and delivery health.
        </div>
      </div>

      <FiltersBar
        status={status}
        reminderType={reminderType}
        onStatusChange={(value) => {
          setStatus(value);
          setPage(1);
        }}
        onReminderTypeChange={(value) => {
          setReminderType(value);
          setPage(1);
        }}
        onReset={() => {
          setStatus(undefined);
          setReminderType(undefined);
          setPage(1);
        }}
      />

      {reminders.length === 0 ? (
        <EmptyState
          title="No reminders found"
          description="Try adjusting your filters."
        />
      ) : (
        <>
          <ReminderTable rows={reminders} />
          {meta && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Page {meta.page} of {meta.totalPages} • {meta.total} logs
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
                  disabled={meta.page >= meta.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default RemindersPage;
