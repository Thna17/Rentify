import { Button } from "@rentify/shared/ui/button";

export const ErrorState = ({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) => (
  <div className="p-6 text-center space-y-3">
    <div className="text-sm text-destructive">{message}</div>
    {onRetry && (
      <Button variant="outline" onClick={onRetry}>
        Retry
      </Button>
    )}
  </div>
);
