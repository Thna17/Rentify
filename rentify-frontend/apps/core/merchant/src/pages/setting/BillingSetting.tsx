// billing-setting.tsx
import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@rentify/shared/ui/card';
import { Button } from '@rentify/shared/ui/button';
import { Badge } from '@rentify/shared/ui/badge';
import {
  CreditCard, Plus, Download, Receipt, Calendar,
  CheckCircle2, MoreVertical, Trash2, Edit
} from 'lucide-react';
import { toast } from 'sonner';
import { SettingsLayout } from '../../layouts/setting/SettingsLayout';

export const BillingSetting = () => {
  const [paymentMethods] = useState([
    {
      id: 1,
      type: 'Visa',
      last4: '4242',
      expiry: '12/24',
      isDefault: true,
    },
    {
      id: 2,
      type: 'Mastercard',
      last4: '8888',
      expiry: '08/25',
      isDefault: false,
    },
  ]);

  const [invoices] = useState([
    { id: 'INV-001', date: 'Jan 15, 2024', amount: '$49.00', status: 'Paid' },
    { id: 'INV-002', date: 'Dec 15, 2023', amount: '$49.00', status: 'Paid' },
    { id: 'INV-003', date: 'Nov 15, 2023', amount: '$49.00', status: 'Paid' },
  ]);

  const addPaymentMethod = () => {
    toast.success('Redirecting to payment method setup...');
  };

  const downloadInvoice = (invoiceId: string) => {
    toast.success(`Downloading invoice ${invoiceId}...`);
  };

  return (
    <SettingsLayout
      title="Billing & Payments"
      description="Manage your payment methods and billing history"
      icon={<CreditCard />}
    >
      {/* Current Plan */}
      <Card className="shadow-sm border-0">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Current Plan</CardTitle>
          <CardDescription>
            Your current subscription plan and billing details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-xl font-bold">Professional Plan</h3>
                <Badge variant="secondary">Active</Badge>
              </div>
              <p className="text-gray-600 mt-1">$49.00/month • Next billing date: Feb 15, 2024</p>
            </div>
            <Button variant="outline">Change Plan</Button>
          </div>
        </CardContent>
      </Card>

      {/* Payment Methods */}
      <Card className="shadow-sm border-0">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold">Payment Methods</CardTitle>
              <CardDescription>
                Manage your saved payment methods
              </CardDescription>
            </div>
            <Button onClick={addPaymentMethod} className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>Add Payment Method</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {paymentMethods.map((method) => (
              <div key={method.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <CreditCard className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <div className="font-medium">
                      {method.type} •••• {method.last4}
                    </div>
                    <div className="text-sm text-gray-500">
                      Expires {method.expiry}
                      {method.isDefault && (
                        <Badge variant="outline" className="ml-2 bg-blue-50 text-blue-700">
                          Default
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {method.isDefault && (
                    <Badge variant="secondary" className="bg-green-50 text-green-700">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Default
                    </Badge>
                  )}
                  <Button variant="ghost" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Billing History */}
      <Card className="shadow-sm border-0">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Billing History</CardTitle>
          <CardDescription>
            View and download your past invoices
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {invoices.map((invoice) => (
              <div key={invoice.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <Receipt className="h-4 w-4 text-gray-600" />
                  </div>
                  <div>
                    <div className="font-medium">{invoice.id}</div>
                    <div className="text-sm text-gray-500 flex items-center space-x-2">
                      <Calendar className="h-3 w-3" />
                      <span>{invoice.date}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="font-medium">{invoice.amount}</div>
                    <Badge variant="outline" className="bg-green-50 text-green-700">
                      {invoice.status}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => downloadInvoice(invoice.id)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </SettingsLayout>
  );
};

export default BillingSetting;