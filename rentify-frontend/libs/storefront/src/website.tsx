import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type PropsWithChildren,
} from 'react';
import { useGetCategoriesQuery, useGetWebsiteByDomainQuery } from './api';
import { templateThemes } from '@rentify/shared/themes';
import { themeService } from '@rentify/shared/Services/themes/themeService';
import { createThemeApplicationService } from '@rentify/shared/Services/themes/themeApplicationService';
import type { Theme } from '@rentify/shared/types';

const StorefrontWebsiteContext = createContext<any>(undefined);

const hasThemeValues = (theme: Theme | undefined): theme is Theme =>
  Boolean(
    theme &&
      Object.values(theme).some(
        (value) => value && typeof value === 'object' && Object.keys(value).length > 0
      )
  );

const getContentValue = (content: any[], label: string, type: string) =>
  content.find((item) => item.label === label && item.type === type)?.value;

export function StorefrontWebsiteProvider({ children }: PropsWithChildren) {
  const domain =
    typeof window === 'undefined'
      ? ''
      : (window.location.host || window.location.hostname);
  const { data, isLoading, error, refetch } = useGetWebsiteByDomainQuery(domain, { skip: !domain });
  const content = data?.WebsiteContents || data?.content || [];
  const themeApplicationService = useMemo(
    () => createThemeApplicationService(themeService),
    []
  );
  const selectedPalette =
    data?.selectedPalette || getContentValue(content, 'Color Palette', 'palette');
  const customTheme = getContentValue(content, 'Theme Configuration', 'theme');
  const templateId = String(data?.websiteTemplateId || data?.templateId || '1');

  useEffect(() => {
    const presetTheme =
      templateThemes[templateId]?.[selectedPalette] ||
      templateThemes[templateId]?.default ||
      templateThemes['1']?.[selectedPalette] ||
      templateThemes['1']?.default;
    const fallbackTheme: Theme | undefined =
      !selectedPalette && data?.colorPalette
        ? { colors: data.colorPalette }
        : undefined;

    themeApplicationService.applyThemeToDOM(
      hasThemeValues(customTheme) ? customTheme : presetTheme || fallbackTheme || null
    );
  }, [customTheme, data?.colorPalette, selectedPalette, templateId, themeApplicationService]);

  const value = {
    websiteId: data?.websiteId || data?.id || null,
    userId: data?.userId || null,
    content,
    theme: hasThemeValues(customTheme) ? customTheme : { palette: selectedPalette },
    staffs: [],
    isLoading,
    error,
    refetch,
    getFilteredContent: (category: string) => content.filter((item: any) => item.category?.toLowerCase() === category.toLowerCase()),
  };
  return <StorefrontWebsiteContext.Provider value={value}>{children}</StorefrontWebsiteContext.Provider>;
}

export function useStorefrontWebsite() {
  const value = useContext(StorefrontWebsiteContext);
  if (!value) throw new Error('useStorefrontWebsite must be used within StorefrontWebsiteProvider');
  return value;
}

/** Public category data for storefront navigation. */
export function useStorefrontCategories() {
  const { websiteId } = useStorefrontWebsite();
  const query = useGetCategoriesQuery(websiteId, { skip: !websiteId });
  return { categories: query.data || [], loading: query.isLoading, error: query.error };
}
