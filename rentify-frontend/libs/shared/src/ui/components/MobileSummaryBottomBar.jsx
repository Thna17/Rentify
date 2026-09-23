import { useTranslation } from '@rentify/utils/contexts/TranslationContext';
import { Button } from '@rentify/shared/ui/button';
import { ShoppingBag, ChevronRight } from 'lucide-react';

export const MobileSummaryBottomBar = ({
  totalQuantity,
  totalPrice,
  onToggleSummary,
  onAction,
  actionLabel,
}) => {
  const { t } = useTranslation();

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background  border-t p-4 z-50 shadow-lg">
      <div className="flex items-center justify-between gap-3">
        <Button 
          variant="outline" 
          className="flex-1 justify-between h-12 rounded-xl"
          onClick={onToggleSummary}
        >
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-full bg-primary/10">
              <ShoppingBag className="h-4 w-4 text-primary" />
            </div>
            <div className="text-left">
              <p className="text-xs text-muted-foreground">
                {t('cart.total')}
              </p>
              <p className="font-bold text-lg">${totalPrice}</p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5" />
        </Button>

        <Button className="h-12 px-6 flex-shrink-0 rounded-xl" onClick={onAction}>
          {actionLabel}
        </Button>
      </div>
    </div>
  );
};
