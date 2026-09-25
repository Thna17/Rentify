import React, { useState } from 'react';
import { Mail, MessageSquare, Plus } from 'lucide-react';
import { Button } from '@rentify/shared/ui/button';
import { Input } from '@rentify/shared/ui/input';
import { Label } from '@rentify/shared/ui/label';
import { Checkbox } from '@rentify/shared/ui/checkbox';
import { Card, CardContent } from '@rentify/shared/ui/card';
import { useInviteStaffMutation, useUpdateStaffMutation } from '@rentify/apis';
import { useTranslation } from '@rentify/utils';

interface StaffMember {
  id?: string;
  name: string;
  email?: string;
  phoneNumber?: string;
  contactMethod?: 'email' | 'phone';
  permissions: string[];
}

interface StaffInviteFormProps {
  onSuccess: () => void;
  merchantId: string;
  initialData?: Partial<StaffMember>;
  isEditing?: boolean;
  onError?: (message: string) => void;
}

type PermissionKey = 
  | 'manage_products' 
  | 'manage_orders' 
  | 'manage_invoices' 
  | 'manage_pos' 
  | 'manage_analytics' 
  | 'manage_settings' 
  | 'manage_staff';

const PERMISSIONS: PermissionKey[] = [
  'manage_products', 
  'manage_orders', 
  'manage_invoices', 
  'manage_pos', 
  'manage_analytics', 
  'manage_settings', 
  'manage_staff'
];

const permissionLabels: Record<PermissionKey, string> = {
  manage_products: 'Products',
  manage_orders: 'Orders',
  manage_invoices: 'Invoices',
  manage_pos: 'POS',
  manage_analytics: 'Analytics',
  manage_settings: 'Settings',
  manage_staff: 'Staff',
};

type ContactMethod = 'email' | 'phone';

const StaffInviteForm: React.FC<StaffInviteFormProps> = ({ 
  onSuccess, 
  merchantId, 
  initialData = {}, 
  isEditing = false, 
  onError 
}) => {
  const { t } = useTranslation();
  
  const initialContactMethod: ContactMethod = (initialData?.contactMethod as ContactMethod) || 'email';
  const [contactMethod, setContactMethod] = useState<ContactMethod>(initialContactMethod);
  const [name, setName] = useState<string>(initialData?.name || '');
  const [contact, setContact] = useState<string>(
    initialContactMethod === 'email' 
      ? (initialData?.email || '') 
      : (initialData?.phoneNumber || '')
  );
  const [permissions, setPermissions] = useState<string[]>(initialData?.permissions || []);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  
  const [inviteStaff, { isLoading: isInviting }] = useInviteStaffMutation();
  const [updateStaff, { isLoading: isUpdating }] = useUpdateStaffMutation();

  const isLoading = isInviting || isUpdating;

  const handlePermissionChange = (permission: string) => {
    return (checked: boolean | string) => {
      const isChecked = Boolean(checked);
      if (isChecked) {
        setPermissions([...permissions, permission]);
      } else {
        setPermissions(permissions.filter(p => p !== permission));
      }
    };
  };

  const validateForm = (): boolean => {
    if (!name.trim()) {
      setError(t('dashboard.settings.name_required') || 'Name is required');
      return false;
    }
    
    if (contactMethod === 'email' && !/^\S+@\S+\.\S+$/.test(contact)) {
      setError(t('dashboard.settings.invalid_email') || 'Invalid email address');
      return false;
    }
    
    if (contactMethod === 'phone' && !/^\+?[0-9]{10,15}$/.test(contact)) {
      setError(t('dashboard.settings.invalid_phone') || 'Invalid phone number');
      return false;
    }
    
    if (permissions.length === 0) {
      setError(t('dashboard.settings.permissions_required') || 'At least one permission is required');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError('');
    
    if (!validateForm()) return;
    
    try {
      if (isEditing) {
        await updateStaff({
          id: initialData?.id,
          name,
          email: contactMethod === 'email' ? contact : undefined,
          phoneNumber: contactMethod === 'phone' ? contact : undefined,
          permissions,
        }).unwrap();
        setSuccess(t('dashboard.settings.staff_updated') || 'Staff member updated successfully');
      } else {
        await inviteStaff({
          merchantId,
          name,
          contact,
          contactMethod,
          permissions
        }).unwrap();
        setSuccess(t('dashboard.settings.invitation_sent') || 'Invitation sent successfully');
      }
      
      setTimeout(() => {
        onSuccess();
        setSuccess('');
      }, 1500);
    } catch (err: any) {
      const errorMsg = err.data?.error || t('dashboard.settings.invitation_failed') || 'Operation failed';
      setError(errorMsg);
      if (onError) onError(errorMsg);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Name Input */}
      <div className="space-y-2">
        <Label htmlFor="name" className="text-sm font-medium">
          Staff Name
        </Label>
        <Input
          id="name"
          value={name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
          placeholder="Enter full name"
          required
        />
      </div>
      
      {/* Contact Method Selection */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Contact Method</Label>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={contactMethod === 'email' ? 'default' : 'outline'}
            onClick={() => setContactMethod('email')}
            className="flex items-center justify-center gap-2"
          >
            <Mail className="h-4 w-4" />
            Email
          </Button>
          <Button
            type="button"
            variant={contactMethod === 'phone' ? 'default' : 'outline'}
            onClick={() => setContactMethod('phone')}
            className="flex items-center justify-center gap-2"
          >
            <MessageSquare className="h-4 w-4" />
            Phone
          </Button>
        </div>
      </div>
      
      {/* Contact Input */}
      <div className="space-y-2">
        <Label htmlFor="contact" className="text-sm font-medium">
          {contactMethod === 'email' ? 'Email Address' : 'Phone Number'}
        </Label>
        <Input
          id="contact"
          type={contactMethod === 'email' ? 'email' : 'tel'}
          value={contact}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setContact(e.target.value)}
          placeholder={contactMethod === 'email' ? 'user@example.com' : '+1234567890'}
          required
        />
      </div>
      
      {/* Permissions */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Permissions</Label>
        <Card className="border">
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4">
            {PERMISSIONS.map((permission: PermissionKey) => (
              <div key={permission} className="flex items-center space-x-3">
                <Checkbox
                  id={permission}
                  checked={permissions.includes(permission)}
                  onCheckedChange={handlePermissionChange(permission)}
                  className="h-5 w-5 rounded-md"
                />
                <Label 
                  htmlFor={permission} 
                  className="text-sm font-normal cursor-pointer"
                >
                  {permissionLabels[permission]}
                </Label>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      
      {/* Messages */}
      {error && (
        <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 rounded-lg bg-green-50 text-green-700 text-sm">
          {success}
        </div>
      )}
      
      {/* Submit Button */}
      <Button
        type="submit"
        disabled={isLoading}
        className="w-full gap-2"
      >
        {isLoading ? (
          <div className="flex items-center">
            Processing...
          </div>
        ) : (
          <>
            <Plus className="h-4 w-4" />
            {isEditing ? 'Update Staff Member' : 'Send Invitation'}
          </>
        )}
      </Button>
    </form>
  );
};

export default StaffInviteForm;