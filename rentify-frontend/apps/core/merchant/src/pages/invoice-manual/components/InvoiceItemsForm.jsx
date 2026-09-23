import { 
  Calculator, 
  Trash2,
} from 'lucide-react';
import { Button } from '@rentify/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@rentify/shared/ui/card';
import { Input } from '@rentify/shared/ui/input';
import { Label } from '@rentify/shared/ui/label';
import { ItemQuickAdd } from './ItemQuickAdd';
export const InvoiceItemsForm = ({ invoiceData, addItem, updateItem, removeItem }) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2">
          <CardTitle>Invoice Items</CardTitle>
          <ItemQuickAdd onAddItem={addItem} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {invoiceData.items.map((item) => (
            <div key={item.id} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border">
              <div className="md:hidden flex flex-col gap-3">
                <div className="flex justify-between">
                  <Input
                    value={item.name}
                    onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                    placeholder="Item description"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(item.id)}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label>Qty</Label>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)
                      }
                      min={1}
                    />
                  </div>
                  <div>
                    <Label>Price</Label>
                    <Input
                      type="number"
                      value={item.price}
                      onChange={(e) =>
                        updateItem(item.id, 'price', parseFloat(e.target.value) || 0)
                      }
                      step="0.01"
                      min="0"
                    />
                  </div>
                  <div>
                    <Label>Total</Label>
                    <Input
                      value={`$${(item.quantity * item.price).toFixed(2)}`}
                      readOnly
                    />
                  </div>
                </div>
              </div>

              <div className="hidden md:grid grid-cols-12 gap-4 items-center">
                <div className="col-span-5">
                  <Input
                    value={item.name}
                    onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                    placeholder="Item description"
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
                  />
                </div>
                <div className="col-span-3">
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500">$</span>
                    <Input
                      type="number"
                      value={item.price}
                      onChange={(e) =>
                        updateItem(item.id, 'price', parseFloat(e.target.value) || 0)
                      }
                      step="0.01"
                      min="0"
                      className="pl-7"
                    />
                  </div>
                </div>
                <div className="col-span-1">
                  <Input
                    value={`$${(item.quantity * item.price).toFixed(2)}`}
                    readOnly
                  />
                </div>
                <div className="col-span-1 flex justify-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(item.id)}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>
            </div>
          ))}

          {invoiceData.items.length === 0 && (
            <div className="py-8 text-center border-2 border-dashed rounded-lg border-gray-300">
              <Calculator className="w-12 h-12 mx-auto text-gray-400 mb-3" />
              <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-1">
                No items added
              </h4>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Add items to your invoice
              </p>
              <ItemQuickAdd onAddItem={addItem} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
