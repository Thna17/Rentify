import React, { useState } from 'react';
import { useTranslation } from '@rentify/utils/contexts/TranslationContext';
import { Button } from '@rentify/shared/ui/button';
import { ShoppingBag, ChevronDown, ArrowLeftRight, X, Check } from 'lucide-react';
import { SummarySection } from './SummarySection';
import { Drawer } from 'vaul';

export const MobileSummaryDrawer = ({
  open,
  onClose,
  totalQuantity,
  summary,
  currency = 'USD',
  setCurrency,
  isCheckout = false,
}) => {
  const { t } = useTranslation();
  const [showCurrencyConverter, setShowCurrencyConverter] = useState(false);

  return (
    <Drawer.Root open={open} onOpenChange={onClose} dismissible={true}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 mt-24 flex h-[70%] flex-col rounded-t-[10px] bg-background outline-none">
          <div className="flex-1 overflow-y-auto rounded-t-[10px] p-2 pb-8">
            {/* Custom handle */}
            <div className="mx-auto mb-4 h-1.5 w-16 rounded-full bg-border" />
            
            <div className="px-6 pb-6 h-full flex flex-col overflow-hidden">
              <div className="text-left py-4">
                <div className="flex items-center justify-between">
                  {showCurrencyConverter ? (
                    <>
                      <Drawer.Title className="text-xl font-bold text-foreground">
                        {t('checkout.currency_converter')}
                      </Drawer.Title>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => setShowCurrencyConverter(false)}
                        className="h-9 w-9 rounded-full"
                      >
                        <ArrowLeftRight className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Drawer.Title className="text-2xl font-bold text-foreground">
                        {t('cart.order_summary')}
                      </Drawer.Title>
                      <Drawer.Close asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-10 w-10 rounded-full hover:bg-muted"
                        >
                          <X className="h-5 w-5" />
                        </Button>
                      </Drawer.Close>
                    </>
                  )}
                </div>
              </div>

              {showCurrencyConverter ? (
                // Currency Converter View
                <div className="flex-1 overflow-y-auto pb-4">
                  <div className="bg-muted/30 p-4 rounded-2xl mb-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-medium">{t('checkout.select_currency')}</h3>
                      <div className="bg-primary/10 text-primary text-xs font-medium px-2 py-1 rounded-full">
                        {t('checkout.live_rate')}
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      {[
                        { value: 'USD', symbol: '$', label: 'USD', rate: '1 USD = 4,100 KHR' },
                        { value: 'KHR', symbol: '៛', label: 'KHR', rate: '1 KHR = 0.00024 USD' }
                      ].map((option) => (
                        <div 
                          key={option.value}
                          className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                            currency === option.value 
                              ? 'border-primary bg-primary/5' 
                              : 'border-border bg-background'
                          }`}
                          onClick={() => {
                            setCurrency(option.value);
                            setShowCurrencyConverter(false);
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                                currency === option.value ? 'bg-primary/10' : 'bg-muted'
                              }`}>
                                <span className="text-lg font-semibold">{option.symbol}</span>
                              </div>
                              <div>
                                <p className="font-medium">{option.label}</p>
                                <p className="text-sm text-muted-foreground">{option.rate}</p>
                              </div>
                            </div>
                            {currency === option.value && (
                              <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                                <Check className="h-3 w-3 text-primary-foreground" />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <p className="text-xs text-muted-foreground mt-4 text-center">
                      {t('checkout.rate_disclaimer')}
                    </p>
                  </div>
                </div>
              ) : (
                // Standard Summary View
                <>
                  {/* Item count badge */}
                  <div className="flex items-center gap-3 bg-primary/5 p-4 rounded-xl mb-6 border border-primary/10">
                    <div className="bg-primary/10 rounded-full p-2.5 flex items-center justify-center">
                      <ShoppingBag className="h-5 w-5 text-primary" />
                    </div>
                    <p className="text-base font-medium">
                      {t('cart.item_count', {
                        count: totalQuantity,
                        item: totalQuantity === 1 ? t('cart.item') : t('cart.items'),
                      })}
                    </p>
                  </div>

                  {/* Currency toggle for checkout */}
                  {isCheckout && (
                    <div className="mb-6">
                      <div 
                        className="flex items-center justify-between p-4 bg-muted/30 rounded-xl cursor-pointer"
                        onClick={() => setShowCurrencyConverter(true)}
                      >
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            {t('checkout.currency')}
                          </p>
                          <p className="font-semibold">
                            {currency === 'USD' ? '$ USD' : '៛ KHR'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <span className="text-sm">{t('checkout.change')}</span>
                          <ChevronDown className="h-4 w-4" />
                        </div>
                      </div>
                      
                      {/* Quick conversion preview */}
                      <div className="mt-3 flex justify-between items-center text-sm text-muted-foreground">
                        <span>
                          {currency === 'USD' 
                            ? `៛ ${(summary.total * 4100).toLocaleString()} KHR` 
                            : `$ ${(summary.total / 4100).toFixed(2)} USD`
                          }
                        </span>
                        <span className="text-xs bg-muted px-2 py-1 rounded-full">
                          {t('checkout.approx')}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Summary section with scroll if needed */}
                  <div className="flex-1 overflow-y-auto pb-4">
                    <SummarySection
                      summary={summary}
                      itemCount={totalQuantity}
                      currency={currency}
                      showCheckoutButton={false}
                      isMobile={true}
                      isCheckout={isCheckout}
                    />
                  </div>

                </>
              )}
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
};
