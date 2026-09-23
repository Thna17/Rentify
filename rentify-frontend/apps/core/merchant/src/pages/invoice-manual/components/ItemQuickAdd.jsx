import React, { useState, useEffect } from 'react';
import { Button } from '@rentify/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@rentify/shared/ui/dialog';
import { Input } from '@rentify/shared/ui/input';
import { Label } from '@rentify/shared/ui/label';
import { Badge } from '@rentify/shared/ui/badge';
import { Card, CardContent } from '@rentify/shared/ui/card';
import { Separator } from '@rentify/shared/ui/separator';
import { 
  Loader2, 
  Package, 
  Zap, 
  Plus,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { useGetAllProductsQuery } from '@rentify/apis';
import { useTranslation } from '@rentify/utils';
import { useThemeService } from '@rentify/shared/hooks/useThemeService';

export const ItemQuickAdd = ({ onAddItem }) => {
  const { websiteData } = useThemeService();
  const websiteId = websiteData.websiteId;
  
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [customItem, setCustomItem] = useState({ 
    name: '', 
    quantity: 1, 
    price: '' 
  });
  const [showSuccess, setShowSuccess] = useState(false);

  const { 
    data: productsData, 
    isLoading, 
    isError,
    refetch 
  } = useGetAllProductsQuery(
    { websiteId, page: 1, limit: 6, status: 'active' },
    { skip: !isOpen }
  );

  useEffect(() => {
    if (isOpen) {
      refetch();
    }
  }, [isOpen, refetch]);

  const handleQuickAdd = (product) => {
    onAddItem({ 
      name: product.name, 
      quantity: 1, 
      price: product.price,
      productId: product.id
    });
    setShowSuccess(true);
    setTimeout(() => {
      setIsOpen(false);
      setShowSuccess(false);
    }, 800);
  };

  const handleCustomAdd = () => {
    if (customItem.name.trim()) {
      onAddItem({
        ...customItem,
        price: parseFloat(customItem.price) || 0,
        quantity: parseInt(customItem.quantity) || 1
      });
      setCustomItem({ name: '', quantity: 1, price: '' });
      setShowSuccess(true);
      setTimeout(() => {
        setIsOpen(false);
        setShowSuccess(false);
      }, 800);
    }
  };

  const handleInputChange = (field, value) => {
    setCustomItem(prev => ({ 
      ...prev, 
      [field]: value 
    }));
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            {t('dashboard.invoices.add_item')}
          </Button>
        </DialogTrigger>
        
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          {showSuccess ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
              <h3 className="text-lg font-semibold">Item Added!</h3>
              <p className="text-muted-foreground">The item has been added to your invoice</p>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  {t('dashboard.invoices.add_invoice_item')}
                </DialogTitle>
                <DialogDescription>
                  Quickly add from existing products or create a custom item
                </DialogDescription>
              </DialogHeader>

              {/* Quick Add Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <h3 className="font-semibold text-sm">{t('dashboard.invoices.quick_add')}</h3>
                </div>

                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : isError ? (
                  <div className="flex items-center gap-2 p-3 text-sm border border-red-200 bg-red-50 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <span>{t('dashboard.invoices.failed_load_products')}</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {productsData?.products?.map((product) => (
                      <Card 
                        key={product.id}
                        className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50 active:scale-95"
                        onClick={() => handleQuickAdd(product)}
                      >
                        <CardContent className="p-3">
                          <div className="space-y-2">
                            <p className="text-sm font-medium leading-none truncate">
                              {product.name}
                            </p>
                            <p className="text-sm font-semibold text-green-600">
                              ${product.price}
                            </p>
                            {product.category && (
                              <Badge variant="secondary" className="text-xs">
                                {product.category}
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* Custom Item Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Plus className="w-4 h-4 text-blue-500" />
                  <h3 className="font-semibold text-sm">{t('dashboard.invoices.custom_item')}</h3>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="itemName">{t('dashboard.invoices.description')}</Label>
                    <Input
                      id="itemName"
                      value={customItem.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder={t('dashboard.invoices.description_placeholder')}
                      className="focus-visible:ring-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="itemQty">{t('dashboard.invoices.quantity')}</Label>
                      <Input
                        id="itemQty"
                        type="number"
                        min="1"
                        value={customItem.quantity}
                        onChange={(e) => handleInputChange('quantity', e.target.value)}
                        className="focus-visible:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="itemPrice">{t('dashboard.invoices.price')}</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                          $
                        </span>
                        <Input
                          id="itemPrice"
                          type="number"
                          min="0"
                          step="0.01"
                          value={customItem.price}
                          onChange={(e) => handleInputChange('price', e.target.value)}
                          className="pl-8 focus-visible:ring-blue-500"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </div>

                  <Button 
                    onClick={handleCustomAdd}
                    disabled={!customItem.name.trim()}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    {t('dashboard.invoices.add_custom_item')}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};