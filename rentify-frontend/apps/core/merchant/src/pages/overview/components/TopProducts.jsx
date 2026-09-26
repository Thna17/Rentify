import { Card } from "@rentify/shared/ui/card";
import { Skeleton } from "@rentify/shared/ui/skeleton";
import { Package } from "lucide-react";

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);

export const TopProducts = ({ products = [], isLoading }) => {
  const maxRevenue = Math.max(1, ...products.map((p) => Number(p.revenue) || 0));

  return (
    <Card className="h-full gap-0 p-6 bg-card">
      <div className="flex items-baseline justify-between">
        <h3 className="text-base font-semibold text-foreground">Top products</h3>
        <span className="text-xs text-muted-foreground">By revenue</span>
      </div>

      {isLoading ? (
        <div className="mt-5 space-y-5">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-3/4" />
                <Skeleton className="h-1.5 w-full rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : products.length > 0 ? (
        <ul className="mt-4 space-y-1">
          {products.map((product, index) => (
            <li
              key={product.id}
              className="flex items-center gap-3 rounded-xl px-2 py-2.5 -mx-2 hover:bg-muted/60 transition-colors"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-sm font-semibold text-muted-foreground">
                {index + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-medium text-foreground truncate">{product.name}</p>
                  <span className="text-sm font-semibold text-foreground tabular-nums">
                    {formatCurrency(product.revenue)}
                  </span>
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary/70 transition-[width] duration-500"
                      style={{ width: `${((Number(product.revenue) || 0) / maxRevenue) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {product.unitsSold} sold
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
          <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <Package className="h-5 w-5" />
          </span>
          <p className="text-sm font-medium text-foreground">No sales yet</p>
          <p className="text-xs text-muted-foreground mt-1">Your best sellers will show up here.</p>
        </div>
      )}
    </Card>
  );
};
