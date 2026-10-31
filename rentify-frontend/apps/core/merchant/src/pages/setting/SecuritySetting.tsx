// security-setting.tsx
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@rentify/shared/ui/card';
import { Button } from '@rentify/shared/ui/button';
import { Input } from '@rentify/shared/ui/input';
import { Label } from '@rentify/shared/ui/label';
import { 
  Shield, Lock, Loader2, Eye, EyeOff
} from 'lucide-react';
import { toast } from 'sonner';
import { SettingsLayout } from '../../layouts/setting/SettingsLayout';
import { useChangePasswordMutation } from '@rentify/apis';
import { useTranslation } from '@rentify/utils';

export const SecuritySetting = () => {
  const { t } = useTranslation();
  // Use the mutation hook
  const [changePassword, { isLoading: isChangingPassword }] = useChangePasswordMutation();


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
      toast.error(t('merchant.p.pleaseFillInAll'));
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error(t('merchant.p.newPasswordsDoNot'));
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error(t('merchant.p.newPasswordMustBe'));
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

      toast.success(t('merchant.p.passwordUpdatedSuccessfully'));
    } catch (error: any) {
      // Handle API errors
      toast.error(t(error?.status === 400 || error?.status === 401 ? 'merchant.settings.passwordRejected' : 'merchant.settings.passwordError'));
    }
  };


  return (
    <SettingsLayout
      title={t('merchant.settings.sections.security.title')}
      description={t('merchant.settings.securityBody')}
      icon={<Shield />}
    >
      {/* Change Password */}
      <Card className="shadow-sm border-0">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">{t('merchant.p.changePassword')}</CardTitle>
          <CardDescription>
            {t('merchant.p.updateYourPasswordTo')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">{t('merchant.p.currentPassword')}</Label>
              <div className="relative">
                <Input
                  id="current-password"
                  type={showPassword.current ? "text" : "password"}
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                  placeholder={t('merchant.p.enterYourCurrentPassword')}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => togglePasswordVisibility('current')}
                  aria-label={t(showPassword.current ? 'merchant.payments.hide' : 'merchant.payments.show')}
                >
                  {showPassword.current ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="new-password">{t('merchant.p.newPassword')}</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPassword.new ? "text" : "password"}
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                  placeholder={t('merchant.p.enterYourNewPassword')}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => togglePasswordVisibility('new')}
                  aria-label={t(showPassword.new ? 'merchant.payments.hide' : 'merchant.payments.show')}
                >
                  {showPassword.new ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirm-password">{t('merchant.p.confirmNewPassword')}</Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showPassword.confirm ? "text" : "password"}
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                  placeholder={t('merchant.p.confirmYourNewPassword')}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => togglePasswordVisibility('confirm')}
                  aria-label={t(showPassword.confirm ? 'merchant.payments.hide' : 'merchant.payments.show')}
                >
                  {showPassword.confirm ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
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
                  {t('merchant.p.updatingPassword')}
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 mr-2" />
                  {t('merchant.p.updatePassword')}
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

    </SettingsLayout>
  );
};
export default SecuritySetting;