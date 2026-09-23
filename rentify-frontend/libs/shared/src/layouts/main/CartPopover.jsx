import { ShoppingCart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@rentify/shared/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@rentify/shared/ui/popover';

export const CartPopover = ({ cartItems, cartCount, subtotal }) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Shopping cart"
          className="relative rounded-full h-10 w-10 transition-all duration-200 hover:bg-accent hover:shadow-sm"
        >
          <ShoppingCart className="h-5 w-5 text-muted-foreground" />
          {cartCount > 0 && (
            <span className="absolute -right-1 -top-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium shadow-sm">
              {cartCount > 99 ? '99+' : cartCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-96 p-0 rounded-xl shadow-lg border bg-card overflow-hidden"
        sideOffset={8}
      >
        <div className="flex items-center justify-between p-4 border-b bg-muted/30">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Your Cart
          </h3>
          <span className="text-sm text-muted-foreground bg-accent px-2 py-1 rounded-md">
            {cartCount} {cartCount === 1 ? 'item' : 'items'}
          </span>
        </div>

        <div className="max-h-80 overflow-auto divide-y">
          {cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <ShoppingCart className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="font-medium text-foreground mb-1">
                Your cart is empty
              </p>
              <p className="text-sm text-muted-foreground">
                Start shopping to add items to your cart
              </p>
            </div>
          ) : (
            cartItems.map((item) => (
              <div
                key={item.id}
                className="p-4 hover:bg-accent/30 transition-colors duration-200"
              >
                <div className="flex gap-4">
                  <div className="relative">
                    <img
                      src={item?.Product?.images[0]?.url}
                      alt={item.Product.name}
                      loading="lazy"
                      className="h-16 w-16 rounded-md object-cover border"
                    />
                    <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                      {item.quantity}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-foreground truncate">
                      {item.Product.name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      ${item.Product.price} × {item.quantity}
                    </div>
                  </div>
                  <div className="font-semibold text-foreground">
                    ${(item.quantity * item.Product.price).toFixed(2)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {cartItems.length > 0 && (
          <>
            <div className="border-t p-4 bg-muted/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Subtotal</span>
                <span className="font-semibold">${subtotal}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Shipping & taxes calculated at checkout</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 p-4 border-t">
              <Button
                variant="outline"
                asChild
                className="h-10 rounded-md border"
              >
                <Link to="/cart" className="flex items-center justify-center">
                  View Cart
                </Link>
              </Button>
              <Button
                className="h-10 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors duration-200"
                asChild
              >
                <Link
                  to="/checkout"
                  className="flex items-center justify-center"
                >
                  Checkout
                </Link>
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
};