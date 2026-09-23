// account-settings.tsx
import React, { useState, useEffect } from 'react';
import { useUpdateProfileMutation } from '@rentify/apis';
import { useAuth } from '@rentify/utils';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@rentify/shared/ui/card';
import { Button } from '@rentify/shared/ui/button';
import { Input } from '@rentify/shared/ui/input';
import { Label } from '@rentify/shared/ui/label';
import { Separator } from '@rentify/shared/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@rentify/shared/ui/avatar';
import { 
  User, Mail, Building, Phone, Globe, Save, Loader2, Edit,
  Upload, X, CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';
import { SettingsLayout } from '../../layouts/setting/SettingsLayout';

export const AccountSettings = () => {
  const [updateProfile, { isLoading: isUpdating }] = useUpdateProfileMutation();
  const { profile } = useAuth();
  
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
    if (profile) {
      setProfileData({
        name: profile?.name || '',
        email: profile?.email || '',
        phone: profile?.phone || '',
        businessName: profile?.businessName || '',
        website: profile?.website || '',
        bio: profile?.bio || '',
      });
    }
  }, [profile]);

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfileData({ ...profileData, [e.target.name]: e.target.value });
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size too large. Max 5MB allowed.');
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
      await updateProfile({
        ...profileData,
        ...(avatarPreview && { avatar: avatarPreview })
      }).unwrap();
      setIsEditing(false);
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error('Failed to update profile. Please try again.');
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setAvatarPreview(null);
    if (profile) {
      setProfileData({
        name: profile?.name || '',
        email: profile?.email || '',
        phone: profile?.phone || '',
        businessName: profile?.businessName || '',
        website: profile?.website || '',
        bio: profile?.bio || '',
      });
    }
  };

  return (
    <SettingsLayout
      title="Account Settings"
      description="Manage your personal and business information"
      icon={<User />}
    >
      <Card className="shadow-sm border-0">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold">Profile Information</CardTitle>
              <CardDescription>
                Update your personal details and business information
              </CardDescription>
            </div>
            {!isEditing ? (
              <Button
                variant="outline"
                onClick={() => setIsEditing(true)}
                className="flex items-center space-x-2"
              >
                <Edit className="h-4 w-4" />
                <span>Edit Profile</span>
              </Button>
            ) : (
              <div className="flex space-x-2">
                <Button variant="outline" onClick={cancelEdit}>
                  Cancel
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
                <AvatarImage src={avatarPreview || profile?.avatar} />
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
              <h3 className="font-medium text-gray-900">Profile Photo</h3>
              <p className="text-sm text-gray-500 mt-1">
                JPG, GIF or PNG. Max size of 5MB
              </p>
              {isEditing && avatarPreview && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={removeAvatar}
                  className="mt-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <X className="h-4 w-4 mr-1" />
                  Remove photo
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
                  Full Name
                </Label>
                <Input
                  id="name"
                  name="name"
                  value={profileData.name}
                  onChange={handleProfileChange}
                  disabled={!isEditing}
                  placeholder="Your full name"
                  className="disabled:bg-gray-50 disabled:cursor-not-allowed"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  <Mail className="h-4 w-4 inline mr-2" />
                  Email Address
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
                  Phone Number
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
                  Business Name
                </Label>
                <Input
                  id="businessName"
                  name="businessName"
                  value={profileData.businessName}
                  onChange={handleProfileChange}
                  disabled={!isEditing}
                  placeholder="Your business name"
                  className="disabled:bg-gray-50 disabled:cursor-not-allowed"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="website" className="text-sm font-medium">
                  <Globe className="h-4 w-4 inline mr-2" />
                  Website
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
                  Bio
                </Label>
                <Input
                  id="bio"
                  name="bio"
                  value={profileData.bio}
                  onChange={handleProfileChange}
                  disabled={!isEditing}
                  placeholder="Tell us about yourself or your business"
                  className="disabled:bg-gray-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </SettingsLayout>
  );
};

export default AccountSettings;