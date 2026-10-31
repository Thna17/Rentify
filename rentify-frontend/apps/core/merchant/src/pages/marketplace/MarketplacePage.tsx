import React, { useState, useMemo } from 'react';
import { useTranslation } from '@rentify/utils';
import {
  ExternalLink,
  Share2,
  ShoppingBag,
  Truck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronRight,
  Package,
  Plus,
  Loader2,
} from 'lucide-react';
import { useChannels } from '../../context/ChannelContext';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@rentify/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@rentify/shared/ui/card';
import { Badge } from '@rentify/shared/ui/badge';
import { marketplaceStoreUrl } from '../../utils/storeLinks';
import { useGetProductsQuery } from '@rentify/apis';
import { useThemeService } from '@rentify/shared/hooks/useThemeService';

export const MarketplacePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { store } = useChannels();
  const { websiteData } = useThemeService();
  const websiteId = websiteData.websiteId;

  const [productFilter, setProductFilter] = useState<'shown' | 'hidden'>('shown');

  const { data: productsResponse, isLoading: isLoadingProducts } = useGetProductsQuery(
    websiteId,
    { skip: !websiteId }
  );

  const rawProducts = useMemo(() => {
    if (!productsResponse) return [];
    if (Array.isArray(productsResponse)) return productsResponse;
    if (Array.isArray(productsResponse.products)) return productsResponse.products;
    if (Array.isArray(productsResponse.data)) return productsResponse.data;
    return [];
  }, [productsResponse]);

  const storeObj = store as Record<string, any> | null;
  const approval = String(storeObj?.marketplaceApprovalStatus || '').toLowerCase();
  const isApproved = approval === 'approved' || !approval;
  const isPending = approval === 'pending';
  const isPaused = approval === 'suspended' || approval === 'rejected';

  const marketplaceHref = marketplaceStoreUrl(storeObj);

  // Split into shown vs hidden on marketplace per DEC-028 & wireframe Screen M16 Note 2
  const shownProducts = useMemo(() => {
    return rawProducts.filter((p: any) => {
      const isVisible = p.isVisibleOnMarketplace !== false && p.status === 'active';
      const hasStock = Number(p.stockQuantity ?? p.stock ?? 1) > 0;
      return isVisible && hasStock;
    });
  }, [rawProducts]);

  const hiddenProducts = useMemo(() => {
    return rawProducts.filter((p: any) => {
      const isVisible = p.isVisibleOnMarketplace !== false && p.status === 'active';
      const hasStock = Number(p.stockQuantity ?? p.stock ?? 1) > 0;
      return !isVisible || !hasStock;
    });
  }, [rawProducts]);

  return (
    <div className="min-h-full">
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6 md:px-8 md:py-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            Rentify Market
          </h1>
          <p className="mt-1 text-sm text-muted-foreground hidden sm:block">
            Your store presence on the shared Rentify Marketplace. Listing is automatic (DEC-028).
          </p>
        </div>

        {/* Listing Status Card (Screen M16) */}
        <Card className="border border-[var(--rentify-color-border-subtle,#ece8e1)] bg-card shadow-[var(--shadow-soft)] p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3">
              {isApproved && (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                  <CheckCircle2 className="h-5 w-5" />
                </span>
              )}
              {isPending && (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                  <Clock className="h-5 w-5" />
                </span>
              )}
              {isPaused && (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                </span>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold text-foreground">
                    {isApproved
                      ? 'Listed'
                      : isPending
                      ? 'Listing Pending Verification'
                      : 'Listing Paused'}
                  </h2>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      isApproved
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                        : isPending
                        ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                        : 'bg-destructive/15 text-destructive'
                    }`}
                  >
                    {isApproved ? 'Listed' : isPending ? 'Pending' : 'Paused'}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  {isApproved
                    ? 'Buyers can find and order from your store'
                    : isPending
                    ? 'Your store is active and will appear on the marketplace once verified'
                    : 'Your marketplace listing was paused by platform administration'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-0">
              {marketplaceHref && (
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="rounded-xl min-h-[44px] h-11 px-4 text-xs sm:text-sm font-semibold"
                >
                  <a href={marketplaceHref} target="_blank" rel="noreferrer">
                    <ExternalLink className="mr-1.5 h-4 w-4" />
                    <span>View my store page</span>
                  </a>
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/share')}
                className="rounded-xl min-h-[44px] h-11 px-4 text-xs sm:text-sm font-semibold"
              >
                <Share2 className="mr-1.5 h-4 w-4" />
                <span>Share link</span>
              </Button>
            </div>
          </div>
        </Card>

        {/* Section: Your products on the marketplace (Screen M16 Note 2) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-foreground px-1">
              Your products on the marketplace
            </h3>
          </div>

          {/* Filter chips: Shown (X) / Hidden (Y) */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setProductFilter('shown')}
              className={`min-h-[36px] px-3.5 rounded-full text-xs font-medium transition-colors ${
                productFilter === 'shown'
                  ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                  : 'bg-muted/40 text-muted-foreground hover:bg-muted/70 hover:text-foreground'
              }`}
            >
              Shown ({shownProducts.length})
            </button>
            <button
              type="button"
              onClick={() => setProductFilter('hidden')}
              className={`min-h-[36px] px-3.5 rounded-full text-xs font-medium transition-colors ${
                productFilter === 'hidden'
                  ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                  : 'bg-muted/40 text-muted-foreground hover:bg-muted/70 hover:text-foreground'
              }`}
            >
              Hidden ({hiddenProducts.length})
            </button>
          </div>

          {/* Product Items List */}
          <Card className="border border-[var(--rentify-color-border-subtle,#ece8e1)] bg-card shadow-[var(--shadow-soft)] divide-y divide-[var(--rentify-color-border-subtle,#ece8e1)] overflow-hidden">
            {isLoadingProducts ? (
              <div className="p-8 text-center flex items-center justify-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span>Loading products...</span>
              </div>
            ) : productFilter === 'shown' ? (
              shownProducts.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <Package className="h-8 w-8 text-muted-foreground mx-auto" />
                  <p className="text-sm font-medium text-foreground">No products shown</p>
                  <p className="text-xs text-muted-foreground">
                    Add in-stock products to show them to buyers on the marketplace.
                  </p>
                  <Button asChild size="sm" className="mt-2 min-h-[44px]">
                    <Link to="/products">Manage products</Link>
                  </Button>
                </div>
              ) : (
                shownProducts.map((prod: any) => (
                  <div
                    key={prod.id}
                    className="p-4 flex items-center justify-between gap-4 hover:bg-muted/20 transition-colors"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <h4 className="text-sm font-semibold text-foreground truncate">
                        {prod.name}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Shown · In stock ({prod.stockQuantity ?? prod.stock ?? 1} units) · ${Number(prod.price || 0).toFixed(2)}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-2xs text-emerald-600 border-emerald-500/30 bg-emerald-500/10">
                      Active
                    </Badge>
                  </div>
                ))
              )
            ) : hiddenProducts.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No hidden products. All your catalog products are active and in stock on the marketplace!
              </div>
            ) : (
              hiddenProducts.map((prod: any) => {
                const isOutOfStock = Number(prod.stockQuantity ?? prod.stock ?? 0) <= 0;
                return (
                  <div
                    key={prod.id}
                    className="p-4 flex items-center justify-between gap-4 hover:bg-muted/20 transition-colors"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <h4 className="text-sm font-semibold text-foreground truncate">
                        {prod.name}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {isOutOfStock
                          ? 'Hidden · out of stock'
                          : 'Hidden · you turned it off'}
                      </p>
                    </div>
                    <div>
                      {isOutOfStock ? (
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="min-h-[40px] text-xs h-9"
                        >
                          <Link to={`/products/edit/${prod.id}`}>Add stock</Link>
                        </Button>
                      ) : (
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="min-h-[40px] text-xs h-9"
                        >
                          <Link to={`/products/edit/${prod.id}`}>Show</Link>
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </Card>
        </div>

        {/* Section: Delivery (Screen M16) */}
        <div className="space-y-3 pt-1">
          <h3 className="text-base font-semibold text-foreground px-1">Delivery</h3>

          <Card className="border border-[var(--rentify-color-border-subtle,#ece8e1)] bg-card shadow-[var(--shadow-soft)] overflow-hidden">
            <Link
              to="/settings/delivery"
              className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-muted/20 transition-colors group"
            >
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-xl bg-muted/40 border border-border/50 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-0.5">
                  <Truck className="h-5 w-5" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                    Delivery fee
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    $1.00 per order, paid on delivery (DEC-004)
                  </p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
            </Link>
          </Card>
        </div>

        {/* Section: Settings (Screen M16) */}
        <div className="space-y-3 pt-1">
          <h3 className="text-base font-semibold text-foreground px-1">Settings</h3>

          <Card className="border border-[var(--rentify-color-border-subtle,#ece8e1)] bg-card shadow-[var(--shadow-soft)] p-5 space-y-1">
            <h4 className="text-sm font-semibold text-foreground">
              New products appear on the marketplace
            </h4>
            <p className="text-xs text-muted-foreground">
              On · change per product in its options (DEC-028 automatic listing)
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default MarketplacePage;
