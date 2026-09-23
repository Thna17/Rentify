import { Button } from '@rentify/shared/ui/button'
import { ArrowRight, ShoppingCart } from 'lucide-react';
import { useTranslation } from '@rentify/utils/contexts/TranslationContext';
export const EmptyCartState = ({ onExplore }) => {
  const { t } = useTranslation();

  return (
    <div className="py-12 text-center max-w-md mx-auto">
      <div className="mb-6 flex justify-center">
        <ShoppingCart className="h-20 w-20 text-muted-foreground" />
      </div>
      
      <h2 className="text-2xl md:text-3xl font-bold mb-2">{t('cart.empty_cart')}</h2>
      <p className="text-muted-foreground mb-6">{t('cart.empty_cart_message')}</p>

      <Button onClick={onExplore} className="gap-2">
        {t('cart.start_shopping')}
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
};
