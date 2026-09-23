// hooks/useThemeService.ts

import { useEffect, useState, useMemo } from 'react';
import { useGetWebsiteByDomainQuery, useGetWebsiteQuery } from '@rentify/apis';
import { themeService } from '../Services/themes/themeService';
import { createThemeApplicationService } from '../Services/themes/themeApplicationService';
import { createWebsiteDataService } from '../Services/website/websiteDataService';
import { domainService } from '../Services/domain/domainService';
import type { Theme, WebsiteData, StaffWithContact } from '../types';
import { templateThemes } from '../themes';

export const useThemeService = (templateId?: string) => {
  // Domain logic
  const currentDomain = domainService.getCurrentDomain();
  const queryDomain = domainService.getDomainFromQuery();
  const isAuth = domainService.isAuthDomain(currentDomain);
  const isDashboard = domainService.isDashboardDomain(currentDomain);
  const effectiveDomain = domainService.getEffectiveDomain(
    currentDomain,
    isAuth,
    queryDomain
  );
  const skipDomainApi = domainService.shouldSkipApi(
    isDashboard,
    effectiveDomain,
    isAuth,
    queryDomain
  );

  // API calls: separate for domain (frontstore) and current (dashboard)
  const {
    data: domainData,
    isLoading: domainLoading,
    error: domainError,
    refetch: domainRefetch,
  } = useGetWebsiteByDomainQuery(effectiveDomain, {
    skip: skipDomainApi || isDashboard,
  });

  const {
    data: dashboardData,
    isLoading: dashboardLoading,
    error: dashboardError,
    refetch: dashboardRefetch,
  } = useGetWebsiteQuery(undefined, { skip: !isDashboard });

  // Combined loading/error/refetch
  const isLoading = isDashboard ? dashboardLoading : domainLoading;
  const error = isDashboard ? dashboardError : domainError;
  const refetch = isDashboard ? dashboardRefetch : domainRefetch;

  // Services
  const websiteDataService = useMemo(() => createWebsiteDataService({}), []);
  const themeApplicationService = useMemo(
    () => createThemeApplicationService(themeService),
    []
  );

  // State
  const [theme, setTheme] = useState<Theme | null>(null);
  const [websiteData, setWebsiteData] = useState<WebsiteData>(
    websiteDataService.getData()
  );
  const [staffs, setStaffs] = useState<StaffWithContact[]>([]);

  // Determine effective template ID (same for dashboard and frontstore)
  const effectiveTemplateId = useMemo(() => {
    const fetchedData = isDashboard ? dashboardData : domainData;
    return fetchedData?.websiteTemplateId || '1';
  }, [isDashboard, domainData, dashboardData]);

  // Main effect: fetch data, normalize, apply theme
  useEffect(() => {
    let selectedTheme: Theme | null = null;

    if (isAuth && !queryDomain) {
      // Auth preview mode
      selectedTheme =
        templateThemes['1']?.modernEcommerceTheme ||
        templateThemes['1']?.luxuryGoldTheme ||
        null;
      websiteDataService.setDefaultData();
    } else if (isDashboard && dashboardData) {
      websiteDataService.updateFromDashboardData(dashboardData);
    } else if (domainData) {
      websiteDataService.updateFromDomainData(domainData);
    }

    // Theme selection logic
    const customThemeItem = websiteDataService.getThemeConfiguration();
    const colorPaletteItem = websiteDataService.getColorPalette();
    const selectedThemeKey = colorPaletteItem?.value as string | undefined;

    const themesForTemplate = templateThemes[effectiveTemplateId];

    // Priority 1: Custom theme override (if it has any values)
    if (customThemeItem?.value && typeof customThemeItem.value === 'object') {
      const customTheme = customThemeItem.value as Theme;
      // Check if custom theme is not empty (reset case)
      const hasCustomColors =
        customTheme.colors && Object.keys(customTheme.colors).length > 0;
      const hasCustomTypography =
        customTheme.typography &&
        Object.keys(customTheme.typography).length > 0;
      const hasCustomSpacing =
        customTheme.spacing && Object.keys(customTheme.spacing).length > 0;
      const hasCustomBorderRadius =
        customTheme.borderRadius &&
        Object.keys(customTheme.borderRadius).length > 0;

      if (
        hasCustomColors ||
        hasCustomTypography ||
        hasCustomSpacing ||
        hasCustomBorderRadius
      ) {
        selectedTheme = customTheme;
      }
    }

    // Priority 2: Color palette key (if no custom theme or custom theme is empty)
    if (
      !selectedTheme &&
      selectedThemeKey &&
      themesForTemplate?.[selectedThemeKey]
    ) {
      selectedTheme = themesForTemplate[selectedThemeKey];
    }

    // Priority 3: Template default
    if (!selectedTheme && themesForTemplate?.default) {
      selectedTheme = themesForTemplate.default;
    }

    // Update state
    setTheme(selectedTheme);
    setWebsiteData(websiteDataService.getData());
    setStaffs(websiteDataService.getStaffs());

    // Apply theme
    themeApplicationService.applyThemeToDOM(selectedTheme);

    return () => {
      // Optional cleanup
    };
  }, [
    domainData,
    dashboardData,
    effectiveTemplateId,
    isDashboard,
    isAuth,
    queryDomain,
    themeApplicationService,
  ]);

  return {
    theme,
    isLoading,
    error,
    refetch,
    websiteData,
    staffs,
    getFilteredContent: (category: string) =>
      websiteDataService.getFilteredContent(category),
  };
};
