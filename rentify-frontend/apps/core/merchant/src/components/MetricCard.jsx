import { Card, CardContent } from "@rentify/shared/ui/card";
import { Badge } from "@rentify/shared/ui/badge";
import { Skeleton } from "@rentify/shared/ui/skeleton";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@rentify/utils";

export const MetricCard = ({ 
  icon, 
  title, 
  value, 
  trend, 
  color, 
  tooltip, 
  loading 
}) => {
  const getColorClasses = (colorVariant) => {
    const colorMap = {
      primary: 'bg-primary text-primary-foreground',
      secondary: 'bg-secondary text-secondary-foreground',
      success: 'bg-success text-success-foreground',
      warning: 'bg-warning text-warning-foreground',
      error: 'bg-error text-error-foreground',
    };
    return colorMap[colorVariant] || colorMap.primary;
  };

  const getTrendColor = (trendValue) => {
    if (!trendValue) return '';
    return trendValue >= 0 ? 'text-success bg-success/10' : 'text-error bg-error/10';
  };

  if (loading) {
    return (
      <Card className="metric-card p-6">
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
    <Card className="metric-card p-6 group cursor-pointer" title={tooltip}>
      <CardContent className="p-0">
        <div className="flex items-center space-x-4">
          <div className={cn("metric-icon", getColorClasses(color))}>
            {icon}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="text-2xl font-bold text-card-foreground mb-1">
              {value}
            </div>
            <div className="text-sm text-muted-foreground truncate">
              {title}
            </div>
          </div>
          
          {trend !== undefined && (
            <Badge 
              variant="secondary" 
              className={cn("flex items-center gap-1 text-xs font-medium", getTrendColor(trend))}
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