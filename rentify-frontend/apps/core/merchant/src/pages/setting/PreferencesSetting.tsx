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
import { Bell, Mail, MessageSquare, Megaphone, Save, Loader2, Store, TerminalSquare, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
import { SettingsLayout } from '../../layouts/setting/SettingsLayout';
import { useChannels } from '../../context/ChannelContext';

export const PreferencesSetting = () => {
  const { hasPos, hasMarketplace, togglePos, toggleMarketplace } = useChannels();
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
        <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
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
      title="Preferences"
      description="Manage sales channels and account notification preferences"
      icon={<Bell />}
    >
      {/* Sales Channels Management */}
      <Card className="shadow-sm border-border mb-6">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" />
            Sales Channels
          </CardTitle>
          <CardDescription>
            Enable or disable sales channels and operational tools for your store
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 px-6">
          <div className="divide-y divide-border">
            <PreferenceSwitch
              id="pos-channel"
              checked={hasPos}
              onCheckedChange={(checked) => {
                togglePos(checked);
                toast.success(checked ? 'POS channel enabled in sidebar' : 'POS channel disabled in sidebar');
              }}
              label="Point of Sale (POS)"
              description="Enable in-person counter checkout, cash collection, and barcode terminal in dashboard"
              icon={<TerminalSquare className="h-4 w-4 text-purple-600" />}
            />
            <PreferenceSwitch
              id="marketplace-channel"
              checked={hasMarketplace}
              onCheckedChange={(checked) => {
                toggleMarketplace(checked);
                toast.success(checked ? 'Marketplace listing enabled' : 'Marketplace listing disabled');
              }}
              label="Rentify Marketplace"
              description="List eligible store products in the central Rentify marketplace"
              icon={<ShoppingBag className="h-4 w-4 text-emerald-600" />}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
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

        <CardContent className="p-0 px-6">
          <div className="divide-y divide-border">
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
              description="Get urgent alerts directly to your phone"
              icon={<MessageSquare className="h-4 w-4 text-gray-600" />}
            />

            <PreferenceSwitch
              id="marketing-emails"
              checked={preferences.marketingEmails}
              onCheckedChange={(checked) => setPreferences({...preferences, marketingEmails: checked})}
              label="Marketing Updates"
              description="Receive product updates, tips, and promotional offers"
              icon={<Megaphone className="h-4 w-4 text-gray-600" />}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notification Frequency */}
      <Card className="shadow-sm border-0 mt-6">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Notification Frequency</CardTitle>
          <CardDescription>
            Choose how often you want to receive digest emails
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {['Daily', 'Weekly', 'Monthly'].map((frequency) => (
              <div
                key={frequency}
                className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                  frequency === 'Weekly' 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20' 
                    : 'border-gray-200 dark:border-gray-800 hover:border-gray-300'
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