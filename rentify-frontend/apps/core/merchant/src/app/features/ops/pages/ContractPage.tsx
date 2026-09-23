import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@rentify/shared/ui/dialog";
import { Button } from "@rentify/shared/ui/button";
import { ContractStatusCard } from "../components/ContractStatusCard";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { useWebsiteId } from "../hooks/useWebsiteId";
import { useGetRemindersQuery, usePauseContractMutation, useResumeContractMutation } from "../../../../services/opsApi";
import type { ContractStatus } from "../types";

export const ContractPage = () => {
  const { websiteId, isLoading: websiteLoading } = useWebsiteId();
  const { data, isLoading, error, refetch } = useGetRemindersQuery({
    websiteId,
    limit: 1,
    page: 1,
  });

  const contractId = data?.data?.[0]?.contractId || null;
  const [showPause, setShowPause] = useState(false);
  const [showResume, setShowResume] = useState(false);
  const [statusOverride, setStatusOverride] = useState<ContractStatus["status"]>("active");

  const contract: ContractStatus | null = useMemo(() => {
    if (!contractId) return null;
    return {
      id: contractId,
      status: statusOverride,
    };
  }, [contractId, statusOverride]);

  const pauseMutation = usePauseContractMutation(contractId);
  const resumeMutation = useResumeContractMutation(contractId);

  if (websiteLoading) return <LoadingState />;
  if (!websiteId) {
    return (
      <EmptyState
        title="No store selected"
        description="Select or create a store to manage the RaaS contract."
      />
    );
  }

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  if (!contract) {
    return (
      <EmptyState
        title="Contract not found"
        description="No contract has been activated yet. Generate reminders to initialize."
      />
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <div className="text-lg font-semibold">Outcome Contract</div>
        <div className="text-xs text-muted-foreground">
          Pause or resume RaaS automation when needed.
        </div>
      </div>

      <ContractStatusCard
        contract={contract}
        isLoading={pauseMutation.isLoading || resumeMutation.isLoading}
        onPause={() => setShowPause(true)}
        onResume={() => setShowResume(true)}
      />

      <Dialog open={showPause} onOpenChange={setShowPause}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pause contract?</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground">
            This will stop reminder automation until resumed.
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowPause(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                const result = await pauseMutation.mutate();
                if (result) {
                  setStatusOverride("paused");
                  setShowPause(false);
                  refetch();
                }
              }}
            >
              Pause
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showResume} onOpenChange={setShowResume}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resume contract?</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground">
            Automation will restart immediately.
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowResume(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                const result = await resumeMutation.mutate();
                if (result) {
                  setStatusOverride("active");
                  setShowResume(false);
                  refetch();
                }
              }}
            >
              Resume
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContractPage;
