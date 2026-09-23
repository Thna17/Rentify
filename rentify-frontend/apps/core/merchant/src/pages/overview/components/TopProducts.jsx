import { Card, CardContent, CardHeader, CardTitle } from "@rentify/shared/ui/card";
import { Badge } from "@rentify/shared/ui/badge";
import { Skeleton } from "@rentify/shared/ui/skeleton";
import { Package, TrendingUp } from "lucide-react";
import { cn } from "@rentify/utils";

export const TopProducts = ({ products, isLoading }) => {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (isLoading) {
    return (
      <Card className="border border-border rounded-lg shadow-sm bg-background">
        <CardHeader>
          <CardTitle>Top Performing Products</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center space-x-3">
              <Skeleton className="w-12 h-12 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-full" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-20" />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-border rounded-lg shadow-sm bg-background">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-xl font-semibold">Top Performing Products</CardTitle>
        <Badge variant="outline" className="text-xs">
          <TrendingUp className="w-3 h-3 mr-1" />
          Best Sellers
        </Badge>
      </CardHeader>
      <CardContent>
        {products.length > 0 ? (
          <div className="space-y-4">
            {products.map((product, index) => (
              <div
                key={product.id}
                className={cn(
                  "flex items-center space-x-4 p-3 rounded-xl transition-all duration-200",
                  "hover:bg-muted/50 hover:shadow-sm",
                  index === 0 && "bg-primary/5 border border-primary/20"
                )}
              >
                <div className="relative">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Package className="w-6 h-6 text-primary" />
                  </div>
                  {index === 0 && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                      <span className="text-[10px] font-bold text-primary-foreground">#1</span>
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm text-foreground truncate">
                    {product.name}
                  </h4>
                  {product.category && (
                    <p className="text-xs text-muted-foreground mb-2">
                      {product.category}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {product.unitsSold} sold
                    </Badge>
                    <Badge 
                      variant="outline" 
                      className="text-xs text-success border-success/30 bg-success/5"
                    >
                      {formatCurrency(product.revenue)}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-[250px] flex items-center justify-center flex-col">
            <Package className="w-16 h-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              No product sales data available
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};