// security-setting.tsx
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@rentify/shared/ui/card';
import { Button } from '@rentify/shared/ui/button';
import { Input } from '@rentify/shared/ui/input';
import { Label } from '@rentify/shared/ui/label';
import { Switch } from '@rentify/shared/ui/switch';
import { Separator } from '@rentify/shared/ui/separator';
import { Badge } from '@rentify/shared/ui/badge';
import { 
  Shield, Lock, Smartphone, CheckCircle2, Loader2, QrCode, Eye, EyeOff
} from 'lucide-react';
import { toast } from 'sonner';
import { SettingsLayout } from '../../layouts/setting/SettingsLayout';
import { useChangePasswordMutation } from '@rentify/apis';

export const SecuritySetting = () => {
  // Use the mutation hook
  const [changePassword, { isLoading: isChangingPassword }] = useChangePasswordMutation();

  const [securitySettings, setSecuritySettings] = useState({
    twoFactorAuth: true,
    loginAlerts: true,
    suspiciousActivityDetection: true,
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const [activeSessions] = useState([
    { id: 1, device: 'Chrome on Windows', location: 'New York, USA', lastActive: '2 hours ago', current: true },
    { id: 2, device: 'Safari on iPhone', location: 'San Francisco, USA', lastActive: '3 days ago', current: false },
  ]);

  const togglePasswordVisibility = (field: keyof typeof showPassword) => {
    setShowPassword(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast.error('Please fill in all password fields');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters long');
      return;
    }

    try {
      // Call the API
      await changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      }).unwrap();

      // Reset form on success
      setPasswordData({ 
        currentPassword: '', 
        newPassword: '', 
        confirmPassword: '' 
      });
      
      // Reset password visibility
      setShowPassword({
        current: false,
        new: false,
        confirm: false,
      });

      toast.success('Password updated successfully');
    } catch (error: any) {
      // Handle API errors
      const errorMessage = error.data?.message || 'Failed to update password';
      toast.error(errorMessage);
    }
  };

  const revokeSession = (sessionId: number) => {
    toast.success(`Session revoked successfully`);
  };

  return (
    <SettingsLayout
      title="Security Settings"
      description="Manage your account security and privacy settings"
      icon={<Shield />}
    >
      {/* Two-Factor Authentication */}
      <Card className="shadow-sm border-0">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Two-Factor Authentication</CardTitle>
          <CardDescription>
            Add an extra layer of security to your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <Smartphone className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <Label htmlFor="2fa" className="text-sm font-medium cursor-pointer">
                  Two-Factor Authentication
                </Label>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Active
                  </Badge>
                  <span className="text-sm text-gray-500">Authenticator app</span>
                </div>
              </div>
            </div>
            <Switch
              id="2fa"
              checked={securitySettings.twoFactorAuth}
              onCheckedChange={(checked) => 
                setSecuritySettings({...securitySettings, twoFactorAuth: checked})
              }
            />
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Button variant="outline" className="justify-start h-auto p-4">
              <QrCode className="h-5 w-5 mr-3" />
              <div className="text-left">
                <div className="font-medium">Setup Authenticator</div>
                <div className="text-sm text-gray-500">Use an authenticator app</div>
              </div>
            </Button>

            <Button variant="outline" className="justify-start h-auto p-4">
              <Smartphone className="h-5 w-5 mr-3" />
              <div className="text-left">
                <div className="font-medium">SMS Verification</div>
                <div className="text-sm text-gray-500">Receive codes via SMS</div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card className="shadow-sm border-0">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Change Password</CardTitle>
          <CardDescription>
            Update your password to keep your account secure
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <div className="relative">
                <Input
                  id="current-password"
                  type={showPassword.current ? "text" : "password"}
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                  placeholder="Enter your current password"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => togglePasswordVisibility('current')}
                >
                  {showPassword.current ? (
                    <EyeOff className="h-4 w-4 text-gray-500" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-500" />
                  )}
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPassword.new ? "text" : "password"}
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                  placeholder="Enter your new password"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => togglePasswordVisibility('new')}
                >
                  {showPassword.new ? (
                    <EyeOff className="h-4 w-4 text-gray-500" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-500" />
                  )}
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showPassword.confirm ? "text" : "password"}
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                  placeholder="Confirm your new password"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => togglePasswordVisibility('confirm')}
                >
                  {showPassword.confirm ? (
                    <EyeOff className="h-4 w-4 text-gray-500" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-500" />
                  )}
                </Button>
              </div>
            </div>
            
            <Button 
              type="submit" 
              disabled={isChangingPassword}
              className="mt-4 w-full sm:w-auto"
            >
              {isChangingPassword ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Updating Password...
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 mr-2" />
                  Update Password
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Active Sessions */}
      <Card className="shadow-sm border-0">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Active Sessions</CardTitle>
          <CardDescription>
            Manage your active login sessions across devices
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activeSessions.map((session) => (
              <div key={session.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <Smartphone className="h-4 w-4 text-gray-600" />
                  </div>
                  <div>
                    <div className="font-medium">{session.device}</div>
                    <div className="text-sm text-gray-500">
                      {session.location} • {session.lastActive}
                      {session.current && (
                        <Badge variant="secondary" className="ml-2">Current</Badge>
                      )}
                    </div>
                  </div>
                </div>
                {!session.current && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => revokeSession(session.id)}
                  >
                    Revoke
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </SettingsLayout>
  );
};
export default SecuritySetting;