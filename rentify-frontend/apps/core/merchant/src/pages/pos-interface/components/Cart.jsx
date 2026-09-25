import React from 'react';
import { Button } from "@rentify/shared/ui/button";
import { ShoppingCart, Plus, Minus, X, Trash2 } from 'lucide-react';

export function Cart({
  items,
  total,
  onUpdateItem,
  onRemoveItem,
  onClearCart,
  onCheckout,
  isMobile,
  isFullscreen
}) {
  const tax = total * 0.08;
  const totalWithTax = total + tax;

  return (
    <div className="h-full flex flex-col bg-background/50">
      {/* Header */}
      <div className="p-4 border-b border-border/80 flex items-center justify-between bg-card/40 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <ShoppingCart className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-foreground">Order Summary</h3>
            <p className="text-xs text-muted-foreground">
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </p>
          </div>
        </div>
        {items.length > 0 && !isMobile && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClearCart}
            className="h-8 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Cart Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
        {items.length === 0 ? (
          <div className="h-full min-h-[240px] flex flex-col items-center justify-center text-center p-6">
            <div className="w-14 h-14 bg-muted/60 rounded-full flex items-center justify-center mb-3 text-muted-foreground">
              <ShoppingCart className="h-6 w-6" />
            </div>
            <p className="font-semibold text-foreground text-sm mb-1">Your cart is empty</p>
            <p className="text-xs text-muted-foreground max-w-[200px]">
              Tap any product in the catalog to add it to the order
            </p>
          </div>
        ) : (
          items.map((item, index) => (
            <div 
              key={item.id} 
              className="bg-card hover:bg-muted/20 transition-colors rounded-xl p-3 border border-border/70 shadow-2xs space-y-2"
            >
              {/* Item Header */}
              <div className="flex justify-between items-start gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground text-xs leading-snug truncate">{item.name}</p>
                  <p className="text-2xs text-muted-foreground mt-0.5">${parseFloat(item.price).toFixed(2)} each</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onRemoveItem(item.id)}
                  className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* Quantity Controls & Line Total */}
              <div className="flex justify-between items-center pt-1">
                <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5 border border-border/50">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onUpdateItem(item.id, Math.max(1, item.quantity - 1))}
                    disabled={item.quantity <= 1}
                    className="h-6 w-6 rounded hover:bg-background disabled:opacity-40"
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-6 text-center font-semibold text-foreground text-xs font-mono">
                    {item.quantity}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onUpdateItem(item.id, item.quantity + 1)}
                    className="h-6 w-6 rounded hover:bg-background"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>

                <span className="font-bold text-xs text-foreground font-mono">
                  ${item.subtotal.toFixed(2)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer / Summary */}
      {items.length > 0 && !isMobile && (
        <div className="p-4 border-t border-border/80 bg-card/80 space-y-3 shrink-0">
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span className="font-medium text-foreground font-mono">${total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Tax (8%)</span>
              <span className="font-medium text-foreground font-mono">${tax.toFixed(2)}</span>
            </div>
            <div className="pt-2 border-t border-border/60 flex justify-between items-baseline">
              <span className="font-bold text-foreground text-sm">Total Due</span>
              <span className="font-extrabold text-foreground text-lg font-mono">
                ${totalWithTax.toFixed(2)}
              </span>
            </div>
          </div>

          <Button
            onClick={onCheckout}
            className="w-full h-11 font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
          >
            <span>Proceed to Checkout</span>
            <span>•</span>
            <span className="font-mono">${totalWithTax.toFixed(2)}</span>
          </Button>
        </div>
      )}

      {/* Mobile Checkout Bar */}
      {items.length > 0 && isMobile && (
        <div className="p-3 border-t border-border bg-card shrink-0">
          <div className="flex justify-between items-center mb-2">
            <div>
              <p className="text-2xs text-muted-foreground">Total Due</p>
              <p className="font-bold text-base text-foreground font-mono">${totalWithTax.toFixed(2)}</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={onClearCart}
                className="h-9 px-3 border-border text-foreground"
                size="sm"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
              <Button
                onClick={onCheckout}
                className="h-9 px-4 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                size="sm"
              >
                Checkout
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Cart;