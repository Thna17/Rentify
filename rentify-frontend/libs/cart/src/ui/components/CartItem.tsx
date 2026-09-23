// components/CartItem.tsx - UPDATED with better image handling
import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from '@rentify/utils/contexts/TranslationContext';
import { Button } from '@rentify/shared/ui/button';
import { Badge } from '@rentify/shared/ui/badge';
import { 
  Minus, 
  Plus, 
  RefreshCw, 
  Trash2, 
  Package, 
  AlertCircle,
  ChefHat,
  Shirt,
  Coffee,
  Sparkles,
  Edit3
} from 'lucide-react';
import { Card, CardContent } from '@rentify/shared/ui/card';
import { CartItemWithVariant } from '../../hooks/useCart';
import { VariantSelectorModal } from './VariantSelectorModal';

interface CartItemProps {
  item: CartItemWithVariant;
  onUpdateQuantity: (change: number) => void;
  onRemove: (itemId: string) => void;
  onUpdateVariant: (itemId: string, variantId: string, selectedOptions: Record<string, any>) => void;
  isUpdating?: boolean;
  isRemoving?: boolean;
  error?: string;
  onRetry?: () => void;
  isMobile?: boolean;
  websiteNiche?: string;
}

export const CartItem = ({
  item,
  onUpdateQuantity,
  onRemove,
  onUpdateVariant,
  isUpdating = false,
  isRemoving = false,
  error,
  onRetry,
  isMobile,
  websiteNiche = 'ecommerce'
}: CartItemProps) => {
  const { t } = useTranslation();
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [imageError, setImageError] = useState(false);

  const stockItem = item.ProductVariant || item.Product;
  const stockAvailable = !stockItem.trackInventory || stockItem.allowBackorders || stockItem.stockQuantity > 0;
  const maxQuantityReached = stockItem.trackInventory && !stockItem.allowBackorders && item.quantity >= stockItem.stockQuantity;
  const minQuantityReached = item.quantity <= 1;

  const handleQuantityChange = (change: number) => {
    if (isUpdating || isRemoving) return;
    onUpdateQuantity(change);
  };

  const handleActualRemove = () => {
    if (!isRemoving && !isUpdating) {
      onRemove(item.id);
    }
  };

  const handleVariantChange = (variantId: string, selectedOptions: Record<string, any>) => {
    onUpdateVariant(item.id, variantId, selectedOptions);
  };

  // Safe image URL handling
  const getImageUrl = () => {
    const variantImages = item.ProductVariant?.images;
    const productImages = item.Product.images;
    
    if (variantImages && variantImages.length > 0 && variantImages[0]?.url) {
      return variantImages[0].url;
    }
    if (productImages && productImages.length > 0 && productImages[0]?.url) {
      return productImages[0].url;
    }
    return '/images/placeholder-product.jpg';
  };
  
  const price = Number(item.unitPrice || item.Product.price);
  const totalPrice = price * item.quantity;
  const compareAtPrice = Number(item.compareAtPrice || item.Product.compareAtPrice);
  const hasDiscount = compareAtPrice && compareAtPrice > price;
  const hasOptions = Object.keys(item.selectedOptions).length > 0;
  const hasCustomizations = Object.keys(item.customizations).length > 0;
  const hasVariants = item.Product.ProductVariants && item.Product.ProductVariants.length > 0;

  // Niche-specific icons
  const getNicheIcon = () => {
    switch (websiteNiche) {
      case 'restaurant': return <ChefHat className="h-4 w-4 text-orange-600" />;
      case 'fashion': return <Shirt className="h-4 w-4 text-blue-600" />;
      case 'cafe': return <Coffee className="h-4 w-4 text-amber-600" />;
      case 'skincare': return <Sparkles className="h-4 w-4 text-purple-600" />;
      default: return <Package className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
        transition={{ duration: 0.3 }}
        className="mb-4"
      >
        <Card className='w-full shadow-sm border-border/50 hover:shadow-md transition-shadow'>
          {error && (
            <div className="mb-4 p-4 bg-destructive/10 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <p className="text-destructive text-sm flex-1">{error}</p>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive border-destructive h-9 flex-shrink-0 mt-2 sm:mt-0 rounded-full"
                onClick={onRetry}
              >
                <RefreshCw className="h-3.5 w-3.5 mr-2" />
                Retry
              </Button>
            </div>
          )}
          
          <CardContent className="p-6 space-y-6 flex flex-col sm:flex-row gap-6">
            {/* Product Image */}
            <div className="relative self-start flex-shrink-0">
              <div className={`relative overflow-hidden rounded-xl ${!stockAvailable ? 'opacity-60' : ''}`}>
                <img
                  src={getImageUrl()}
                  alt={item.Product.name}
                  className="w-full h-40 sm:h-32 sm:w-32 object-cover"
                  onError={() => setImageError(true)}
                />
                {!stockAvailable && (
                  <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                    <span className="text-destructive font-medium text-sm bg-background/90 px-3 py-1.5 rounded-full">
                      {t('cart.out_of_stock')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Product Details */}
            <div className="flex-grow w-full">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1 min-w-0 mr-4">
                  <div className="flex items-center gap-2 mb-2">
                    {getNicheIcon()}
                    <h3 className={`font-semibold text-xl ${!stockAvailable ? 'opacity-70' : ''}`}>
                      {item.Product.name}
                    </h3>
                  </div>
                  
                  <p className="text-muted-foreground text-sm mb-2">
                    {item.Product.Category?.name}
                  </p>

                  {/* Selected Options */}
                  {hasOptions && (
                    <div className="mb-2 mt-3">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-xs text-muted-foreground">Options:</p>
                        {hasVariants && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowVariantModal(true)}
                            className="h-6 px-2 text-xs text-primary hover:text-primary"
                          >
                            <Edit3 className="h-3 w-3 mr-1" />
                            Change
                          </Button>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(item.selectedOptions).map(([key, value]) => (
                          <Badge key={key} variant="secondary" className="text-xs">
                            {key}: {value}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Customizations */}
                  {hasCustomizations && (
                    <div className="mb-2">
                      <p className="text-xs text-muted-foreground mb-1">Customizations:</p>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(item.customizations).map(([key, value]) => (
                          <Badge key={key} variant="outline" className="text-xs">
                            {key}: {String(value)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Variant SKU */}
                  {item.ProductVariant?.sku && (
                    <p className="text-xs text-muted-foreground mt-2">
                      SKU: {item.ProductVariant.sku}
                    </p>
                  )}

                  {/* Stock Warning */}
                  {!stockAvailable && (
                    <div className="flex items-center gap-1 text-destructive text-xs mt-1">
                      <AlertCircle className="h-3 w-3" />
                      Out of stock
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleActualRemove}
                    disabled={isRemoving || isUpdating}
                    className="text-muted-foreground hover:text-destructive h-10 w-10 rounded-full"
                  >
                    {isRemoving ? (
                      <div className="h-4 w-4 border-2 border-destructive border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                  
                  {hasVariants && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowVariantModal(true)}
                      className="text-muted-foreground hover:text-primary h-10 w-10 rounded-full"
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-6 justify-between items-start sm:items-center mt-6">
                {/* Quantity Controls */}
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <span className="text-sm text-muted-foreground">{t('cart.quantity')}</span>
                  <div className={`flex items-center rounded-full border ${stockAvailable ? '' : 'opacity-70 pointer-events-none'}`}>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleQuantityChange(-1)}
                      disabled={minQuantityReached || isUpdating || isRemoving || !stockAvailable}
                      className="h-9 w-9 rounded-full"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="min-w-[2.5rem] text-center font-medium px-2">
                      {isUpdating ? (
                        <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                      ) : (
                        item.quantity
                      )}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleQuantityChange(1)}
                      disabled={maxQuantityReached || isUpdating || isRemoving || !stockAvailable}
                      className="h-9 w-9 rounded-full"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {maxQuantityReached && stockAvailable && (
                    <span className="text-destructive text-xs whitespace-nowrap">
                      {t('cart.max_available')}
                    </span>
                  )}
                </div>

                {/* Price Section */}
                <div className="text-left sm:text-right w-full sm:w-auto">
                  <div className="flex items-center gap-2 justify-end">
                    {hasDiscount && compareAtPrice && (
                      <span className="text-muted-foreground line-through text-sm">
                        ${(compareAtPrice * item.quantity).toFixed(2)}
                      </span>
                    )}
                    <p className={`font-semibold text-xl ${!stockAvailable ? 'opacity-70' : ''}`}>
                      ${totalPrice.toFixed(2)}
                    </p>
                  </div>
                  {item.quantity > 1 && (
                    <p className="text-muted-foreground text-sm">
                      {t('cart.each', { price: price.toFixed(2) })}
                    </p>
                  )}
                  {hasDiscount && compareAtPrice && (
                    <p className="text-green-600 text-sm">
                      Save ${((compareAtPrice - price) * item.quantity).toFixed(2)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Variant Selector Modal */}
      <VariantSelectorModal
        isOpen={showVariantModal}
        onClose={() => setShowVariantModal(false)}
        onVariantChange={handleVariantChange}
        product={item.Product}
        currentVariant={item.ProductVariant}
        currentOptions={item.selectedOptions}
      />
    </>
  );
};
