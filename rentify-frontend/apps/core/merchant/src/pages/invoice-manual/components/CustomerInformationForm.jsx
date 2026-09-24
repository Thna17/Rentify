import { Card, CardContent, CardHeader, CardTitle } from '@rentify/shared/ui/card';
import { Input } from '@rentify/shared/ui/input';
import { Label } from '@rentify/shared/ui/label';
import { User, Phone, MapPin } from 'lucide-react';
import { CustomerQuickAdd } from './CustomerQuickAdd';

export const CustomerInformationForm = ({ invoiceData, updateField, handleCustomerSelect }) => {
  return (
    <Card className="border border-border/80 shadow-xs bg-card rounded-xl">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <User className="w-4 h-4" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-foreground">
                Customer Information
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Recipient billing and contact details
              </p>
            </div>
          </div>
          <CustomerQuickAdd
            currentCustomer={{
              name: invoiceData.customerName,
              phone: invoiceData.customerPhone,
              address: invoiceData.address,
            }}
            onCustomerSelect={handleCustomerSelect}
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-muted-foreground" />
              Customer Name
            </Label>
            <Input
              value={invoiceData.customerName}
              onChange={(e) => updateField('customerName', e.target.value)}
              placeholder="e.g. John Doe"
              className="h-9.5 text-sm"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                Phone Number
              </Label>
              <Input
                value={invoiceData.customerPhone}
                onChange={(e) => updateField('customerPhone', e.target.value)}
                placeholder="e.g. +855 12 345 678"
                className="h-9.5 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                Billing Address
              </Label>
              <Input
                value={invoiceData.address}
                onChange={(e) => updateField('address', e.target.value)}
                placeholder="e.g. #123 St 271, Phnom Penh"
                className="h-9.5 text-sm"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};