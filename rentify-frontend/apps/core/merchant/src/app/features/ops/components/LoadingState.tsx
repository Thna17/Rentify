import { Skeleton } from "@rentify/shared/ui/skeleton";

export const LoadingState = () => {
  return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-6 w-48" />
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
};
