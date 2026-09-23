import { useState, useEffect } from 'react';
import { Button } from '@rentify/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@rentify/shared/ui/dialog';
import { Input } from '@rentify/shared/ui/input';
import { Textarea } from '@rentify/shared/ui/textarea';
import { Label } from '@rentify/shared/ui/label';
import { Card, CardContent } from '@rentify/shared/ui/card';
import { Loader2 } from 'lucide-react';
import { useTranslation } from '@rentify/utils';

interface Product {
  id: string;
  name: string;
  stockQuantity: number;
}

interface InventoryDialogProps {
  open: boolean;
  onClose: () => void;
  product: Product | null; // Allow null
  inventoryQty: number;
  setInventoryQty: (qty: number) => void;
  inventoryNote: string;
  setInventoryNote: (note: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
}

export const InventoryDialog = ({
  open,
  onClose,
  product,
  inventoryQty,
  setInventoryQty,
  inventoryNote,
  setInventoryNote,
  onSubmit,
  isLoading,
}: InventoryDialogProps) => {
  const { t } = useTranslation();
  const [localQty, setLocalQty] = useState(inventoryQty.toString());

  // Sync local state with props
  useEffect(() => {
    setLocalQty(inventoryQty.toString());
  }, [inventoryQty, open]);

  const handleQtyChange = (value: string) => {
    setLocalQty(value);
    const numValue = value === '' ? 0 : Number(value);
    if (!isNaN(numValue)) {
      setInventoryQty(numValue);
    }
  };

  const handleSubmit = () => {
    const numValue = localQty === '' ? 0 : Number(localQty);
    setInventoryQty(numValue);
    onSubmit();
  };

  // Safe calculations with null check
  const currentStock = product?.stockQuantity || 0;
  const newStockQuantity = currentStock + inventoryQty;

  // Don't render content if dialog is closed
  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            {product 
              ? t('dashboard.product.update_inventory_title', { name: product.name })
              : t('dashboard.product.update_inventory')
            }
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {t('dashboard.product.update_inventory_description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Current Stock Card */}
          <Card>
            <CardContent className="p-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">
                  {t('dashboard.product.current_stock')}
                </Label>
                <p className="text-2xl font-bold text-foreground">
                  {currentStock}
                </p>
                {inventoryQty !== 0 && (
                  <p className="text-sm text-muted-foreground">
                    {t('dashboard.product.new_stock')}:{' '}
                    <span className={`font-medium ${newStockQuantity < 0 ? 'text-destructive' : 'text-green-600'}`}>
                      {newStockQuantity}
                    </span>
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quantity Adjustment */}
          <div className="space-y-3">
            <Label htmlFor="quantity-adjustment" className="text-sm font-medium">
              {t('dashboard.product.quantity_adjustment')}
            </Label>
            <div className="relative">
              <Input
                id="quantity-adjustment"
                type="number"
                value={localQty}
                onChange={(e) => handleQtyChange(e.target.value)}
                className="pr-16"
                placeholder="0"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                ±
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {t('dashboard.product.quantity_adjustment_help')}
            </p>
          </div>

          {/* Update Note */}
          <div className="space-y-3">
            <Label htmlFor="update-note" className="text-sm font-medium">
              {t('dashboard.product.update_note')}
            </Label>
            <Textarea
              id="update-note"
              value={inventoryNote}
              onChange={(e) => setInventoryNote(e.target.value)}
              placeholder={t('dashboard.product.update_note_placeholder')}
              className="min-h-[100px] resize-none"
            />
            <p className="text-xs text-muted-foreground">
              {t('dashboard.product.update_note_help')}
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 sm:flex-none"
          >
            {t('dashboard.product.cancel')}
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading || isNaN(Number(localQty)) || !product} // Disable if no product
            className="flex-1 sm:flex-none"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('dashboard.product.updating')}
              </>
            ) : (
              t('dashboard.product.update_stock')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};