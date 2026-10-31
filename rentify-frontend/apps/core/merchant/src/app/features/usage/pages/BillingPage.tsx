import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@rentify/shared/ui/card";
import { Badge } from "@rentify/shared/ui/badge";
import { Button } from "@rentify/shared/ui/button";
import { useChannels } from "../../../../context/ChannelContext";
import { LoadingState } from "../components/LoadingState";
import { ErrorState } from "../components/ErrorState";
import { EmptyState } from "../components/EmptyState";
import { UsageTabs } from "../components/UsageTabs";
import { useWebsiteId } from "../hooks/useWebsiteId";
import { useGetBillingSummaryQuery } from "../../../../services/usageApi";

const getMonth = (date = new Date()) => date.toISOString().slice(0, 7);

export const BillingPage = () => {
  const { websiteId, isLoading: websiteLoading } = useWebsiteId();
  const { store, hasStorefront } = useChannels();
  const currentMonth = useMemo(() => getMonth(), []);
  const lastMonth = useMemo(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return getMonth(date);
  }, []);

  const {
    data: current,
    isLoading: loadingCurrent,
    error: errorCurrent,
    refetch: refetchCurrent,
  } = useGetBillingSummaryQuery({ websiteId, month: currentMonth }, { skip: !websiteId });
  const {
    data: previous,
    isLoading: loadingPrevious,
    error: errorPrevious,
    refetch: refetchPrevious,
  } = useGetBillingSummaryQuery({ websiteId, month: lastMonth }, { skip: !websiteId });

  if (websiteLoading) return <LoadingState />;
  if (!websiteId) {
    return (
      <div className="p-6 space-y-6">
        <UsageTabs />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-lg font-semibold">Billing Summary</div>
            <div className="text-xs text-muted-foreground">
              {store?.name || "Your Store"} is currently on the Free Plan ($0/mo).
            </div>
          </div>
          <Button asChild className="h-11 w-full sm:h-9 sm:w-auto">
            <Link to="/settings/billing">See plans</Link>
          </Button>
        </div>

        <Card className="border-border">
          <CardContent className="p-5 space-y-2">
            <div className="text-sm font-semibold">Current month ({currentMonth})</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Free Plan • Store & Marketplace</span>
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">
                Active
              </Badge>
            </div>
            <div className="text-2xl font-semibold text-foreground">$0.00</div>
            <p className="text-xs text-muted-foreground">
              No monthly subscription charge. Commission applies only on marketplace orders.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
  if (loadingCurrent || loadingPrevious) return <LoadingState />;
  if (errorCurrent) return <ErrorState message={errorCurrent} onRetry={refetchCurrent} />;
  if (errorPrevious) return <ErrorState message={errorPrevious} onRetry={refetchPrevious} />;

  if (!current) {
    return (
      <div className="p-6">
        <UsageTabs />
        <EmptyState
          title="No billing data"
          description="Usage events will appear here once activity starts."
        />
      </div>
    );
  }

  const currentData = current.data;
  const previousData = previous?.data;

  return (
    <div className="p-6 space-y-6">
      <UsageTabs />
      <div>
        <div className="text-lg font-semibold">Billing Summary</div>
        <div className="text-xs text-muted-foreground">
          Monthly usage charges based on real activity.
        </div>
      </div>

      <Card className="border-border">
        <CardContent className="p-4 space-y-2">
          <div className="text-sm font-semibold">Current month</div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{currentData.month}</span>
            <Badge variant="secondary">{currentData.status}</Badge>
          </div>
          <div className="text-2xl font-semibold text-foreground">
            ${Number(currentData.totalAmount).toFixed(2)}
          </div>
        </CardContent>
      </Card>

      {previousData ? (
        <Card className="border-border">
          <CardContent className="p-4 space-y-2">
            <div className="text-sm font-semibold">Last month</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{previousData.month}</span>
              <Badge variant="secondary">{previousData.status}</Badge>
            </div>
            <div className="text-xl font-semibold text-foreground">
              ${Number(previousData.totalAmount).toFixed(2)}
            </div>
          </CardContent>
        </Card>
      ) : (
        <EmptyState
          title="No previous bill"
          description="Previous month billing will appear once finalized."
        />
      )}
    </div>
  );
};

export default BillingPage;
