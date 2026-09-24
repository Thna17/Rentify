import { Card, CardContent, CardHeader, CardTitle } from '@rentify/shared/ui/card';
import { Input } from '@rentify/shared/ui/input';
import { Label } from '@rentify/shared/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@rentify/shared/ui/select';
import { Percent } from 'lucide-react';

export const TaxDiscountForm = ({ invoiceData, updateField }) => {
  return (
    <Card className="border border-border/80 shadow-xs bg-card rounded-xl">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Percent className="w-4 h-4" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold text-foreground">
              Taxes & Totals
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Discounts, tax deductions, and calculated total
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">
              Discount (%)
            </Label>
            <Input
              type="number"
              value={invoiceData.discount}
              onChange={(e) => updateField('discount', parseFloat(e.target.value) || 0)}
              min={0}
              max={100}
              step={0.1}
              placeholder="0"
              className="h-9.5 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">
              Tax Type
            </Label>
            <Select
              value={invoiceData.taxType}
              onValueChange={(value) => updateField('taxType', value)}
            >
              <SelectTrigger className="h-9.5 text-sm">
                <SelectValue placeholder="Select tax" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Tax (0%)</SelectItem>
                <SelectItem value="vat">VAT (10%)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Live Calculation Summary */}
        <div className="p-4 rounded-xl bg-muted/40 border border-border/60 space-y-2.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Subtotal</span>
            <span className="font-medium text-foreground">{invoiceData.subtotal}</span>
          </div>
          {invoiceData.discountAmount !== '$0.00' && (
            <div className="flex justify-between text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              <span>Discount ({invoiceData.discount}%)</span>
              <span>-{invoiceData.discountAmount}</span>
            </div>
          )}
          {invoiceData.taxAmount !== '$0.00' && (
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Tax ({invoiceData.taxType === 'vat' ? 'VAT 10%' : 'Tax'})</span>
              <span className="font-medium text-foreground">+{invoiceData.taxAmount}</span>
            </div>
          )}
          <div className="pt-2.5 border-t border-border/80 flex justify-between items-baseline">
            <span className="text-sm font-bold text-foreground">Total Due</span>
            <span className="text-xl font-extrabold text-primary tracking-tight">
              {invoiceData.total}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};