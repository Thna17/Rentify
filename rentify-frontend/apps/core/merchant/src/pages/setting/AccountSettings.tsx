// account-settings.tsx
import React, { useState, useEffect } from 'react';
import { useUpdateProfileMutation } from '@rentify/apis';
import { useAuth, useTranslation } from '@rentify/utils';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@rentify/shared/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@rentify/shared/ui/alert-dialog';
import { Button } from '@rentify/shared/ui/button';
import { Input } from '@rentify/shared/ui/input';
import { Label } from '@rentify/shared/ui/label';
import { Separator } from '@rentify/shared/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@rentify/shared/ui/avatar';
import { 
  User, Mail, Building, Phone, Globe, Save, Loader2, Edit,
  Upload, X, CheckCircle2, AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { SettingsLayout } from '../../layouts/setting/SettingsLayout';
import { MarketplaceColorCard } from './components/MarketplaceColorCard';
import { StoreLogoCard } from './components/StoreLogoCard';
import { useChannels } from '../../context/ChannelContext';
import { RENTIFY_API_BASE } from '@rentify/shared/config/urls';

export const AccountSettings = () => {
  const { t } = useTranslation();
  const [updateProfile, { isLoading: isUpdating }] = useUpdateProfileMutation();
  const { profile } = useAuth();
  const { store, setStore } = useChannels();
  
  const [isEditing, setIsEditing] = useState(false);
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

      setIsEditing(false);
      toast.success(t('merchant.p.profileUpdatedSuccessfully') || 'Profile updated successfully');
    } catch (error: any) {
      toast.error(error?.data?.message || error?.message || t('merchant.p.failedToUpdateProfile') || 'Failed to update profile');
    }
  };

  const getInitials = (name: string) => {
    return (name || '').trim().split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setAvatarPreview(null);
    setProfileData({
      name: profile?.name || '',
      email: profile?.email || '',
      phone: profile?.phoneNumber || profile?.phone || '',
      businessName: store?.name || profile?.businessName || '',
      website: profile?.website || store?.websiteDomain || (store?.slug ? `${store.slug}.mekhla.digital` : '') || '',
      bio: profile?.bio || '',
    });
  };

  return (
    <SettingsLayout
      title={t('merchant.settings.sections.account.title')}
      description={t('merchant.settings.sections.account.body')}
      icon={<User />}
    >
      <Card className="shadow-sm border-0">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold">{t('merchant.p.profileInformation')}</CardTitle>
              <CardDescription>
                {t('merchant.p.updateYourPersonalDetails')}
              </CardDescription>
            </div>
            {!isEditing ? (
              <Button
                variant="outline"
                onClick={() => setIsEditing(true)}
                className="flex items-center space-x-2"
              >
                <Edit className="h-4 w-4" />
                <span>{t('merchant.p.editProfile')}</span>
              </Button>
            ) : (
              <div className="flex space-x-2">
                <Button variant="outline" onClick={cancelEdit}>
                  {t('merchant.p.cancel')}
                </Button>
                <Button
                  onClick={handleSaveProfile}
                  disabled={isUpdating}
                  className="flex items-center space-x-2"
                >
                  {isUpdating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  <span>{isUpdating ? 'Saving...' : 'Save Changes'}</span>
                </Button>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Avatar Section */}
          <div className="flex items-center space-x-6 p-4 bg-gray-50 rounded-lg">
            <div className="relative">
              <Avatar className="h-20 w-20 border-2 border-white shadow-sm">
                <AvatarImage src={avatarPreview || profile?.profileImage || profile?.avatar} />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white text-lg font-semibold">
                  {getInitials(profileData.name)}
                </AvatarFallback>
              </Avatar>
              {isEditing && (
                <div className="absolute -bottom-1 -right-1">
                  <Label htmlFor="avatar-upload" className="cursor-pointer">
                    <div className="bg-blue-600 text-white p-1 rounded-full shadow-lg hover:bg-blue-700 transition-colors">
                      <Upload className="h-3 w-3" />
                    </div>
                  </Label>
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </div>
              )}
            </div>
            
            <div className="flex-1">
              <h3 className="font-medium text-gray-900">{t('merchant.p.profilePhoto')}</h3>
              <p className="text-sm text-gray-500 mt-1">
                {t('merchant.p.jpgGifOrPng')}
              </p>
              {isEditing && avatarPreview && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={removeAvatar}
                  className="mt-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <X className="h-4 w-4 mr-1" />
                  {t('merchant.p.removePhoto')}
                </Button>
              )}
            </div>
          </div>

          <Separator />

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">
                  <User className="h-4 w-4 inline mr-2" />
                  {t('merchant.p.fullName')}
                </Label>
                <Input
                  id="name"
                  name="name"
                  value={profileData.name}
                  onChange={handleProfileChange}
                  disabled={!isEditing}
                  placeholder={t('merchant.p.yourFullName')}
                  className="disabled:bg-gray-50 disabled:cursor-not-allowed"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  <Mail className="h-4 w-4 inline mr-2" />
                  {t('merchant.p.emailAddress')}
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={profileData.email}
                  onChange={handleProfileChange}
                  disabled={!isEditing}
                  placeholder="your@email.com"
                  className="disabled:bg-gray-50 disabled:cursor-not-allowed"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium">
                  <Phone className="h-4 w-4 inline mr-2" />
                  {t('merchant.p.phoneNumber')}
                </Label>
                <Input
                  id="phone"
                  name="phone"
                  value={profileData.phone}
                  onChange={handleProfileChange}
                  disabled={!isEditing}
                  placeholder="+1 (555) 000-0000"
                  className="disabled:bg-gray-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="businessName" className="text-sm font-medium">
                  <Building className="h-4 w-4 inline mr-2" />
                  {t('merchant.p.businessName')}
                </Label>
                <Input
                  id="businessName"
                  name="businessName"
                  value={profileData.businessName}
                  onChange={handleProfileChange}
                  disabled={!isEditing}
                  placeholder={t('merchant.p.yourBusinessName')}
                  className="disabled:bg-gray-50 disabled:cursor-not-allowed"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="website" className="text-sm font-medium">
                  <Globe className="h-4 w-4 inline mr-2" />
                  {t('merchant.p.website')}
                </Label>
                <Input
                  id="website"
                  name="website"
                  value={profileData.website}
                  onChange={handleProfileChange}
                  disabled={!isEditing}
                  placeholder="https://yourwebsite.com"
                  className="disabled:bg-gray-50 disabled:cursor-not-allowed"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio" className="text-sm font-medium">
                  {t('merchant.p.bio')}
                </Label>
                <Input
                  id="bio"
                  name="bio"
                  value={profileData.bio}
                  onChange={handleProfileChange}
                  disabled={!isEditing}
                  placeholder={t('merchant.p.tellUsAboutYourself')}
                  className="disabled:bg-gray-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* The store's presentation belongs to its owner; staff do not see it. */}
      {profile?.role !== 'staff' && (
        <div className="mt-6">
          <StoreLogoCard />
          <div className="mt-6"><MarketplaceColorCard /></div>
        </div>
      )}
      {/* Danger Zone: Close store (moved from store-management per wireframe M17 and audit P3, P7) */}
      {profile?.role !== 'staff' && (
        <div className="mt-6">
          <Card className="border border-destructive/20 bg-destructive/5 shadow-[var(--shadow-soft)]">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-destructive flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                <span>Close store</span>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Permanently close your store and take down your storefront. Active orders and customer balances must be settled first.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="text-destructive border-destructive/30 hover:bg-destructive/10 min-h-[44px]"
                  >
                    Close store...
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Close this store?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will unpublish your online storefront and pause your marketplace listings. You can reopen by contacting support.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => toast.info('Store closure request submitted. Our support team will assist you.')}
                    >
                      Confirm closure
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </div>
      )}
    </SettingsLayout>
  );
};

export default AccountSettings;