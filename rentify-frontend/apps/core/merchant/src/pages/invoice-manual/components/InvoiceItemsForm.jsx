import { 
  Trash2,
  Package,
} from 'lucide-react';
import { Button } from '@rentify/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@rentify/shared/ui/card';
import { Input } from '@rentify/shared/ui/input';
import { Label } from '@rentify/shared/ui/label';
import { ItemQuickAdd } from './ItemQuickAdd';

export const InvoiceItemsForm = ({ invoiceData, addItem, updateItem, removeItem }) => {
  return (
    <Card className="border border-border/80 shadow-xs bg-card rounded-xl">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-semibold text-foreground">
                  Invoice Items
                </CardTitle>
                {invoiceData.items.length > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                    {invoiceData.items.length} {invoiceData.items.length === 1 ? 'item' : 'items'}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Add products or custom items to this invoice
              </p>
            </div>
          </div>
          <ItemQuickAdd onAddItem={addItem} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {invoiceData.items.length > 0 && (
          <div className="hidden md:grid grid-cols-12 gap-3 px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/40 rounded-lg">
            <div className="col-span-5">Item & Description</div>
            <div className="col-span-2">Quantity</div>
            <div className="col-span-2">Unit Price</div>
            <div className="col-span-2 text-right">Amount</div>
            <div className="col-span-1 text-center">Action</div>
          </div>
        )}

        <div className="space-y-3">
          {invoiceData.items.map((item) => (
            <div 
              key={item.id} 
              className="p-3.5 bg-card hover:bg-muted/20 transition-colors rounded-xl border border-border/70 shadow-2xs"
            >
              {/* Mobile View */}
              <div className="md:hidden flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <Input
                    value={item.name}
                    onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                    placeholder="Item description"
                    className="h-9 text-sm"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(item.id)}
                    className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">Qty</Label>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)
                      }
                      min={1}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Price</Label>
                    <Input
                      type="number"
                      value={item.price}
                      onChange={(e) =>
                        updateItem(item.id, 'price', parseFloat(e.target.value) || 0)
                      }
                      step="0.01"
                      min="0"
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Total</Label>
                    <div className="h-8 flex items-center px-2 text-xs font-semibold text-foreground bg-muted/30 rounded border border-border/50">
                      ${(item.quantity * item.price).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Desktop View */}
              <div className="hidden md:grid grid-cols-12 gap-3 items-center">
                <div className="col-span-5">
                  <Input
                    value={item.name}
                    onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                    placeholder="Item name or service description"
                    className="h-9.5 text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    type="number"
                    value={item.quantity}
                    onChange={(e) =>
                      updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)
                    }
                    min={1}
                    className="h-9.5 text-sm"
                  />
                </div>
                <div className="col-span-2">
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">$</span>
                    <Input
                      type="number"
                      value={item.price}
                      onChange={(e) =>
                        updateItem(item.id, 'price', parseFloat(e.target.value) || 0)
                      }
                      step="0.01"
                      min="0"
                      className="pl-7 h-9.5 text-sm"
                    />
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="h-9.5 flex items-center justify-end px-3 font-semibold text-sm text-foreground bg-muted/20 rounded-md border border-border/40">
                    ${(item.quantity * item.price).toFixed(2)}
                  </div>
                </div>
                <div className="col-span-1 flex justify-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(item.id)}
                    className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}

          {invoiceData.items.length === 0 && (
            <div className="py-12 px-4 text-center border-2 border-dashed rounded-xl border-border/80 bg-muted/10 flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3 text-muted-foreground">
                <Package className="w-6 h-6" />
              </div>
              <h4 className="font-semibold text-foreground text-sm mb-1">
                No items added yet
              </h4>
              <p className="text-xs text-muted-foreground max-w-sm mb-4">
                Select from your existing product inventory or add custom items to populate this invoice.
              </p>
              <ItemQuickAdd onAddItem={addItem} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
