// Cart.tsx - Enhanced for variants
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '@rentify/utils/contexts/TranslationContext';
import useCart from '../hooks/useCart';
import { useEffect, useState } from 'react';
import { CartItem } from './components/CartItem';
import { EmptyCartState } from './components/EmptyCartState';
import { MobileSummaryBottomBar } from '@rentify/shared/ui/components/MobileSummaryBottomBar';
import { MobileSummaryDrawer } from '@rentify/shared/ui/components/MobileSummaryDrawer';
import { SummarySection } from '@rentify/shared/ui/components/SummarySection';
import { Button } from '@rentify/shared/ui/button';
import { Skeleton } from '@rentify/shared/ui/skeleton';
import { Alert, AlertDescription } from '@rentify/shared/ui/alert';
import { ShoppingCart, Package, AlertTriangle } from 'lucide-react';
import { useMediaQuery } from '@rentify/utils/hooks/useMediaQuery';
import { Badge } from '@rentify/shared/ui/badge';

export const Cart = () => {
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 900px)');
  const { t } = useTranslation();
  const [summaryOpen, setSummaryOpen] = useState(false);

  const {
    cartItems,
    updatingItems,
    removingItems,
    errors,
    handleQuantityChange,
    handleRemoveItem,
    isLoading,
    isError,
    versionConflict,
    totalQuantity,
    calculateSummary,
    isItemInStock,
    handleUpdateVariant,
  } = useCart();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const toggleSummary = () => setSummaryOpen(!summaryOpen);

  // Check for out of stock items
  const outOfStockItems = cartItems.filter((item) => !isItemInStock(item));
  const hasOutOfStockItems = outOfStockItems.length > 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pt-20 pb-8">
        <div className="container max-w-6xl px-4 mx-auto">
          <div className="mb-8">
            <Skeleton className="h-8 w-56 mb-6 rounded-full" />
            <div className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-36 mt-2" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-4 p-4 border rounded-2xl">
                  <Skeleton className="h-28 w-28 rounded-xl" />
                  <div className="flex-1 space-y-3">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-2/3" />
                    <div className="flex justify-between items-center mt-4">
                      <Skeleton className="h-10 w-32 rounded-full" />
                      <Skeleton className="h-7 w-20" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="md:col-span-1">
              <Skeleton className="h-96 rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md text-center p-8 bg-card rounded-2xl shadow-sm border">
          <h2 className="text-xl font-semibold text-destructive mb-3">
            {t('cart.error_load')}
          </h2>
          <p className="text-muted-foreground mb-6">{t('cart.try_again')}</p>
          <Button
            onClick={() => window.location.reload()}
            className="rounded-full"
          >
            {t('cart.reload_page')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <div className="max-w-6xl mx-auto px-4">
        {versionConflict && (
          <Alert className="mb-6 bg-warning/15 border-warning/30 rounded-xl">
            <AlertDescription className="flex items-center justify-between">
              <span>{t('cart.version_conflict')}</span>
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-warning border-t-transparent" />
            </AlertDescription>
          </Alert>
        )}

        {errors.global && (
          <Alert variant="destructive" className="mb-6 rounded-xl">
            <AlertDescription>{errors.global}</AlertDescription>
          </Alert>
        )}

        {hasOutOfStockItems && (
          <Alert className="mb-6 bg-amber-50 border-amber-200 rounded-xl">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              Some items in your cart are out of stock. Please update your cart
              to proceed.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ShoppingCart size={20} className="text-primary" />
              {t('cart.shopping_cart')}
            </h1>

            {totalQuantity > 0 && (
              <Badge variant="secondary" className="text-sm">
                {totalQuantity} {totalQuantity === 1 ? 'item' : 'items'}
              </Badge>
            )}
          </div>

          {hasOutOfStockItems && (
            <Badge
              variant="outline"
              className="bg-amber-50 text-amber-700 border-amber-200"
            >
              <AlertTriangle className="h-3 w-3 mr-1" />
              {outOfStockItems.length} out of stock
            </Badge>
          )}
        </div>

        <div className="flex flex-col lg:grid lg:grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="w-full xl:col-span-2 space-y-6">
            {cartItems.map((item) => (
              <CartItem
                key={item.id}
                item={item}
                isUpdating={updatingItems[item.id]}
                isRemoving={removingItems[item.id]}
                onRemove={handleRemoveItem}
                onUpdateQuantity={(change) =>
                  handleQuantityChange(item.id, change)
                }
                error={errors[item.id]}
                onRetry={() => window.location.reload()}
                isMobile={isMobile}
                onUpdateVariant={handleUpdateVariant}
              />
            ))}
          </div>

          {cartItems.length === 0 && (
            <div className="col-span-full">
              <EmptyCartState onExplore={() => navigate('/products')} />
            </div>
          )}

          {!isMobile && cartItems.length > 0 && (
            <div className="xl:col-span-1">
              <SummarySection
                summary={calculateSummary()}
                itemCount={totalQuantity}
                currency="USD"
                onAction={() => navigate('/checkout')}
                showActionButtons={true}
                disabled={hasOutOfStockItems}
                actionLabel={
                  hasOutOfStockItems
                    ? 'Update Cart to Checkout'
                    : 'Proceed to Checkout'
                }
              />
            </div>
          )}
        </div>

        {isMobile && cartItems.length > 0 && (
          <MobileSummaryBottomBar
            totalQuantity={totalQuantity}
            totalPrice={calculateSummary().total}
            onToggleSummary={toggleSummary}
            onAction={() => navigate('/checkout')}
            actionLabel={
              hasOutOfStockItems ? 'Update Cart' : 'Proceed to Checkout'
            }
            disabled={hasOutOfStockItems}
          />
        )}

        {isMobile && (
          <MobileSummaryDrawer
            open={summaryOpen}
            onClose={toggleSummary}
            totalQuantity={totalQuantity}
            summary={calculateSummary()}
            onAction={() => {
              toggleSummary();
              if (!hasOutOfStockItems) {
                navigate('/checkout');
              }
            }}
            actionLabel={
              hasOutOfStockItems ? 'Update Cart' : 'Proceed to Checkout'
            }
            disabled={hasOutOfStockItems}
          />
        )}
      </div>
    </div>
  );
};

export default Cart;
