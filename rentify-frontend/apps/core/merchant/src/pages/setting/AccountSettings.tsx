// account-settings.tsx
import React, { useState, useEffect } from 'react';
import { useUpdateProfileMutation } from '@rentify/apis';
import { useAuth, useTranslation } from '@rentify/utils';
import { Button } from '@rentify/shared/ui/button';
import { Input } from '@rentify/shared/ui/input';
import { Label } from '@rentify/shared/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@rentify/shared/ui/avatar';
import { Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { SettingsLayout } from '../../layouts/setting/SettingsLayout';
import { Panel } from '../../components/page/PagePrimitives';
import { Link } from 'react-router-dom';
import { StoreLogoCard } from './components/StoreLogoCard';
import { useChannels } from '../../context/ChannelContext';
import { RENTIFY_API_BASE } from '@rentify/shared/config/urls';

export const AccountSettings = () => {
  const { t } = useTranslation();
  const [updateProfile, { isLoading: isUpdating }] = useUpdateProfileMutation();
  const { profile } = useAuth();
  const { store, setStore } = useChannels();
  
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    businessName: '',
    website: '',
    bio: '',
  });

  useEffect(() => {
    if (profile || store) {
      setProfileData({
        name: profile?.name || '',
        email: profile?.email || '',
        phone: profile?.phoneNumber || profile?.phone || '',
        businessName: store?.name || profile?.businessName || '',
        website: profile?.website || store?.websiteDomain || (store?.slug ? `${store.slug}.mekhla.digital` : '') || '',
        bio: profile?.bio || '',
      });
    }
  }, [profile, store]);

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfileData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(t('merchant.p.fileSizeTooLarge'));
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeAvatar = () => {
    setAvatarPreview(null);
  };

  const handleSaveProfile = async () => {
    try {
      const payload: any = {
        name: profileData.name,
        email: profileData.email,
        phone: profileData.phone,
        phoneNumber: profileData.phone,
        businessName: profileData.businessName,
        website: profileData.website,
        bio: profileData.bio,
      };
      if (avatarPreview) {
        payload.avatar = avatarPreview;
        payload.profileImage = avatarPreview;
      }

      await updateProfile(payload).unwrap();

      // If businessName was changed, also update Store in ChannelContext
      if (profileData.businessName && store && profileData.businessName !== store.name) {
        try {
          const resp = await fetch(`${RENTIFY_API_BASE}/api/stores/mine`, {
            method: 'PATCH',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: profileData.businessName }),
          });
          if (resp.ok) {
            const data = await resp.json();
            setStore((prev: any) => ({ ...prev, ...data.data }));
          }
        } catch {
          // Handled by backend
        }
      }

      toast.success(t('merchant.p.profileUpdatedSuccessfully') || 'Profile updated successfully');
    } catch (error: any) {
      toast.error(t('merchant.p.failedToUpdateProfile'));
    }
  };

  const getInitials = (name: string) => {
    return (name || '').trim().split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
  };


  return (
    <SettingsLayout
      title={t('merchant.settings.sections.account.title')}
      description={t('merchant.settings.sections.account.body')}
    >
      {/* Redesign M22 pattern: plain fields with hints, one Save at the end */}
      <Panel className="space-y-5">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={avatarPreview || profile?.profileImage || profile?.avatar} />
            <AvatarFallback className="bg-primary text-lg font-semibold text-primary-foreground">
              {getInitials(profileData.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 space-y-1">
            <Label htmlFor="avatar-upload" className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl border border-input px-4 text-sm font-semibold">
              <Upload className="h-4 w-4" aria-hidden="true" />
              {t('merchant.profile.changePhoto')}
            </Label>
            <input id="avatar-upload" type="file" accept="image/*" onChange={handleAvatarChange} className="sr-only" />
            <p className="text-sm text-muted-foreground">{t('merchant.p.jpgGifOrPng')}</p>
            {avatarPreview && (
              <Button variant="ghost" size="sm" onClick={removeAvatar} className="min-h-[44px] px-2 text-destructive">
                {t('merchant.p.removePhoto')}
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {[
            { id: 'name', label: t('merchant.p.fullName'), placeholder: t('merchant.p.yourFullName') },
            { id: 'businessName', label: t('merchant.p.businessName'), placeholder: t('merchant.p.yourBusinessName'), hint: t('merchant.profile.storeNameHint') },
            { id: 'phone', label: t('merchant.p.phoneNumber'), placeholder: '012 345 678', type: 'tel' },
            { id: 'email', label: t('merchant.p.emailAddress'), placeholder: 'name@example.com', type: 'email' },
            { id: 'website', label: t('merchant.p.website'), placeholder: 'https://' },
            { id: 'bio', label: t('merchant.p.bio'), placeholder: t('merchant.p.tellUsAboutYourself') },
          ].map((field) => (
            <div key={field.id} className="space-y-1.5">
              <Label htmlFor={field.id} className="text-sm font-medium">{field.label}</Label>
              <Input
                id={field.id}
                name={field.id}
                type={field.type || 'text'}
                value={(profileData as Record<string, string>)[field.id]}
                onChange={handleProfileChange}
                placeholder={field.placeholder}
                className="h-11 rounded-xl"
              />
              {field.hint && <p className="text-sm text-muted-foreground">{field.hint}</p>}
            </div>
          ))}
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSaveProfile} disabled={isUpdating} className="min-h-[44px] rounded-xl px-6">
            {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
            {isUpdating ? t('merchant.common.saving') : t('merchant.common.save')}
          </Button>
        </div>
      </Panel>

      {/* The store's presentation belongs to its owner; staff do not see it. */}
      {profile?.role !== 'staff' && (
        <>
          <StoreLogoCard />
          {/* There is no self-serve closure endpoint; Rentify closes a store on request */}
          <Panel className="space-y-2">
            <h2 className="text-base font-semibold text-foreground">{t('merchant.profile.closeTitle')}</h2>
            <p className="text-sm text-muted-foreground">{t('merchant.profile.closeBody')}</p>
            <Button asChild variant="outline" className="min-h-[44px] rounded-xl text-destructive">
              <Link to="/help">{t('merchant.profile.closeAction')}</Link>
            </Button>
          </Panel>
        </>
      )}
    </SettingsLayout>
  );
};

export default AccountSettings;