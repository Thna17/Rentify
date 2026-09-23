import { Card, CardContent } from "@rentify/shared/ui/card";
import { Badge } from "@rentify/shared/ui/badge";
import { Button } from "@rentify/shared/ui/button";
import type { ContractStatus } from "../types";

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString() : "—";

export const ContractStatusCard = ({
  contract,
  onPause,
  onResume,
  isLoading,
}: {
  contract: ContractStatus;
  onPause: () => void;
  onResume: () => void;
  isLoading?: boolean;
}) => {
  const isPaused = contract.status === "paused";
  return (
    <Card className="border-border shadow-sm">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">Outcome Contract</div>
          <Badge variant={isPaused ? "destructive" : "secondary"}>
            {contract.status}
          </Badge>
        </div>
        <div className="text-xs text-muted-foreground">
          Effective From: {formatDate(contract.effectiveFrom)}
        </div>
        <div className="text-xs text-muted-foreground">
          Effective To: {formatDate(contract.effectiveTo)}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={onPause}
            disabled={isPaused || isLoading}
          >
            Pause
          </Button>
          <Button
            onClick={onResume}
            disabled={!isPaused || isLoading}
          >
            Resume
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
