import React, { useState } from 'react';
import { Button } from "@rentify/shared/ui/button";
import { ShoppingCart, Plus, Minus, Trash2, QrCode, Banknote } from 'lucide-react';
import { cn } from '@rentify/utils';

const TAX_RATE = 0.08;
const money = (value) => `$${Number(value || 0).toFixed(2)}`;

const PAYMENT_OPTIONS = [
  { id: 'KHQR', label: 'KHQR', icon: QrCode },
  { id: 'cash', label: 'Cash', icon: Banknote },
];

export function Cart({
  items,
  total,
  onUpdateItem,
  onRemoveItem,
  onClearCart,
  onCheckout,
  isMobile,
}) {
  const [paymentMethod, setPaymentMethod] = useState('KHQR');

  const tax = total * TAX_RATE;
  const totalWithTax = total + tax;
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  // Savings already reflected in the line price; shown for the cashier only.
  const discount = items.reduce((sum, item) => {
    const original = parseFloat(item.originalPrice || 0);
    const price = parseFloat(item.price || 0);
    return original > price ? sum + (original - price) * item.quantity : sum;
  }, 0);

  const charge = () => onCheckout(paymentMethod);

  return (
    <div className="h-full flex flex-col bg-card">
      <div className="px-5 pt-5 pb-3 flex items-center justify-between shrink-0">
        <h3 className="text-lg font-bold tracking-tight text-foreground">
          Current sale
          {itemCount > 0 && (
            <span
              key={itemCount}
              className="ml-2 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-primary/10 px-2 align-middle text-xs font-bold text-primary ds-bump"
            >
              {itemCount}
            </span>
          )}
        </h3>
        {items.length > 0 && (
          <button
            type="button"
            onClick={onClearCart}
            className="text-sm font-semibold text-destructive hover:text-destructive/80 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-5">
        {items.length === 0 ? (
          <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-center py-8">
            <div className="w-12 h-12 bg-muted rounded-2xl flex items-center justify-center mb-3 text-muted-foreground">
              <ShoppingCart className="h-5 w-5" />
            </div>
            <p className="font-semibold text-foreground text-sm">No items yet</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-[220px]">
              Tap a product or scan a barcode to start a sale.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {items.map((item) => (
              <li key={item.id} className="flex gap-3 py-3.5 ds-page">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-muted">
                  {item.images?.[0]?.url && (
                    <img src={item.images[0].url} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground leading-snug line-clamp-2">
                      {item.name}
                    </p>
                    <span className="text-sm font-bold text-foreground tabular-nums">
                      {money(item.subtotal)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{money(item.price)} each</p>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center rounded-xl bg-muted">
                      <button
                        type="button"
                        aria-label="Decrease quantity"
                        onClick={() => onUpdateItem(item.id, Math.max(1, item.quantity - 1))}
                        disabled={item.quantity <= 1}
                        className="h-8 w-8 flex items-center justify-center text-foreground hover:bg-card rounded-l-xl disabled:opacity-40"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-8 text-center text-sm font-semibold tabular-nums">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        aria-label="Increase quantity"
                        onClick={() => onUpdateItem(item.id, item.quantity + 1)}
                        className="h-8 w-8 flex items-center justify-center text-foreground hover:bg-card rounded-r-xl"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <button
                      type="button"
                      aria-label={`Remove ${item.name}`}
                      onClick={() => onRemoveItem(item.id)}
                      className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={cn('shrink-0 border-t border-border/60 px-5 pt-4 pb-5 space-y-4', isMobile && 'pb-4')}>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <dt>Subtotal</dt>
            <dd className="text-foreground font-medium tabular-nums">{money(total)}</dd>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <dt>Discount</dt>
            <dd className="text-foreground font-medium tabular-nums">-{money(discount)}</dd>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <dt>Tax ({TAX_RATE * 100}%)</dt>
            <dd className="text-foreground font-medium tabular-nums">{money(tax)}</dd>
          </div>
          <div className="flex justify-between items-baseline pt-3 border-t border-border/70">
            <dt className="text-base font-bold text-foreground">Total</dt>
            <dd className="text-2xl font-extrabold tracking-tight text-foreground tabular-nums">
              {money(totalWithTax)}
            </dd>
          </div>
        </dl>

        <div className="grid grid-cols-2 gap-2.5">
          {PAYMENT_OPTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setPaymentMethod(id)}
              aria-pressed={paymentMethod === id}
              className={cn(
                'h-12 flex items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition-colors',
                paymentMethod === id
                  ? 'border-primary bg-primary/[0.06] text-primary'
                  : 'border-transparent bg-muted text-foreground hover:bg-muted/70'
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
            </button>
          ))}
        </div>

        <Button
          onClick={charge}
          disabled={items.length === 0}
          className="w-full h-14 rounded-xl text-base font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_8px_20px_-8px_oklch(var(--primary))] disabled:shadow-none"
        >
          Charge {money(totalWithTax)}
        </Button>
      </div>
    </div>
  );
}

export default Cart;
