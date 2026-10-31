import React from 'react';
import { useTranslation } from '@rentify/utils';
import { ExternalLink, Share2, ShoppingBag, Truck, Info, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { useChannels } from '../../context/ChannelContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@rentify/shared/ui/button';
import { marketplaceStoreUrl } from '../../utils/storeLinks';

export const MarketplacePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { store } = useChannels();

  const storeObj = store as Record<string, any> | null;
  const approval = String(storeObj?.marketplaceApprovalStatus || '').toLowerCase();
  const isApproved = approval === 'approved' || !approval;
  const isPending = approval === 'pending';
  const isPaused = approval === 'suspended' || approval === 'rejected';

  const marketplaceHref = marketplaceStoreUrl(storeObj);

  return (
    <div className="min-h-full">
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6 md:px-8 md:py-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">Rentify Market</h1>
          <p className="mt-1 text-sm text-muted-foreground hidden sm:block">
            Your store presence on the shared Rentify Marketplace. Listing is automatic (DEC-028).
          </p>
        </div>

        {/* Listing Status Card */}
        <div className="rounded-2xl border border-card-border bg-card p-5 shadow-soft">
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
                    {isApproved ? 'Listed on Marketplace' : isPending ? 'Listing Pending Verification' : 'Listing Paused'}
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
                    {isApproved ? 'Live' : isPending ? 'Pending' : 'Paused'}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  {isApproved
                    ? 'Buyers can find and order from your store across Cambodia. Orders settle directly to you via COD.'
                    : isPending
                    ? 'Your store is active and will appear on the marketplace once the owner profile is verified.'
                    : 'Your marketplace listing was paused by platform administration. See notifications for details.'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-0">
              {marketplaceHref && (
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="rounded-xl h-10 px-4 text-xs sm:text-sm font-semibold"
                >
                  <a href={marketplaceHref} target="_blank" rel="noreferrer">
                    <ExternalLink className="mr-1.5 h-4 w-4" />
                    <span>View store page</span>
                  </a>
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/share')}
                className="rounded-xl h-10 px-4 text-xs sm:text-sm font-semibold"
              >
                <Share2 className="mr-1.5 h-4 w-4" />
                <span>Share link</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Marketplace Settings Overview */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-card-border bg-card p-5 shadow-soft space-y-3">
            <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
              <ShoppingBag className="h-4 w-4 text-primary" />
              <span>Products Visibility</span>
            </div>
            <p className="text-xs text-muted-foreground">
              New products appear automatically on the marketplace unless you choose to hide them in product options.
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/products')}
              className="text-xs font-semibold text-primary px-0 hover:bg-transparent hover:underline"
            >
              Manage products & stock →
            </Button>
          </div>

          <div className="rounded-2xl border border-card-border bg-card p-5 shadow-soft space-y-3">
            <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
              <Truck className="h-4 w-4 text-primary" />
              <span>Flat Delivery Fee</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Marketplace orders charge your configured flat delivery fee per Store order (DEC-004).
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/settings/delivery')}
              className="text-xs font-semibold text-primary px-0 hover:bg-transparent hover:underline"
            >
              Update delivery fee →
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketplacePage;
