import { Card } from "@rentify/shared/ui/card";
import { Skeleton } from "@rentify/shared/ui/skeleton";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@rentify/utils";

interface MetricCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  trend?: number;
  color: 'primary' | 'success' | 'warning' | 'info' | 'destructive' | 'secondary';
  tooltip?: string;
  loading?: boolean;
}

// Soft tinted icon chips; colour is a hint, not a block.
const ICON_TINT: Record<string, string> = {
  primary: 'bg-primary/10 text-primary',
  secondary: 'bg-violet-500/10 text-violet-600',
  success: 'bg-emerald-500/10 text-emerald-600',
  warning: 'bg-amber-500/10 text-amber-600',
  destructive: 'bg-rose-500/10 text-rose-600',
  info: 'bg-sky-500/10 text-sky-600',
};

export const MetricCard = ({ icon, title, value, trend, color, tooltip, loading }: MetricCardProps) => {
  if (loading) {
    return (
      <Card className="gap-0 p-5 bg-card">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 w-9 rounded-xl" />
        </div>
        <Skeleton className="mt-5 h-8 w-28" />
        <Skeleton className="mt-2 h-4 w-16" />
      </Card>
    );
  }

  const up = (trend ?? 0) >= 0;

  return (
    <Card className="lift gap-0 p-5 bg-card" title={tooltip}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-muted-foreground truncate">{title}</span>
        <span
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl [&_svg]:h-[18px] [&_svg]:w-[18px]',
            ICON_TINT[color] || ICON_TINT.primary
          )}
        >
          {icon}
        </span>
      </div>
      <div className="mt-4 text-[28px] leading-none font-semibold tracking-tight text-foreground tabular-nums truncate">
        {value}
      </div>
      {trend !== undefined ? (
        <div className="mt-2.5 flex items-center gap-1.5 text-xs">
          <span
            className={cn(
              'inline-flex items-center gap-0.5 font-semibold',
              up ? 'text-emerald-600' : 'text-rose-600'
            )}
          >
            {up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
            {Math.abs(trend)}%
          </span>
          <span className="text-muted-foreground">vs previous period</span>
        </div>
      ) : (
        <div className="mt-2.5 h-4" />
      )}
    </Card>
  );
};
