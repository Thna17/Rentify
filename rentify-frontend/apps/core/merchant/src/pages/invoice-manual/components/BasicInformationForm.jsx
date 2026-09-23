import { 
  DollarSign,
  CreditCard,
  QrCode,
  Bell
} from 'lucide-react';
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

export function BasicInformationForm({ invoiceData, updateField }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Basic Information</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Invoice Number</Label>
            <Input
              value={invoiceData.invoiceNumber}
              onChange={(e) => updateField('invoiceNumber', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Payment Method</Label>
            <Select
              value={invoiceData.paymentMethod}
              onValueChange={(value) => updateField('paymentMethod', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">
                  <div className="flex items-center">
                    <DollarSign className="w-4 h-4 mr-2" />
                    Cash
                  </div>
                </SelectItem>
                <SelectItem value="card">
                  <div className="flex items-center">
                    <CreditCard className="w-4 h-4 mr-2" />
                    Card
                  </div>
                </SelectItem>
                <SelectItem value="KHQR">
                  <div className="flex items-center">
                    <QrCode className="w-4 h-4 mr-2" />
                    KHQR
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Invoice Date</Label>
            <Input
              type="date"
              value={invoiceData.createdAt}
              onChange={(e) => updateField('createdAt', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Due Date</Label>
            <Input
              type="date"
              value={invoiceData.dueDate}
              onChange={(e) => updateField('dueDate', e.target.value)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BasicInformationForm;