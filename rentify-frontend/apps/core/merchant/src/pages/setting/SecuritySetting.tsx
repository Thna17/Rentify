// security-setting.tsx
import React, { useState } from 'react';
import { Button } from '@rentify/shared/ui/button';
import { Input } from '@rentify/shared/ui/input';
import { Label } from '@rentify/shared/ui/label';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { SettingsLayout } from '../../layouts/setting/SettingsLayout';
import { Panel } from '../../components/page/PagePrimitives';
import { useChangePasswordMutation } from '@rentify/apis';
import { useTranslation } from '@rentify/utils';

type Field = 'currentPassword' | 'newPassword' | 'confirmPassword';

// Core's rule (users/userController changePassword): 8+ characters, a capital letter and a number
const meetsRule = (value: string) => value.length >= 8 && /[A-Z]/.test(value) && /[0-9]/.test(value);

const EMPTY = { currentPassword: '', newPassword: '', confirmPassword: '' };

export const SecuritySetting = () => {
  const { t } = useTranslation();
  const [changePassword, { isLoading: isChangingPassword }] = useChangePasswordMutation();
  const [passwordData, setPasswordData] = useState(EMPTY);
  const [visible, setVisible] = useState<Record<Field, boolean>>({ currentPassword: false, newPassword: false, confirmPassword: false });

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast.error(t('merchant.p.pleaseFillInAll'));
      return;
    }
    if (!meetsRule(passwordData.newPassword)) {
      toast.error(t('merchant.security.ruleError'));
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error(t('merchant.p.newPasswordsDoNot'));
      return;
    }

    try {
      await changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      }).unwrap();
      setPasswordData(EMPTY);
      setVisible({ currentPassword: false, newPassword: false, confirmPassword: false });
      toast.success(t('merchant.p.passwordUpdatedSuccessfully'));
    } catch (error: any) {
      toast.error(t(error?.status === 400 || error?.status === 401 ? 'merchant.settings.passwordRejected' : 'merchant.settings.passwordError'));
    }
  };

  const fields: { id: Field; label: string; autoComplete: string; hint?: string }[] = [
    { id: 'currentPassword', label: t('merchant.p.currentPassword'), autoComplete: 'current-password' },
    { id: 'newPassword', label: t('merchant.p.newPassword'), autoComplete: 'new-password', hint: t('merchant.security.rule') },
    { id: 'confirmPassword', label: t('merchant.p.confirmNewPassword'), autoComplete: 'new-password' },
  ];

  return (
    <SettingsLayout
      title={t('merchant.settings.sections.security.title')}
      description={t('merchant.settings.securityBody')}
    >
      {/* Redesign M22 pattern: plain fields with hints, one action at the end */}
      <Panel>
        <form onSubmit={handlePasswordChange} className="space-y-5" noValidate>
          <div>
            <h2 className="text-base font-semibold text-foreground">{t('merchant.security.password')}</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">{t('merchant.security.passwordBody')}</p>
          </div>

          {fields.map((field) => (
            <div key={field.id} className="space-y-1.5">
              <Label htmlFor={field.id} className="text-sm font-medium">{field.label}</Label>
              <div className="relative">
                <Input
                  id={field.id}
                  type={visible[field.id] ? 'text' : 'password'}
                  autoComplete={field.autoComplete}
                  value={passwordData[field.id]}
                  onChange={(e) => setPasswordData({ ...passwordData, [field.id]: e.target.value })}
                  aria-describedby={field.hint ? `${field.id}-hint` : undefined}
                  className="h-11 rounded-xl pr-12"
                />
                <button
                  type="button"
                  onClick={() => setVisible({ ...visible, [field.id]: !visible[field.id] })}
                  aria-label={t(visible[field.id] ? 'merchant.security.hide' : 'merchant.security.show')}
                  aria-pressed={visible[field.id]}
                  className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground hover:text-foreground"
                >
                  {visible[field.id] ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                </button>
              </div>
              {field.hint && <p id={`${field.id}-hint`} className="text-sm text-muted-foreground">{field.hint}</p>}
            </div>
          ))}

          <div className="flex justify-end">
            <Button type="submit" disabled={isChangingPassword} className="min-h-[44px] rounded-xl px-6">
              {isChangingPassword && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {isChangingPassword ? t('merchant.p.updatingPassword') : t('merchant.security.submit')}
            </Button>
          </div>
        </form>
      </Panel>
    </SettingsLayout>
  );
};
export default SecuritySetting;
