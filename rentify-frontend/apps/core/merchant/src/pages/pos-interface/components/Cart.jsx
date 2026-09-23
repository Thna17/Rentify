import React from 'react';
import { Button } from "@rentify/shared/ui/button";
import { Badge } from "@rentify/shared/ui/badge";
import { Card, CardContent, CardHeader } from "@rentify/shared/ui/card";
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
    <Card className="h-full flex flex-col border-border bg-background shadow-sm">
      {/* Enhanced Header */}
      <CardHeader className="flex flex-row items-center justify-between  border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <ShoppingCart className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Order Summary</h3>
            <p className="text-sm text-muted-foreground">{items.length} items</p>
          </div>
        </div>
        {items.length > 0 && !isMobile && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClearCart}
            className="text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Clear All
          </Button>
        )}
      </CardHeader>

      {/* Enhanced Cart Content */}
      <CardContent className="flex-1 overflow-auto p-0">
        {items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4">
              <ShoppingCart className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="font-medium text-foreground mb-1">Your cart is empty</p>
            <p className="text-sm text-muted-foreground">Add products to start ordering</p>
          </div>
        ) : (
          <div className="space-y-4 p-6">
            {items.map((item, index) => (
              <div key={item.id} className="bg-muted rounded-lg p-4 border border-border hover:border-input transition-colors">
                {/* Item Header */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-8 h-8 bg-muted rounded flex items-center justify-center">
                      <span className="text-sm font-medium text-muted-foreground">{index + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm leading-tight mb-1">{item.name}</p>
                      <p className="text-xs text-muted-foreground">${item.price} each</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemoveItem(item.id)}
                    className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted-foreground/20"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {/* Quantity Controls */}
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => onUpdateItem(item.id, Math.max(1, item.quantity - 1))}
                      disabled={item.quantity <= 1}
                      className="h-8 w-8 border-border hover:border-input disabled:opacity-50"
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-10 text-center font-semibold text-foreground text-sm">
                      {item.quantity}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => onUpdateItem(item.id, item.quantity + 1)}
                      className="h-8 w-8 border-border hover:border-input"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>

                  <Badge variant="secondary" className="bg-primary text-primary-foreground font-semibold px-3 py-1">
                    ${item.subtotal.toFixed(2)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Enhanced Footer */}
      {items.length > 0 && !isMobile && (
        <div className="p-6 border-t border-border bg-muted/50">
          <div className="space-y-3 mb-6">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium text-foreground">${total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Tax (8%)</span>
              <span className="font-medium text-foreground">${tax.toFixed(2)}</span>
            </div>
            <div className="border-t border-border pt-3">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-foreground text-base">Total</span>
                <span className="font-bold text-foreground text-lg">
                  ${totalWithTax.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <Button
            onClick={onCheckout}
            className="w-full h-12 font-semibold bg-primary hover:bg-primary/90 text-primary-foreground transition-colors"
            size="lg"
          >
            Proceed to Checkout
          </Button>
        </div>
      )}

      {/* Mobile Checkout Bar */}
      {items.length > 0 && isMobile && (
        <div className="p-4 border-t border-border bg-background">
          <div className="flex justify-between items-center mb-3">
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="font-bold text-lg text-foreground">${totalWithTax.toFixed(2)}</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={onClearCart}
                className="border-border text-foreground"
                size="sm"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button
                onClick={onCheckout}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                size="sm"
              >
                Checkout
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}