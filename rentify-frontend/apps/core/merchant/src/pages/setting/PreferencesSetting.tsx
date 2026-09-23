// preferences-setting.tsx
import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@rentify/shared/ui/card';
import { Label } from '@rentify/shared/ui/label';
import { Switch } from '@rentify/shared/ui/switch';
import { Separator } from '@rentify/shared/ui/separator';
import { Button } from '@rentify/shared/ui/button';
import { Bell, Mail, MessageSquare, Megaphone, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { SettingsLayout } from '../../layouts/setting/SettingsLayout';

export const PreferencesSetting = () => {
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    marketingEmails: false,
    securityAlerts: true,
    rentalUpdates: true,
    paymentReminders: true,
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleSavePreferences = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
    toast.success('Preferences updated successfully');
  };

  const PreferenceSwitch = ({ 
    id, 
    checked, 
    onCheckedChange, 
    label, 
    description, 
    icon 
  }: {
    id: string;
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    label: string;
    description: string;
    icon: React.ReactNode;
  }) => (
    <div className="flex items-center justify-between py-4">
      <div className="flex items-center space-x-4">
        <div className="p-2 bg-gray-100 rounded-lg">
          {icon}
        </div>
        <div>
          <Label htmlFor={id} className="text-sm font-medium cursor-pointer">
            {label}
          </Label>
          <p className="text-sm text-gray-500 mt-1">{description}</p>
        </div>
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
      />
    </div>
  );

  return (
    <SettingsLayout
      title="Notification Preferences"
      description="Choose how you want to be notified about your account activity"
      icon={<Bell />}
    >
      <Card className="shadow-sm border-0">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold">Notification Settings</CardTitle>
              <CardDescription>
                Manage your notification preferences across different channels
              </CardDescription>
            </div>
            <Button
              onClick={handleSavePreferences}
              disabled={isSaving}
              className="flex items-center space-x-2"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span>{isSaving ? 'Saving...' : 'Save Preferences'}</span>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="divide-y">
            <PreferenceSwitch
              id="email-notifications"
              checked={preferences.emailNotifications}
              onCheckedChange={(checked) => setPreferences({...preferences, emailNotifications: checked})}
              label="Email Notifications"
              description="Receive important updates via email"
              icon={<Mail className="h-4 w-4 text-gray-600" />}
            />

            <PreferenceSwitch
              id="sms-notifications"
              checked={preferences.smsNotifications}
              onCheckedChange={(checked) => setPreferences({...preferences, smsNotifications: checked})}
              label="SMS Notifications"
              description="Get text message alerts for urgent matters"
              icon={<MessageSquare className="h-4 w-4 text-gray-600" />}
            />

            <PreferenceSwitch
              id="push-notifications"
              checked={preferences.pushNotifications}
              onCheckedChange={(checked) => setPreferences({...preferences, pushNotifications: checked})}
              label="Push Notifications"
              description="Receive browser and mobile push notifications"
              icon={<Bell className="h-4 w-4 text-gray-600" />}
            />

            <PreferenceSwitch
              id="marketing-emails"
              checked={preferences.marketingEmails}
              onCheckedChange={(checked) => setPreferences({...preferences, marketingEmails: checked})}
              label="Marketing Emails"
              description="Get updates about new features and promotions"
              icon={<Megaphone className="h-4 w-4 text-gray-600" />}
            />

            <PreferenceSwitch
              id="security-alerts"
              checked={preferences.securityAlerts}
              onCheckedChange={(checked) => setPreferences({...preferences, securityAlerts: checked})}
              label="Security Alerts"
              description="Immediate notifications for security-related activities"
              icon={<Mail className="h-4 w-4 text-gray-600" />}
            />

            <PreferenceSwitch
              id="rental-updates"
              checked={preferences.rentalUpdates}
              onCheckedChange={(checked) => setPreferences({...preferences, rentalUpdates: checked})}
              label="Rental Updates"
              description="Notifications about your rental properties and bookings"
              icon={<Bell className="h-4 w-4 text-gray-600" />}
            />

            <PreferenceSwitch
              id="payment-reminders"
              checked={preferences.paymentReminders}
              onCheckedChange={(checked) => setPreferences({...preferences, paymentReminders: checked})}
              label="Payment Reminders"
              description="Reminders for upcoming payments and invoices"
              icon={<Mail className="h-4 w-4 text-gray-600" />}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border-0">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Notification Frequency</CardTitle>
          <CardDescription>
            How often you'd like to receive summary emails
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {['Daily', 'Weekly', 'Monthly'].map((frequency) => (
              <div
                key={frequency}
                className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                  frequency === 'Weekly' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{frequency}</span>
                  {frequency === 'Weekly' && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {frequency === 'Daily' && 'Get updates every day'}
                  {frequency === 'Weekly' && 'Receive a weekly summary'}
                  {frequency === 'Monthly' && 'Monthly digest of activities'}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </SettingsLayout>
  );
};

export default PreferencesSetting;