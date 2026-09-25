import { Card, CardContent, CardHeader, CardTitle } from "@rentify/shared/ui/card";
import { Button } from "@rentify/shared/ui/button";
import { Progress } from "@rentify/shared/ui/progress";
import { Badge } from "@rentify/shared/ui/badge";
import { Skeleton } from "@rentify/shared/ui/skeleton";
import { HardDrive, ArrowUp, Zap } from "lucide-react";
import { cn } from "@rentify/utils";

export const StorageOverview = ({ storageData, isLoading }) => {
  if (isLoading) {
    return (
      <Card className="chart-container">
        <CardHeader>
          <CardTitle>Storage Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  const { usedMB, totalMB, percentageUsed } = storageData;
  
  const formatStorage = (mb) => {
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(1)} GB`;
    }
    return `${mb} MB`;
  };

  const getStorageStatus = (percentage) => {
    if (percentage >= 90) return { color: 'error', label: 'Critical' };
    if (percentage >= 75) return { color: 'warning', label: 'High' };
    if (percentage >= 50) return { color: 'warning', label: 'Medium' };
    return { color: 'success', label: 'Good' };
  };

  const status = getStorageStatus(percentageUsed);

  return (
    <Card className="chart-container h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-xl font-semibold flex items-center gap-2">
          <HardDrive className="w-5 h-5" />
          Storage Overview
        </CardTitle>
        <Badge 
          variant="outline" 
          className={cn(
            "text-xs",
            status.color === 'success' && "text-success border-success/30 bg-success/5",
            status.color === 'warning' && "text-warning border-warning/30 bg-warning/5",
            status.color === 'error' && "text-error border-error/30 bg-error/5"
          )}
        >
          {status.label}
        </Badge>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col justify-between space-y-6">
        <div className="space-y-4">
          {/* Storage Progress */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-card-foreground">
                Storage Used
              </span>
              <span className="text-sm font-semibold">
                {percentageUsed.toFixed(1)}%
              </span>
            </div>
            
            <Progress 
              value={percentageUsed} 
              className={cn(
                "h-3",
                status.color === 'success' && "[&>div]:bg-success",
                status.color === 'warning' && "[&>div]:bg-warning",
                status.color === 'error' && "[&>div]:bg-error"
              )}
            />
            
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{formatStorage(usedMB)} used</span>
              <span>{formatStorage(totalMB)} total</span>
            </div>
          </div>

          {/* Storage Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-muted/30 text-center">
              <div className="text-lg font-bold text-card-foreground">
                {formatStorage(usedMB)}
              </div>
              <div className="text-xs text-muted-foreground">
                Used Space
              </div>
            </div>
            
            <div className="p-3 rounded-lg bg-muted/30 text-center">
              <div className="text-lg font-bold text-card-foreground">
                {formatStorage(totalMB - usedMB)}
              </div>
              <div className="text-xs text-muted-foreground">
                Available
              </div>
            </div>
          </div>

          {/* Storage Alert */}
          {percentageUsed >= 75 && (
            <div className={cn(
              "p-3 rounded-lg border",
              percentageUsed >= 90 
                ? "bg-error/5 border-error/20 text-error" 
                : "bg-warning/5 border-warning/20 text-warning"
            )}>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {percentageUsed >= 90 ? 'Storage Critical' : 'Storage Running Low'}
                </span>
              </div>
              <p className="text-xs mt-1 opacity-80">
                Consider upgrading your plan soon.
              </p>
            </div>
          )}
        </div>

        {/* Upgrade Button */}
        <Button 
          className="w-full gradient-primary hover:shadow-lg transition-all duration-200"
          size="lg"
        >
          <ArrowUp className="w-4 h-4 mr-2" />
          Upgrade Storage Plan
        </Button>
      </CardContent>
    </Card>
  );
};