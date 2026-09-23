import React from 'react';
import { Card, CardContent } from "@rentify/shared/ui/card";
import { Badge } from "@rentify/shared/ui/badge";
import { Button } from "@rentify/shared/ui/button";
import { ShoppingCart, X, Receipt } from 'lucide-react';
import { KHQRDisplay } from './KHQRDisplay';
import { useTranslation } from '@rentify/utils';

export const CustomerDisplay = ({
  cart,
  total,
  showKHQR = false,
  khqrAmount = 0,
  onKHQRComplete,
  onKHQRCancel,
  khqrData,
  isMobile,
  isOverlay = false,
  paymentStatus,
  name
}) => {
  const { t } = useTranslation();
  const taxAmount = total * 0.08;
  const totalWithTax = total + taxAmount;

  if (showKHQR && onKHQRComplete && onKHQRCancel) {
    return (
      <KHQRDisplay
        amount={khqrAmount}
        onPaymentComplete={onKHQRComplete}
        onCancel={onKHQRCancel}
        paymentStatus={paymentStatus}
        khqrData={khqrData}
        isMobile={isMobile}
      />
    );
  }

  return (
    <div className={`h-full flex flex-col bg-background ${
      isOverlay ? 'fixed inset-0 z-50 animate-in slide-in-from-bottom' : ''
    }`}>
      {isOverlay && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onKHQRCancel}
          className="absolute top-4 right-4 z-10 bg-muted hover:bg-muted-foreground/20"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
      
      {/* Enhanced Header */}
      <div className="py-6 border-b border-border text-center">
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <Receipt className="h-5 w-5 text-primary-foreground" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">{name}</h2>
        </div>
        <p className="text-sm text-muted-foreground">{t('dashboard.pos.customer_display')}</p>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-12">
            <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-6">
              <ShoppingCart className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {t('dashboard.pos.welcome_pos')}
            </h3>
            <p className="text-muted-foreground max-w-[300px]">
              {t('dashboard.pos.items_appear_here')}
            </p>
          </div>
        ) : (
          <div className="h-full flex flex-col gap-6">
            {/* Items List */}
            <Card className="flex-1 border-border shadow-sm bg-background">
              <CardContent className="p-0">
                <div className="p-4 border-b border-border">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-foreground">{t('dashboard.pos.items')}</h4>
                    <Badge variant="secondary" className="bg-muted text-foreground">
                      {cart.length}
                    </Badge>
                  </div>
                </div>
                
                <div className="max-h-96 overflow-auto">
                  <div className="space-y-3 p-4">
                    {cart.map((item, index) => (
                      <div key={item.id} className="flex items-center gap-4 p-3 rounded-lg border border-border hover:border-input transition-colors">
                        <div className="w-10 h-10 bg-muted rounded flex items-center justify-center text-sm font-medium text-muted-foreground">
                          {index + 1}
                        </div>
                        
                        <div className="w-12 h-12 bg-muted rounded flex items-center justify-center overflow-hidden">
                          {item.images?.[0]?.url ? (
                            <img 
                              src={item.images[0].url} 
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <ShoppingCart className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">{item.name}</p>
                          <p className="text-sm text-muted-foreground">
                            ${item.price} × {item.quantity}
                          </p>
                        </div>
                        
                        <p className="font-semibold text-foreground">${item.subtotal}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Summary */}
            <Card className="border-border shadow-sm bg-background">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">{t('dashboard.pos.subtotal')}</span>
                    <span className="font-medium text-foreground">${total.toFixed(2)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">{t('dashboard.pos.tax')} (8%)</span>
                    <span className="font-medium text-foreground">${taxAmount.toFixed(2)}</span>
                  </div>
                  
                  <div className="border-t border-border pt-3">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-foreground">{t('dashboard.pos.total')}</span>
                      <span className="text-xl font-bold text-foreground">
                        ${totalWithTax.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="py-4 border-t border-border text-center bg-muted/50">
        <p className="text-sm text-muted-foreground">
          {t('dashboard.pos.please_wait_payment')}
        </p>
      </div>
    </div>
  );
};