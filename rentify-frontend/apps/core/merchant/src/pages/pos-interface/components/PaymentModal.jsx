import React, { useState, useEffect } from 'react';
import { Button } from "@rentify/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@rentify/shared/ui/card";
import { Input } from "@rentify/shared/ui/input";
import { Badge } from "@rentify/shared/ui/badge";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@rentify/shared/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@rentify/shared/ui/sheet";
import {
  ScrollArea,
  ScrollBar,
} from "@rentify/shared/ui/scroll-area";
import {
  DollarSign,
  QrCode,
  X,
  CheckCircle2,
  Receipt,
  CreditCard,
  Smartphone,
  Banknote,
  Loader2,
  ChevronUp,
  MapPin,
  Calendar,
  User
} from 'lucide-react';
import { useTranslation } from '@rentify/utils';
import { cn } from '@rentify/utils';

export const PaymentModal = ({
  total,
  items,
  onClose,
  onPaymentComplete,
  isDualScreen = false,
  onKHQRPayment,
  container,
  isFullscreen = false,
}) => {
  const { t } = useTranslation();
  const [selectedMethod, setSelectedMethod] = useState('cash');
  const [cashReceived, setCashReceived] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(true);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const totalWithTax = total * 1.08;
  const change = cashReceived ? Math.max(0, parseFloat(cashReceived) - totalWithTax) : 0;

  const paymentMethods = [
    { 
      id: 'cash', 
      label: t('dashboard.invoices.cash'), 
      icon: Banknote, 
      description: 'Pay with cash',
      color: 'border-success/20 bg-success/10 hover:bg-success/20',
      activeColor: 'border-success bg-success/10 ring-2 ring-success/20'
    },
    { 
      id: 'card', 
      label: 'Credit Card', 
      icon: CreditCard, 
      description: 'Pay with card',
      color: 'border-info/20 bg-info/10 hover:bg-info/20',
      activeColor: 'border-info bg-info/10 ring-2 ring-info/20'
    },
    { 
      id: 'KHQR', 
      label: 'KHQR', 
      icon: QrCode, 
      description: 'Scan to pay',
      color: 'border-primary/20 bg-primary/10 hover:bg-primary/20',
      activeColor: 'border-primary bg-primary/10 ring-2 ring-primary/20'
    },
    { 
      id: 'mobile', 
      label: 'Mobile Pay', 
      icon: Smartphone, 
      description: 'Pay with phone',
      color: 'border-warning/20 bg-warning/10 hover:bg-warning/20',
      activeColor: 'border-warning bg-warning/10 ring-2 ring-warning/20'
    },
  ];

  const handlePayment = async () => {
    setIsProcessing(true);

    if (selectedMethod === 'KHQR' && onKHQRPayment) {
      onKHQRPayment(totalWithTax);
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
    onPaymentComplete(selectedMethod);
    setIsProcessing(false);
  };

  const canProceed = selectedMethod !== 'cash' || (cashReceived && parseFloat(cashReceived) >= totalWithTax);

  // Mobile Drawer Content
  const mobileDrawerContent = (
    <div className="flex flex-col h-full">
      {/* Handle Bar */}
      <div className="flex justify-center pt-3 pb-2">
        <div className="w-12 h-1.5 bg-muted rounded-full" />
      </div>

      {/* Header */}
      <SheetHeader className="px-4 pb-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary rounded-lg">
              <Receipt className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <SheetTitle className="text-lg font-semibold text-foreground">
                Complete Payment
              </SheetTitle>
              <SheetDescription className="text-sm text-muted-foreground">
                ${totalWithTax.toFixed(2)} • {items.length} items
              </SheetDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 rounded-full hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </SheetHeader>

      {/* Processing Indicator */}
      {isProcessing && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-primary/80 z-50">
          <div className="h-full bg-gradient-to-r from-primary/90 to-primary animate-pulse" />
        </div>
      )}

      {/* Scrollable Content */}
      <ScrollArea className="flex-1 px-4">
        <div className="space-y-6 py-4">
          {/* Payment Methods */}
          <div>
            <h3 className="font-semibold text-foreground mb-3 text-base">Select Payment Method</h3>
            <div className="grid grid-cols-2 gap-3">
              {paymentMethods.map((method) => {
                const IconComponent = method.icon;
                return (
                  <button
                    key={method.id}
                    onClick={() => setSelectedMethod(method.id)}
                    className={cn(
                      "relative p-3 rounded-xl border-2 transition-all duration-200 text-left",
                      "hover:shadow-md active:scale-95",
                      selectedMethod === method.id ? method.activeColor : method.color
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center mb-2",
                      selectedMethod === method.id ? 'bg-primary' : 'bg-background'
                    )}>
                      <IconComponent className={cn(
                        "h-4 w-4",
                        selectedMethod === method.id ? 'text-primary-foreground' : 'text-muted-foreground'
                      )} />
                    </div>
                    
                    <div>
                      <p className={cn(
                        "font-semibold text-sm mb-1",
                        selectedMethod === method.id ? 'text-foreground' : 'text-muted-foreground'
                      )}>
                        {method.label}
                      </p>
                      <p className="text-xs text-muted-foreground">{method.description}</p>
                    </div>
                    
                    {selectedMethod === method.id && (
                      <div className="absolute top-2 right-2">
                        <CheckCircle2 className="h-4 w-4 text-success" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cash Input */}
          {selectedMethod === 'cash' && (
            <Card className="border-border">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <label className="text-sm font-medium text-muted-foreground">Amount Received</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      value={cashReceived}
                      onChange={(e) => setCashReceived(e.target.value)}
                      placeholder="0.00"
                      className="h-12 text-base pl-10 pr-4 border-border focus:border-input"
                    />
                  </div>
                  {change > 0 && (
                    <div className="p-3 bg-success/10 border border-success/20 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-success text-sm">Change Due</span>
                        <span className="text-lg font-bold text-success">
                          ${change.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Order Summary */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                Order Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-48 overflow-auto">
                {items.map((item, index) => (
                  <div 
                    key={item.id} 
                    className={cn(
                      "flex items-center justify-between p-3",
                      index !== items.length - 1 && "border-b border-border"
                    )}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                        {item.images?.[0]?.url ? (
                          <img 
                            src={item.images[0].url} 
                            alt={item.name}
                            className="w-8 h-8 object-cover rounded"
                          />
                        ) : (
                          <div className="w-8 h-8 bg-muted-foreground rounded" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground text-sm truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                      </div>
                    </div>
                    <span className="font-semibold text-foreground text-sm">
                      ${item.subtotal}
                    </span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="p-3 border-t border-border bg-muted/50">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="text-foreground">${total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax (8%)</span>
                    <span className="text-foreground">${(total * 0.08).toFixed(2)}</span>
                  </div>
                  <div className="border-t border-border pt-2">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-foreground">Total</span>
                      <span className="text-lg font-bold text-foreground">
                        ${totalWithTax.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Info */}
          <Card className="border-border bg-primary/5">
            <CardContent className="p-3">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{new Date().toLocaleDateString()}</span>
                <MapPin className="h-4 w-4 ml-2" />
                <span>Store #001</span>
              </div>
            </CardContent>
          </Card>
        </div>
        <ScrollBar orientation="vertical" />
      </ScrollArea>

      {/* Fixed Action Bar */}
      <div className="border-t border-border bg-background/95 backdrop-blur-sm p-4 sticky bottom-0">
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isProcessing}
            className="flex-1 h-12 border-border text-foreground hover:bg-muted"
            size="lg"
          >
            Cancel
          </Button>
          
          <Button
            onClick={handlePayment}
            disabled={!canProceed || isProcessing}
            className={cn(
              "flex-1 h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold",
              "disabled:bg-muted disabled:cursor-not-allowed transition-all"
            )}
            size="lg"
          >
            {isProcessing ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </div>
            ) : (
              `Pay $${totalWithTax.toFixed(2)}`
            )}
          </Button>
        </div>
      </div>
    </div>
  );

  // Desktop Dialog Content
  const desktopDialogContent = (
    <DialogContent container={container} className="sm:max-w-2xl w-[95vw] max-h-[85vh] overflow-hidden p-0 border-border shadow-2xl bg-background">
      <div className="flex flex-col h-full">
        <DialogHeader className="px-6 py-4 border-b border-border">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3 text-xl font-semibold text-foreground">
              <div className="p-2 bg-primary rounded-lg">
                <Receipt className="h-5 w-5 text-primary-foreground" />
              </div>
              Complete Payment
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 rounded-full hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 overflow-auto flex-1">
          {/* Left Column - Payment Methods */}
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-foreground mb-4">Payment Method</h3>
              <div className="grid grid-cols-2 gap-3">
                {paymentMethods.map((method) => {
                  const IconComponent = method.icon;
                  return (
                    <button
                      key={method.id}
                      onClick={() => setSelectedMethod(method.id)}
                      className={cn(
                        "relative p-4 rounded-xl border-2 transition-all duration-200 text-left",
                        "hover:shadow-md hover:scale-[1.02]",
                        selectedMethod === method.id ? method.activeColor : method.color
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center mb-2",
                        selectedMethod === method.id ? 'bg-primary' : 'bg-muted'
                      )}>
                        <IconComponent className={cn(
                          "h-5 w-5",
                          selectedMethod === method.id ? 'text-primary-foreground' : 'text-muted-foreground'
                        )} />
                      </div>
                      
                      <div>
                        <p className={cn(
                          "font-semibold text-sm mb-1",
                          selectedMethod === method.id ? 'text-foreground' : 'text-muted-foreground'
                        )}>
                          {method.label}
                        </p>
                        <p className="text-xs text-muted-foreground">{method.description}</p>
                      </div>
                      
                      {selectedMethod === method.id && (
                        <CheckCircle2 className="absolute top-3 right-3 h-5 w-5 text-success" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cash Input */}
            {selectedMethod === 'cash' && (
              <div className="space-y-4">
                <label className="block text-sm font-medium text-muted-foreground">Amount Received</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value)}
                    placeholder="0.00"
                    className="h-12 text-lg pl-10 pr-4 border-border focus:border-input"
                  />
                </div>
                {change > 0 && (
                  <div className="p-3 bg-success/10 border border-success/20 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-success">Change Due</span>
                      <span className="text-lg font-bold text-success">
                        ${change.toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column - Order Summary */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Order Summary</h3>
            <Card className="border-border shadow-sm">
              <CardContent className="p-0">
                <div className="max-h-64 overflow-auto">
                  {items.map((item, index) => (
                    <div 
                      key={item.id} 
                      className={cn(
                        "flex items-center justify-between p-4",
                        index !== items.length - 1 && "border-b border-border"
                      )}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                          {item.images?.[0]?.url ? (
                            <img 
                              src={item.images[0].url} 
                              alt={item.name}
                              className="w-10 h-10 object-cover rounded"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-muted-foreground rounded"></div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-foreground truncate">{item.name}</p>
                          <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                        </div>
                      </div>
                      <span className="font-semibold text-foreground ml-2">
                        ${item.subtotal}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="p-4 border-t border-border">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="text-foreground">${total.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tax (8%)</span>
                      <span className="text-foreground">${(total * 0.08).toFixed(2)}</span>
                    </div>
                    <div className="border-t border-border pt-2">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-foreground">Total</span>
                        <span className="text-xl font-bold text-foreground">
                          ${totalWithTax.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="border-t border-border bg-background p-6">
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isProcessing}
              className="border-border text-foreground hover:bg-muted"
            >
              Cancel
            </Button>
            
            <Button
              onClick={handlePayment}
              disabled={!canProceed || isProcessing}
              className={cn(
                "bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8",
                "disabled:bg-muted disabled:cursor-not-allowed"
              )}
              size="lg"
            >
              {isProcessing ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing Payment...
                </div>
              ) : (
                `Complete ${selectedMethod} Payment`
              )}
            </Button>
          </div>
        </div>
      </div>
    </DialogContent>
  );

  if (isMobile) {
    return (
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent 
          side="bottom" 
          className="rounded-t-2xl h-[90vh] max-h-[90vh] p-0 border-border shadow-2xl bg-background"
          style={{ 
            '--sheet-enter-translate-y': '100%',
            '--sheet-exit-translate-y': '100%'
          }}
        >
          {mobileDrawerContent}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open onOpenChange={onClose}>
      {desktopDialogContent}
    </Dialog>
  );
};