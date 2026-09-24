import { 
  DollarSign,
  CreditCard,
  QrCode,
  Calendar,
  Hash
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
    <Card className="border border-border/80 shadow-xs bg-card rounded-xl">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold text-foreground">
              Basic Information
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Invoice identifier, payment mode, and dates
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-muted-foreground" />
              Invoice Number
            </Label>
            <Input
              value={invoiceData.invoiceNumber}
              onChange={(e) => updateField('invoiceNumber', e.target.value)}
              placeholder="e.g. INV-1001"
              className="h-9.5 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
              Payment Method
            </Label>
            <Select
              value={invoiceData.paymentMethod}
              onValueChange={(value) => updateField('paymentMethod', value)}
            >
              <SelectTrigger className="h-9.5 text-sm">
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">
                  <div className="flex items-center">
                    <DollarSign className="w-4 h-4 mr-2 text-emerald-600" />
                    Cash
                  </div>
                </SelectItem>
                <SelectItem value="card">
                  <div className="flex items-center">
                    <CreditCard className="w-4 h-4 mr-2 text-blue-600" />
                    Card
                  </div>
                </SelectItem>
                <SelectItem value="KHQR">
                  <div className="flex items-center">
                    <QrCode className="w-4 h-4 mr-2 text-red-600" />
                    KHQR
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">
              Invoice Date
            </Label>
            <Input
              type="date"
              value={invoiceData.createdAt}
              onChange={(e) => updateField('createdAt', e.target.value)}
              className="h-9.5 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">
              Due Date
            </Label>
            <Input
              type="date"
              value={invoiceData.dueDate}
              onChange={(e) => updateField('dueDate', e.target.value)}
              className="h-9.5 text-sm"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default BasicInformationForm;