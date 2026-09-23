import React from 'react';
import { useTranslation } from '@rentify/utils/contexts/TranslationContext';
import { Card, CardContent } from '@rentify/shared/ui/card';
import { Button } from '@rentify/shared/ui/button';
import { Separator } from '@rentify/shared/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@rentify/shared/ui/dropdown-menu';
import { Lock, CreditCard, ShoppingCart, ChevronDown, Check } from 'lucide-react';

export const SummarySection = ({
  summary,
  itemCount,
  currency,
  setCurrency,
  showCheckoutButton = false,
  showCurrencySwitch = false,
  isMobile = false,
  onCheckout,
  actionLabel = 'Proceed to Checkout',
  onAction,
  isLoading = false,
  error,
  conversionRate = 4000,
  showSecurityFooter = false,
  showActionButtons = false,
  isFinalStep = false,
  onBack,
  activeStep
}) => {
  const { t } = useTranslation();

  const formatValue = (value) => {
    if (currency === 'KHR') {
      const khrValue = Math.round(value * conversionRate);
      return `៛${khrValue.toLocaleString()}`;
    }
    return `$${value}`;
  };

  const summaryItems = [
    {
      label: t('cart.subtotal', { count: itemCount }),
      value: summary.subtotal,
    },
    {
      label: t('cart.shipping'),
      value: summary.shipping,
      freeLabel: summary.shipping === 0 ? t('cart.free') : undefined,
      highlight: summary.shipping === 0,
    },
    ...(summary.tax && summary.tax > 0
      ? [{
          label: t('cart.tax'),
          value: summary.tax,
        }]
      : []),
    ...(summary.discount && summary.discount > 0
      ? [{
          label: t('cart.discount'),
          value: summary.discount,
          isDiscount: true,
        }]
      : []),
  ];

  // Currency options
  const currencyOptions = [
    { value: 'USD', symbol: '$', label: 'USD' },
    { value: 'KHR', symbol: '៛', label: 'KHR' },
  ];

  return (
    <Card className={'w-full shadow-lg border-border/50'}>
      <CardContent className="p-6 space-y-6">
        {/* Header Section */}
        {!isMobile && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold flex items-center gap-3">
                <ShoppingCart className="h-6 w-6 text-primary" />
                {t('cart.order_summary')}
              </h3>

              {showCurrencySwitch && setCurrency && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="gap-2 h-10 px-3">
                      <span className="font-medium">{currency === 'USD' ? '$' : '៛'}</span>
                      <span>{currency}</span>
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    {currencyOptions.map((option) => (
                      <DropdownMenuItem
                        key={option.value}
                        onClick={() => setCurrency(option.value)}
                        className="flex items-center justify-between gap-2 py-3"
                      >
                        <span className="font-medium">{option.symbol} {option.label}</span>
                        {currency === option.value && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            <Separator />
          </div>
        )}

        {/* Summary Items */}
        <div className="space-y-4">
          {summaryItems.map((item, index) => (
            <div key={index} className="flex justify-between items-center">
              <span className="text-base text-muted-foreground">{item.label}</span>
              <span className={`text-base font-medium ${
                item.highlight ? 'text-green-600' : 
                item.isDiscount ? 'text-destructive' : 'text-foreground'
              }`}>
                {item.freeLabel || (item.isDiscount ? `-${formatValue(item.value)}` : formatValue(item.value))}
              </span>
            </div>
          ))}
        </div>

        <Separator className="my-4" />

        {/* Total Section */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold">{t('cart.total')}</span>
            <span className="text-2xl font-bold text-primary">{formatValue(summary.total)}</span>
          </div>

          {currency === 'KHR' && (
            <p className="text-sm text-muted-foreground text-right">
              {t('checkout.approx_usd', {
                amount: `$${summary.total}`,
              })}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        {/* For non-checkout contexts */}
        {showActionButtons && (
          <div className="space-y-4 pt-4">
            <Button
              onClick={onAction}
              disabled={isLoading}
              size="lg"
              className="w-full py-6 text-base rounded-xl"
              variant={isFinalStep ? "default" : "default"}
            >
              {isLoading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-background border-t-transparent" />
              ) : (
                actionLabel
              )}
            </Button>

            {onBack && (
              <Button
                variant="outline"
                onClick={onBack}
                size="lg"
                className="w-full py-6 text-base rounded-xl border-border"
              >
                {activeStep === 0 
                  ? t('checkout.back_to_cart') 
                  : t('checkout.back_to_previous')}
              </Button>
            )}
          </div>
        )}

        {/* Security Footer */}
        {showSecurityFooter && (
          <div className="mt-6 pt-4 border-t text-center border-border">
            <div className="flex items-center justify-center gap-2">
              <Lock className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-muted-foreground">
                {t('checkout.secure_checkout')}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
export default SummarySection;
