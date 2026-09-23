import { Card, CardContent, CardHeader, CardTitle } from '@rentify/shared/ui/card';
import { Input } from '@rentify/shared/ui/input';
import { Label } from '@rentify/shared/ui/label';
import { CustomerQuickAdd } from './CustomerQuickAdd';

export const CustomerInformationForm = ({ invoiceData, updateField, handleCustomerSelect }) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2">
          <CardTitle>Customer Information</CardTitle>
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
        <div className="grid grid-cols-1 gap-4">
          <div className="space-y-2">
            <Label>Customer Name</Label>
            <Input
              value={invoiceData.customerName}
              onChange={(e) => updateField('customerName', e.target.value)}
              placeholder="John Doe"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input
                value={invoiceData.customerPhone}
                onChange={(e) => updateField('customerPhone', e.target.value)}
                placeholder="+1 (555) 123-4567"
              />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input
                value={invoiceData.address}
                onChange={(e) => updateField('address', e.target.value)}
                placeholder="123 Main St, City"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};