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

export const TaxDiscountForm = ({ invoiceData, updateField }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tax & Discount</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Discount (%)</Label>
            <Input
              type="number"
              value={invoiceData.discount}
              onChange={(e) => updateField('discount', parseFloat(e.target.value) || 0)}
              min={0}
              max={100}
              step={0.1}
            />
          </div>
          <div className="space-y-2">
            <Label>Tax Type</Label>
            <Select
              value={invoiceData.taxType}
              onValueChange={(value) => updateField('taxType', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select tax" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Tax</SelectItem>
                <SelectItem value="vat">VAT (10%)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Total Amount</Label>
            <Input
              value={invoiceData.total}
              readOnly
              className="font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};