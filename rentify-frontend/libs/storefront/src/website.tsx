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
import { resolveStorefrontTheme, type StorefrontTheme } from './theme';
import { getContentValue, getStoreIdentity, type StoreIdentity, type WebsiteContentItem } from './content';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WebsiteContextValue = Record<string, any> & {
  websiteId: string | null;
  content: WebsiteContentItem[];
  identity: StoreIdentity;
  getFilteredContent: (category: string) => WebsiteContentItem[];
};

const StorefrontWebsiteContext = createContext<WebsiteContextValue | undefined>(undefined);

export interface StorefrontWebsiteProviderProps {
  /** Template defaults applied underneath the merchant's saved theme. */
  fallbackTheme?: StorefrontTheme | null;
}

/** Resolves the website from the current host and applies its sanitized theme. */
export function StorefrontWebsiteProvider({
  children,
  fallbackTheme = null,
}: PropsWithChildren<StorefrontWebsiteProviderProps>) {
  const domain =
    typeof window === 'undefined'
      ? ''
      : (window.location.host || window.location.hostname);
  const { data, isLoading, error, refetch } = useGetWebsiteByDomainQuery(domain, { skip: !domain });
  const content: WebsiteContentItem[] = useMemo(
    () => data?.WebsiteContents || data?.content || [],
    [data]
  );
  const themeApplicationService = useMemo(
    () => createThemeApplicationService(themeService),
    []
  );
  const selectedPalette = data?.selectedPalette ?? getContentValue(content, 'Color Palette');
  const customTheme = getContentValue(content, 'Theme Configuration');
  const templateId = String(data?.websiteTemplateId || data?.templateId || '1');

  const theme = useMemo(
    () =>
      resolveStorefrontTheme({
        customTheme,
        palette: selectedPalette,
        presets: templateThemes[templateId] || templateThemes['1'] || {},
        fallback: fallbackTheme,
      }),
    [customTheme, selectedPalette, templateId, fallbackTheme]
  );

  useEffect(() => {
    themeApplicationService.applyThemeToDOM(theme);
  }, [theme, themeApplicationService]);

  const fallbackName = data?.name || data?.websiteName || data?.businessDetails?.name || null;
  const fallbackLogo = data?.logo || data?.businessDetails?.logo || null;
  const identity = useMemo(
    () => getStoreIdentity(content, fallbackName, fallbackLogo),
    [content, fallbackName, fallbackLogo]
  );

  const value: WebsiteContextValue = {
    websiteId: data?.websiteId || data?.id || null,
    userId: data?.userId || null,
    content,
    identity,
    theme,
    staffs: [],
    isLoading,
    error,
    refetch,
    getFilteredContent: (category: string) =>
      content.filter((item) => item.category?.toLowerCase() === category.toLowerCase()),
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
  return {
    categories: Array.isArray(query.data) ? query.data : [],
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
