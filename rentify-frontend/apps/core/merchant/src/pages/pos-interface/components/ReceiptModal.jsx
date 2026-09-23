import React, { useState, useMemo } from 'react';
import { Button } from "@rentify/shared/ui/button";
import { Card, CardContent } from "@rentify/shared/ui/card";
import { Badge } from "@rentify/shared/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@rentify/shared/ui/dialog";
import {
  Download,
  X,
  CheckCircle,
  Copy,
  Receipt,
  Printer
} from 'lucide-react';
import { useTranslation } from '@rentify/utils';

export const ReceiptModal = ({
  open,
  onClose,
  order,
  container,
  taxRate = 0.08,
  name
}) => {
  const { t } = useTranslation();
  const [isPrinting, setIsPrinting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isCopying, setIsCopying] = useState(false);

  // Memoized calculations
  const { subtotal, tax } = useMemo(() => {
    if (!order) return { subtotal: 0, tax: 0 };
    
    const calculatedSubtotal = order.total / (1 + taxRate);
    const calculatedTax = order.total - calculatedSubtotal;
    
    return {
      subtotal: calculatedSubtotal,
      tax: calculatedTax
    };
  }, [order, taxRate]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      window.print();
    } catch (error) {
      console.error('Print failed:', error);
    } finally {
      setIsPrinting(false);
    }
  };

  if (!order) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-3/4 mx-auto"></div>
            <div className="space-y-2">
              <div className="h-4 bg-muted rounded"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
           <DialogContent 
              container={container}
              className="sm:max-w-4xl w-[95vw] max-h-[80vh] overflow-auto bg-background border-border"
              style={{
                zIndex: 9999
              }}
  
>
        <DialogHeader>
          <DialogTitle className="text-center">
            {t('dashboard.pos.receipt')}
          </DialogTitle>
        </DialogHeader>

        <Card className="bg-background border-border">
          <CardContent className="p-6">
            {/* Header */}
            <div className="text-center mb-6 pb-4 border-b border-border">
              <h2 className="text-2xl font-bold text-primary">{name}</h2>
              <p className="text-sm text-muted-foreground">{t('dashboard.pos.pos_system')}</p>
            </div>

            {/* Order Info */}
            <div className="flex justify-between items-center mb-4">
              <div>
                <p className="text-sm text-muted-foreground">{t('dashboard.pos.order_number')}</p>
                <p className="font-medium">{order.id}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">{order.timestamp.toLocaleDateString()}</p>
                <p className="text-sm text-muted-foreground">
                  {order.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>

            {/* Status */}
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-success" />
                <span className="text-sm font-medium">{t('dashboard.pos.payment_complete')}</span>
              </div>
              <Badge className={
                order.status === 'completed' ? 'bg-success/10 text-success' :
                order.status === 'pending' ? 'bg-warning/10 text-warning' :
                'bg-destructive/10 text-destructive'
              }>
                {order.status}
              </Badge>
            </div>

            <div className="border-t border-border my-4"></div>

            {/* Items */}
            <div className="mb-4">
              <h4 className="font-semibold text-sm text-muted-foreground mb-2">{t('dashboard.pos.items')}</h4>
              <div className="space-y-3">
                {order.items.map((item, index) => (
                  <div key={item.id} className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">× {item.quantity}</p>
                    </div>
                    <p className="font-semibold">{formatCurrency(item.subtotal)}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-border my-4"></div>

            {/* Summary */}
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('dashboard.pos.subtotal')}</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {t('dashboard.pos.tax')} ({(taxRate * 100).toFixed(0)}%)
                </span>
                <span>{formatCurrency(tax)}</span>
              </div>
              <div className="border-t border-border pt-2">
                <div className="flex justify-between items-center font-bold">
                  <span>{t('dashboard.pos.total')}</span>
                  <span className="text-lg text-primary">{formatCurrency(order.total)}</span>
                </div>
              </div>
            </div>

            {/* Payment Info */}
            <div className="bg-muted/50 rounded-lg p-3 text-center mb-4">
              <p className="text-sm text-muted-foreground">{t('dashboard.pos.paid_via')}</p>
              <p className="font-semibold">{order.paymentMethod.toUpperCase()}</p>
            </div>

            {/* Footer */}
            <p className="text-center text-sm text-muted-foreground italic">
              {t('dashboard.pos.thank_you')}
            </p>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={handlePrint}
            disabled={isPrinting}
            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {isPrinting ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2"></div>
            ) : (
              <Printer className="h-4 w-4 mr-2" />
            )}
            {t('dashboard.pos.print_receipt')}
          </Button>
          
          <Button variant="outline" disabled={isDownloading} className="border-border">
            <Download className="h-4 w-4 mr-2" />
            {t('dashboard.pos.download_receipt')}
          </Button>
          
          <Button variant="outline" disabled={isCopying} className="border-border">
            <Copy className="h-4 w-4 mr-2" />
            {isCopying ? t('dashboard.pos.copying') : t('dashboard.pos.copy_receipt')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};