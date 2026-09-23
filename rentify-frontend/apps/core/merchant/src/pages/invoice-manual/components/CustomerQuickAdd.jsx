import React, { useState } from 'react';
import { Button } from '@rentify/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@rentify/shared/ui/dialog';
import { Input } from '@rentify/shared/ui/input';
import { Label } from '@rentify/shared/ui/label';
import { Card, CardContent } from '@rentify/shared/ui/card';
import { Separator } from '@rentify/shared/ui/separator';
import { 
  Users, 
  Search, 
  UserPlus, 
  Phone, 
  MapPin,
  Mail,
  CheckCircle2
} from 'lucide-react';
import { useTranslation } from '@rentify/utils';

const RECENT_CUSTOMERS = [
  { name: 'John Smith', phone: '+1 (555) 123-4567', address: '123 Main St, NYC' },
  { name: 'Sarah Johnson', phone: '+1 (555) 987-6543', address: '456 Oak Ave, LA' },
  { name: 'Michael Brown', phone: '+1 (555) 456-7890', address: '789 Pine St, Chicago' },
  { name: 'Emily Davis', phone: '+1 (555) 321-0987', address: '321 Elm St, Houston' }
];

export const CustomerQuickAdd = ({ 
  currentCustomer, 
  onCustomerSelect 
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newCustomer, setNewCustomer] = useState(currentCustomer);
  const [showSuccess, setShowSuccess] = useState(false);

  const filteredCustomers = RECENT_CUSTOMERS.filter(customer =>
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.phone.includes(searchQuery)
  );

  const handleCustomerSelect = (customer) => {
    onCustomerSelect(customer);
    setShowSuccess(true);
    setTimeout(() => {
      setIsOpen(false);
      setShowSuccess(false);
    }, 800);
  };

  const handleNewCustomerSave = () => {
    if (newCustomer.name.trim()) {
      onCustomerSelect(newCustomer);
      setShowSuccess(true);
      setTimeout(() => {
        setIsOpen(false);
        setShowSuccess(false);
      }, 800);
    }
  };

  const handleInputChange = (field, value) => {
    setNewCustomer(prev => ({ 
      ...prev, 
      [field]: value 
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full sm:w-auto">
          <Users className="w-4 h-4 mr-2" />
          {currentCustomer.name ? 
            t('dashboard.invoices.change_customer') : 
            t('dashboard.invoices.select_customer')
          }
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        {showSuccess ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
            <h3 className="text-lg font-semibold">Customer Selected!</h3>
            <p className="text-muted-foreground">Customer information has been updated</p>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                {t('dashboard.invoices.customer_information')}
              </DialogTitle>
              <DialogDescription>
                Select from recent customers or add a new one
              </DialogDescription>
            </DialogHeader>

            {/* Recent Customers Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-blue-500" />
                <h3 className="font-semibold text-sm">{t('dashboard.invoices.recent_customers')}</h3>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={t('dashboard.invoices.search_customers')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 focus-visible:ring-blue-500"
                />
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {filteredCustomers.map((customer, index) => (
                  <Card 
                    key={index}
                    className="cursor-pointer transition-all hover:shadow-md hover:border-blue-200 active:scale-95"
                    onClick={() => handleCustomerSelect(customer)}
                  >
                    <CardContent className="p-3">
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm">{customer.name}</h4>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            <span>{customer.phone}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            <span className="truncate">{customer.address}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {filteredCustomers.length === 0 && searchQuery && (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    {t('dashboard.invoices.no_customers_found')}
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* New Customer Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-green-500" />
                <h3 className="font-semibold text-sm">{t('dashboard.invoices.new_customer')}</h3>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="customerName">
                    {t('dashboard.invoices.customer_name')} *
                  </Label>
                  <Input
                    id="customerName"
                    value={newCustomer.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder={t('dashboard.invoices.customer_name_placeholder')}
                    className="focus-visible:ring-green-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="customerPhone">{t('dashboard.invoices.phone_number')}</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="customerPhone"
                        value={newCustomer.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        placeholder={t('dashboard.invoices.phone_number_placeholder')}
                        className="pl-10 focus-visible:ring-green-500"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customerEmail">{t('dashboard.invoices.customer_email')}</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="customerEmail"
                        type="email"
                        value={newCustomer.email || ''}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        placeholder={t('dashboard.invoices.customer_email_placeholder')}
                        className="pl-10 focus-visible:ring-green-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customerAddress">{t('dashboard.invoices.customer_address')}</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="customerAddress"
                      value={newCustomer.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      placeholder={t('dashboard.invoices.customer_address_placeholder')}
                      className="pl-10 focus-visible:ring-green-500"
                    />
                  </div>
                </div>

                <Button 
                  onClick={handleNewCustomerSave}
                  disabled={!newCustomer.name.trim()}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {t('dashboard.invoices.save_customer')}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};