import { Card, CardContent, CardHeader, CardTitle } from "@rentify/shared/ui/card";
import { Badge } from "@rentify/shared/ui/badge";
import { Progress } from "@rentify/shared/ui/Progress";
import { Package, AlertTriangle, CheckCircle } from "lucide-react";
import { cn } from "@rentify/utils";

export const InventoryStatus = ({ inventory }) => {
  const {
    totalProducts = 0,
    totalStock = 0,
    criticalOutOfStock = 0,
    lowStock = 0,
    avgStock = 0,
  } = inventory || {};

  // Calculate stock health
  const healthyStock = totalProducts - (criticalOutOfStock + lowStock);
  const stockHealth = totalProducts > 0 ? 
    ((healthyStock) / totalProducts * 100) : 0;

  const getHealthColor = (health) => {
    if (health >= 75) return 'success';
    if (health >= 50) return 'warning';
    return 'error';
  };

  const healthColor = getHealthColor(stockHealth);

  return (
    <Card className="chart-container">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-xl font-semibold">Inventory Health</CardTitle>
        <Badge 
          variant="outline" 
          className={cn(
            "text-xs",
            healthColor === 'success' && "text-success border-success/30 bg-success/5",
            healthColor === 'warning' && "text-warning border-warning/30 bg-warning/5",
            healthColor === 'error' && "text-error border-error/30 bg-error/5"
          )}
        >
          {stockHealth.toFixed(1)}% Healthy
        </Badge>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 rounded-xl bg-muted/30">
            <div className="text-2xl font-bold text-card-foreground">
              {totalProducts.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Total Products
            </div>
          </div>
          
          <div className="text-center p-4 rounded-xl bg-error/5 border border-error/20">
            <div className="text-2xl font-bold text-error">
              {criticalOutOfStock}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Out of Stock
            </div>
          </div>
          
          <div className="text-center p-4 rounded-xl bg-warning/5 border border-warning/20">
            <div className="text-2xl font-bold text-warning">
              {lowStock}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Low Stock
            </div>
          </div>
        </div>

        {/* Stock Health Bar */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-card-foreground">
              Stock Health Overview
            </span>
            <span className="text-xs text-muted-foreground">
              {healthyStock} healthy products
            </span>
          </div>
          
          <Progress 
            value={stockHealth} 
            className={cn(
              "h-3",
              healthColor === 'success' && "[&>div]:bg-success",
              healthColor === 'warning' && "[&>div]:bg-warning", 
              healthColor === 'error' && "[&>div]:bg-error"
            )}
          />
          
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Avg Stock: {avgStock}</span>
            <span>Total Units: {totalStock.toLocaleString()}</span>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-success/5 border border-success/20">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-4 h-4 text-success" />
              <span className="text-sm font-medium">Healthy Stock</span>
            </div>
            <span className="text-sm font-semibold text-success">
              {healthyStock} products
            </span>
          </div>

          {lowStock > 0 && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-warning/5 border border-warning/20">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-4 h-4 text-warning" />
                <span className="text-sm font-medium">Low Stock Alert</span>
              </div>
              <span className="text-sm font-semibold text-warning">
                {lowStock} products
              </span>
            </div>
          )}

          {criticalOutOfStock > 0 && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-error/5 border border-error/20">
              <div className="flex items-center gap-3">
                <Package className="w-4 h-4 text-error" />
                <span className="text-sm font-medium">Critical: Out of Stock</span>
              </div>
              <span className="text-sm font-semibold text-error">
                {criticalOutOfStock} products
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};