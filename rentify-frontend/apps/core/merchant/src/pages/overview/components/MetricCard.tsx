import { Card, CardContent } from "@rentify/shared/ui/card";
import { Badge } from "@rentify/shared/ui/badge";
import { Skeleton } from "@rentify/shared/ui/skeleton";
import { TrendingUp, TrendingDown } from "lucide-react";
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

export const MetricCard = ({ 
  icon, 
  title, 
  value, 
  trend, 
  color, 
  tooltip, 
  loading 
}: MetricCardProps) => {
  const getColorClasses = (colorVariant: string) => {
    const colorMap = {
      primary: 'bg-primary text-primary-foreground',
      secondary: 'bg-secondary text-secondary-foreground',
      success: 'bg-success text-success-foreground',
      warning: 'bg-warning text-warning-foreground',
      destructive: 'bg-destructive text-destructive-foreground',
      info: 'bg-info text-info-foreground',
    };
    return colorMap[colorVariant as keyof typeof colorMap] || colorMap.primary;
  };

  const getTrendColor = (trendValue?: number) => {
    if (trendValue === undefined) return '';
    return trendValue >= 0 
      ? 'text-success bg-success/10 border border-success/20' 
      : 'text-destructive bg-destructive/10 border border-destructive/20';
  };

  if (loading) {
    return (
      <Card className="p-4 md:p-6 border border-border rounded-lg shadow-sm hover:shadow-md transition-shadow bg-background">
        <CardContent className="p-0">
          <div className="flex items-center space-x-4">
            <Skeleton className="w-12 h-12 rounded-xl" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-6 w-12 rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className="p-4 md:p-6 border border-border rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer group bg-background" 
      title={tooltip}
    >
      <CardContent className="p-0">
        <div className="flex items-center space-x-4">
          <div className={cn(
            "flex items-center justify-center w-12 h-12 rounded-xl transition-colors group-hover:opacity-90",
            getColorClasses(color)
          )}>
            {icon}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="text-2xl font-bold text-foreground mb-1 truncate">
              {value}
            </div>
            <div className="text-sm text-muted-foreground truncate">
              {title}
            </div>
          </div>
          
          {trend !== undefined && (
            <Badge 
              className={cn(
                "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
                getTrendColor(trend)
              )}
            >
              {trend >= 0 ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {Math.abs(trend)}%
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
};