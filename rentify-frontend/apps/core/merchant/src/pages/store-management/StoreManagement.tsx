// components/StoreManagement.tsx
import { useState, useEffect } from 'react';
import { Store, Save, AlertCircle, Palette } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@rentify/shared/ui/button';
import {
  useUpdateWebsiteContentMutation,
  useGetWebsiteQuery,
  useUpdateThemeConfigurationMutation,
} from '@rentify/apis';
import { useTranslation } from '@rentify/utils';

// Components
import { StoreInfoSection } from './components/StoreInfoSection';
import { QuickActionsSection } from './components/QuickActionsSection';
import { ThemeCustomizationSection } from './components/ThemeCustomizationSection';
import { SocialMediaSection } from './components/SocialMediaSection';
import { CollectionsSection } from './components/CollectionsSection';
import { SavingIndicator } from './components/SavingIndicator';
import { PageHeader } from '@rentify/shared/layouts/dashboard/PageHeader';
import { MARKETING_URL } from '@rentify/shared/config/urls';

const parseContentText = (val: unknown): string => {
  if (typeof val === 'string') return val.trim();
  if (typeof val === 'number') return String(val);
  if (val && typeof val === 'object' && !Array.isArray(val)) {
    const record = val as Record<string, unknown>;
    for (const key of ['text', 'value', 'label', 'title']) {
      if (typeof record[key] === 'string') return (record[key] as string).trim();
      if (typeof record[key] === 'number') return String(record[key]);
    }
  }
  return '';
};

const findContentText = (contents: any[], labels: string[]): string => {
  const item = contents.find((c: any) =>
    labels.some((l) => l.toLowerCase() === String(c?.label || '').toLowerCase())
  );
  return item ? parseContentText(item.value) : '';
};

export const StoreManagement = () => {
  const { t } = useTranslation();
  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState('');
  const {
    data: websiteData,
    isLoading: isFetching,
    error,
    refetch,
  } = useGetWebsiteQuery();

  const [updateWebsiteContent, { isLoading: isUpdating, error: updateError }] =
    useUpdateWebsiteContentMutation();

  const [updateThemeConfiguration, { isLoading: isThemeUpdating }] =
    useUpdateThemeConfigurationMutation();

  // Transform website data to store data format
  const [storeData, setStoreData] = useState<any>(null);

  useEffect(() => {
    if (websiteData) {
      const contents = websiteData.WebsiteContents || [];

      // Find theme configuration
      const themeContent = contents.find(
        (c: any) => c.label === 'Theme Configuration' && c.type === 'theme'
      );

      const defaultTheme = {
        colors: {
          primary: '#3B82F6',
          secondary: '#10B981',
          accent: '#F59E0B',
        },
        typography: {},
        spacing: {},
        borderRadius: {},
      };

      const rawSocial = contents.find(
        (c: any) => String(c?.label || '').toLowerCase() === 'social media'
      )?.value;

      const transformedData = {
        shop: {
          id: websiteData.id,
          name:
            findContentText(contents, ['Website Name', 'Site Title', 'Store Name']) ||
            parseContentText(websiteData.siteTitle) ||
            parseContentText(websiteData.storeName) ||
            '',
          // Live address: the Rentify subdomain once published, else a connected domain.
          domain: websiteData.storefrontUrl || websiteData.domain || '',
          email:
            findContentText(contents, ['Contact Email', 'Email']) ||
            parseContentText(websiteData.userEmail) ||
            '',
          phone:
            findContentText(contents, ['Phone Number', 'Phone', 'Contact']) ||
            parseContentText(websiteData.userPhoneNumber) ||
            '',
          status: websiteData.status || 'active',
          theme: themeContent?.value?.colors
            ? {
                colors: themeContent.value.colors,
                typography: themeContent.value.typography || {},
                spacing: themeContent.value.spacing || {},
                borderRadius: themeContent.value.borderRadius || {},
              }
            : defaultTheme,
        },
        socialMedia: {
          facebook: parseContentText(rawSocial?.facebook),
          instagram: parseContentText(rawSocial?.instagram),
          twitter: parseContentText(rawSocial?.twitter),
          linkedin: parseContentText(rawSocial?.linkedin),
        },
        collections:
          contents.find((c: any) => c.label === 'Categories')?.value || [],
        websiteId: websiteData.id,
        contents: contents,
        colorPalette: Array.isArray(websiteData.colorPalettes)
          ? websiteData.colorPalettes
          : Array.isArray(websiteData.colorPalette)
          ? websiteData.colorPalette
          : [
              'default',
              'luxuryGoldTheme',
              'modernEcommerceTheme',
            ],
        colorPalettes: Array.isArray(websiteData.colorPalettes)
          ? websiteData.colorPalettes
          : Array.isArray(websiteData.colorPalette)
          ? websiteData.colorPalette
          : [
              'default',
              'luxuryGoldTheme',
              'modernEcommerceTheme',
            ],
      };

      setStoreData(transformedData);
    }
  }, [websiteData]);

  const handleEdit = (field: string, currentValue: string) => {
    setEditingField(field);
    setTempValue(currentValue || '');
  };

  // components/StoreManagement.tsx
const handleSave = async (field: string, customValue?: string) => {
  if (!websiteData || !storeData) return;

  try {
    // Use customValue if provided (from FontSelector), otherwise use tempValue
    const valueToSave = customValue !== undefined ? customValue : tempValue;
    
    console.log('Saving field:', field, 'Value:', valueToSave);
    console.log('Current store data:', storeData);

    if (field.startsWith('theme.')) {
      // Handle theme updates - only use updateThemeConfiguration
      const path = field.split('.').slice(1); // Remove 'theme' prefix
      
      // Get current theme with proper defaults
      const currentTheme = storeData.shop.theme || {
        colors: {},
        typography: {},
        spacing: {},
        borderRadius: {}
      };

      console.log('Current theme before update:', JSON.stringify(currentTheme, null, 2));

      // Function to deeply set a value in a nested object immutably
      const deepSet = (obj: any, path: string[], value: any): any => {
        // Create a shallow copy
        const result = Array.isArray(obj) ? [...obj] : { ...obj };
        
        // Base case: if no more path, return value
        if (path.length === 0) return value;
        
        const [firstKey, ...restPath] = path;
        
        // If there's more path to go, recurse
        if (restPath.length > 0) {
          result[firstKey] = deepSet(obj[firstKey] || {}, restPath, value);
        } else {
          // Last key in path, set the value
          result[firstKey] = value;
        }
        
        return result;
      };

      // Apply the update
      const updatedTheme = deepSet(currentTheme, path, valueToSave);

      // Ensure all theme sections exist with proper structure
      const finalTheme = {
        colors: updatedTheme.colors || {},
        typography: updatedTheme.typography || {},
        spacing: updatedTheme.spacing || {},
        borderRadius: updatedTheme.borderRadius || {}
      };

      console.log('Final theme to save:', JSON.stringify(finalTheme, null, 2));

      // Update local state optimistically
      setStoreData((prev: any) => ({
        ...prev,
        shop: {
          ...prev.shop,
          theme: finalTheme,
        },
      }));

      // Send to backend using ONLY updateThemeConfiguration
      await updateThemeConfiguration({
        websiteId: storeData.websiteId,
        theme: finalTheme,
      }).unwrap();

      console.log('Theme updated successfully');

    } else if (field === 'colorPalette') {
      // Handle color palette selection - this is NOT a theme field
      const paletteContent = storeData.contents.find(
        (c: any) => c.label === 'Color Palette' && c.type === 'palette'
      );

      if (!paletteContent) {
        console.error('Color Palette content not found');
        return;
      }

      // Update palette content
      await updateWebsiteContent({
        contentId: paletteContent.id,
        body: { value: valueToSave },
      }).unwrap();

      // When palette changes, reset theme configuration to use palette defaults
      // This clears custom theme overrides
      await updateThemeConfiguration({
        websiteId: storeData.websiteId,
        theme: {
          colors: {},
          typography: {},
          spacing: {},
          borderRadius: {}
        },
      }).unwrap();

      console.log('Palette updated and theme reset');

      // Refetch to get updated data
      refetch();
      
    } else if (field === 'resetTheme') {
      // Handle theme reset
      await updateThemeConfiguration({
        websiteId: storeData.websiteId,
        theme: {
          colors: {},
          typography: {},
          spacing: {},
          borderRadius: {}
        },
      }).unwrap();

      console.log('Theme reset to palette defaults');
      
      // Refetch to get updated data
      refetch();
      
    } else {
      // Handle regular content updates (NOT theme-related)
      // These use updateWebsiteContent
      
      let contentToUpdate;
      let updateBody: any = { value: valueToSave };

      // Map frontend field names to possible backend content labels
      const fieldToLabelsMap: Record<string, string[]> = {
        'shop.name': ['Website Name', 'Site Title', 'Store Name'],
        'shop.email': ['Contact Email', 'Email'],
        'shop.phone': ['Phone Number', 'Phone', 'Contact'],
        'socialMedia.facebook': ['Social Media'],
        'socialMedia.instagram': ['Social Media'],
        'socialMedia.twitter': ['Social Media'],
        'socialMedia.linkedin': ['Social Media'],
      };

      if (fieldToLabelsMap[field]) {
        const candidateLabels = fieldToLabelsMap[field];
        contentToUpdate = storeData.contents.find((c: any) =>
          candidateLabels.some((l) => l.toLowerCase() === String(c?.label || '').toLowerCase())
        );

        if (!contentToUpdate) {
          console.error(`Content not found for mapped field: "${field}"`);
          return;
        }

        // Handle social media updates specially
        if (field.startsWith('socialMedia.')) {
          const socialKey = field.split('.')[1];
          const currentSocial =
            typeof storeData.socialMedia === 'object' && storeData.socialMedia !== null
              ? storeData.socialMedia
              : {};
          updateBody = {
            value: {
              ...currentSocial,
              [socialKey]: valueToSave,
            },
          };
        } else if (
          typeof contentToUpdate.value === 'object' &&
          contentToUpdate.value !== null &&
          'text' in contentToUpdate.value
        ) {
          updateBody = {
            value: {
              ...contentToUpdate.value,
              text: valueToSave,
            },
          };
        } else {
          updateBody = {
            value: valueToSave,
          };
        }
      } else {
        // For other fields, try direct match
        contentToUpdate = storeData.contents.find(
          (c: any) => String(c?.label || '').toLowerCase() === field.toLowerCase()
        );
      }

      if (!contentToUpdate) {
        console.error('Content not found for field:', field);
        return;
      }

      console.log('Updating website content:', {
        contentId: contentToUpdate.id,
        label: contentToUpdate.label,
        body: updateBody
      });

      if (field.startsWith('shop.')) {
        const shopKey = field.split('.')[1];
        setStoreData((prev: any) => ({
          ...prev,
          shop: {
            ...prev.shop,
            [shopKey]: valueToSave,
          },
        }));
      } else if (field.startsWith('socialMedia.')) {
        const socialKey = field.split('.')[1];
        setStoreData((prev: any) => ({
          ...prev,
          socialMedia: {
            ...prev.socialMedia,
            [socialKey]: valueToSave,
          },
        }));
      }

      await updateWebsiteContent({
        contentId: contentToUpdate.id,
        body: updateBody,
      }).unwrap();

      console.log('Website content updated successfully');

      // Refetch data to ensure consistency
      refetch();
    }

    // Only reset editing state if this was from an edit form (not from FontSelector)
    if (customValue === undefined) {
      setEditingField(null);
      setTempValue('');
    }
    
  } catch (err: any) {
    console.error('Update failed:', err);
    console.error('Error details:', err?.data || err?.message);
    
    // Revert optimistic update on error
    refetch();
  }
};


const handleFontChange = (field: string, value: string) => {
  console.log('Font changed:', field, value);
  // Call handleSave with the value directly (not using tempValue)
  handleSave(field, value);
};


  const handlePaletteChange = async (palette: string) => {
  console.log('Changing palette to:', palette);
  // This will trigger the 'colorPalette' branch in handleSave
  await handleSave('colorPalette', palette);
};

  const handleResetTheme = async () => {
  if (!storeData?.websiteId) return;

  try {
    // This will trigger the 'resetTheme' branch in handleSave
    await handleSave('resetTheme', '');
  } catch (err) {
    console.error('Failed to reset theme:', err);
  }
};
  const handleCancel = () => {
    setEditingField(null);
    setTempValue('');
  };

  if (isFetching) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-text-secondary">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (!websiteData && !isFetching) {
    return (
      <div className="min-h-full">
        <PageHeader
          title={t('dashboard.store_management.title')}
          description="Custom branded storefront website customization"
          icon={Store}
          breadcrumb={[
            { label: 'Dashboard', href: '/overview' },
            { label: t('dashboard.store_management.title') },
          ]}
        />
        <div className="p-6 max-w-2xl mx-auto mt-6">
          <div className="border border-border rounded-2xl bg-card p-8 text-center space-y-5 shadow-sm">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <Store className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">You don't have a Storefront website yet</h2>
              <p className="text-muted-foreground">
                You are currently selling on Rentify Marketplace. Launch your own branded storefront website to sell directly on your own custom domain with customizable themes.
              </p>
            </div>
            <div className="pt-2">
              <a
                href={`${MARKETING_URL}/start`}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium shadow hover:bg-primary/90 transition"
              >
                Launch Storefront Website
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-800">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm font-medium">
              {t('dashboard.store_management.failed_to_load')}:{' '}
              {(error as any).data?.error || t('confirmation.error_alt')}
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (!storeData) return null;

  const isLoading = isUpdating || isThemeUpdating;

  return (
    <div className="min-h-full">
      <PageHeader
        title={t('dashboard.store_management.title')}
        description={t('dashboard.store_management.description')}
        icon={Store}
        actions={
          <Button asChild className="h-11">
            <Link to="/customization">
              <Palette className="h-4 w-4" aria-hidden="true" />
              {t('merchant.storeDesign.title')}
            </Link>
          </Button>
        }
        breadcrumb={[
          { label: 'Dashboard', href: '/overview' },
          { label: t('dashboard.store_management.title') },
        ]}
      />

      {updateError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 text-red-800">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm font-medium">
              {t('dashboard.store_management.error_updating_content')}:{' '}
              {(updateError as any).data?.error || t('confirmation.error_alt')}
            </span>
          </div>
        </div>
      )}

      <div className="p-6 md:p-8 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <StoreInfoSection
            storeData={storeData}
            editingField={editingField}
            handleEdit={handleEdit}
            handleSave={handleSave}
            handleCancel={handleCancel}
            tempValue={tempValue}
            setTempValue={setTempValue}
            isUpdating={isLoading}
            t={t}
            className="lg:col-span-2"
          />

          <QuickActionsSection t={t} />
        </div>

        <ThemeCustomizationSection
          storeData={storeData}
          editingField={editingField}
          handleEdit={handleEdit}
          handleSave={handleSave}
          handleCancel={handleCancel}
          tempValue={tempValue}
            handleFontChange={handleFontChange}
          setTempValue={setTempValue}
          isUpdating={isLoading}
          t={t}
          className="mb-6"
          onPaletteChange={handlePaletteChange}
          onResetTheme={handleResetTheme}
          colorPalettes={
            Array.isArray(storeData.colorPalettes)
              ? storeData.colorPalettes
              : Array.isArray(storeData.colorPalette)
              ? storeData.colorPalette
              : [
                  'default',
                  'luxuryGoldTheme',
                  'modernEcommerceTheme',
                ]
          }
        />

        <SocialMediaSection
          storeData={storeData}
          editingField={editingField}
          handleEdit={handleEdit}
          handleSave={handleSave}
          handleCancel={handleCancel}
          tempValue={tempValue}
          setTempValue={setTempValue}
          isUpdating={isLoading}
          t={t}
          className="mb-6"
        />

        <CollectionsSection storeData={storeData} t={t} />

        {isLoading && <SavingIndicator t={t} />}
      </div>
    </div>
  );
};

export default StoreManagement;
