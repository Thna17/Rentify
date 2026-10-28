// DashboardLayout.tsx
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth, useTranslation, useMediaQuery } from '@rentify/utils';
import React, { useState, useEffect, Suspense } from 'react';
import SiteHeader from './SiteHeader';
import AppSidebar from './AppSidebar';
import { ALL_TABS } from '../../config/dashboard-tabs';
import { filterTabsByUserRole } from '../../utils/filterTabsByUserRole';
import { getCurrentTabData } from '../../utils/getCurrentTabData';
import { UnauthorizedAccess } from '../../components/UnauthorizedAccess';
import { AuthenticationRequired } from '../../components/AuthenticationRequired';
import { Outlet } from 'react-router-dom';
import { useThemeService } from '@rentify/shared/hooks/useThemeService';
import { useWebsiteData } from '@rentify/shared/context/WebsiteContext';
import { MARKETING_URL, RENTIFY_API_BASE } from '@rentify/shared/config/urls';
import StoreCategoryPrompt from '../../pages/overview/StoreCategoryPrompt';
import { ChannelProvider } from '../../context/ChannelContext';
import { WorkspaceState } from '../../components/WorkspaceState';

export const DashboardLayoutContent = ({ store, setStore }) => {
  const { websiteData } = useThemeService();
  const { websiteId } = useWebsiteData();
  const pkg = websiteData?.package || null;
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, role, handleLogout } = useAuth();
  const isMobile = useMediaQuery('(max-width: 900px)');
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [searchFilter, setSearchFilter] = useState('');

  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
  }, [isMobile]);

  // POS channel enabled state, persisted in localStorage
  const [posEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem('rentify_pos_enabled');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const effectiveWebsiteId =
    websiteId ||
    websiteData?.id ||
    websiteData?.websiteId ||
    profile?.websiteId ||
    profile?.roleSpecific?.websiteId ||
    store?.websiteId ||
    store?.website ||
    null;

  const channels = {
    hasStorefront: Boolean(effectiveWebsiteId),
    hasMarketplace: Boolean(store?.marketplaceEnabled ?? true),
    hasPos: posEnabled,
  };

  const effectiveRole = role || profile?.role || 'user';
  const effectivePermissions = profile?.roleSpecific?.permissions || profile?.permissions || [];

  const platformTabs = filterTabsByUserRole(
    ALL_TABS,
    effectiveRole,
    effectivePermissions,
    pkg?.features,
    channels
  ).map((tab) => {
    const translated = t(tab.name);
    const label = (translated && translated !== tab.name) ? translated : (tab.label || tab.name);
    return {
      ...tab,
      name: label,
      displayName: label,
    };
  });

  const { matchedTab } = getCurrentTabData(location.pathname, ALL_TABS);
  
  // Check if user has access to the current tab
  const hasAccessToCurrentTab = matchedTab
    ? platformTabs.some((tab) => tab.path === matchedTab.path)
    : false;

  // If trying to access a tab without permission, show unauthorized
  if (matchedTab && !hasAccessToCurrentTab) {
    return (
      <UnauthorizedAccess
        requiredPermission={matchedTab.permission}
        currentFeature={matchedTab.features?.[0]}
      />
    );
  }

  const currentTabData = platformTabs.find((tab) => tab.path === matchedTab?.path)
    || matchedTab
    || platformTabs[0]
    || ALL_TABS[0];

  // Handler to navigate to tab
  const handleTabChange = (tabPath) => {
    navigate(`/${tabPath}`);
  };

  const sidebarTabs = platformTabs.filter((tab) => !tab.hideInSidebar);

  return (
    <div className="flex h-dvh min-h-screen bg-background">
      <a href="#merchant-main-content" className="rentify-skip-link">{t('dashboard.shell.skip_to_content')}</a>
      {/* Desktop Sidebar */}
      {!isMobile && (
        <AppSidebar
          tabs={sidebarTabs}
          currentTab={currentTabData}
          onTabChange={handleTabChange}
          userData={profile}
          onLogout={handleLogout}
          isOpen={sidebarOpen}
          setOpen={setSidebarOpen}
          hasStorefront={channels.hasStorefront}
          searchFilter={searchFilter}
          store={store}
        />
      )}

      {/* Mobile Sidebar */}
      {isMobile && (
        <AppSidebar
          tabs={sidebarTabs}
          currentTab={currentTabData}
          onTabChange={handleTabChange}
          userData={profile}
          onLogout={handleLogout}
          isOpen={sidebarOpen}
          setOpen={setSidebarOpen}
          hasStorefront={channels.hasStorefront}
          searchFilter={searchFilter}
          store={store}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <SiteHeader
          currentTab={currentTabData}
          onSidebarToggle={() => setSidebarOpen(!sidebarOpen)}
          isSidebarOpen={sidebarOpen}
          userData={profile}
          tabs={sidebarTabs}
          onTabChange={handleTabChange}
          searchFilter={searchFilter}
          setSearchFilter={setSearchFilter}
          store={store}
        />
        
        <main id="merchant-main-content" tabIndex="-1" className="flex-1 overflow-auto bg-background scrollbar-subtle">
          {store?.entitlements?.isGracePeriod && (
            <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-3 text-amber-900 dark:text-amber-200 text-xs sm:text-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{t('dashboard.shell.grace_period_title')}</span>
                <span>{t('dashboard.shell.grace_period_description')}</span>
              </div>
              <a
                href="/settings/billing"
                className="underline font-semibold whitespace-nowrap hover:text-amber-950 dark:hover:text-amber-100"
              >
                {t('dashboard.shell.review_billing')} &rarr;
              </a>
            </div>
          )}
          {store?.entitlements?.isSuspended && (
            <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-3 text-red-900 dark:text-red-200 text-xs sm:text-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{t('dashboard.shell.suspended_title')}</span>
                <span>{store?.entitlements?.restrictionReason || t('dashboard.shell.suspended_description')}</span>
              </div>
              <a
                href="/settings/billing"
                className="underline font-semibold whitespace-nowrap hover:text-red-950 dark:hover:text-red-100"
              >
                {t('dashboard.shell.settle_subscription')} &rarr;
              </a>
            </div>
          )}
          {store?.needsCategoryReview && (
            <div className="p-4 md:p-6 max-w-7xl mx-auto">
              <StoreCategoryPrompt store={store} onStoreChange={setStore} />
            </div>
          )}
          <Suspense
            fallback={
              <WorkspaceState kind="loading" title={t('dashboard.shell.loading_feature')} />
            }
          >
            <div key={location.pathname} className="ds-page min-h-full">
              <Outlet />
            </div>
          </Suspense>
        </main>
      </div>
    </div>
  );
};

export const DashboardLayout = () => {
  const { websiteId, isLoading: websiteLoading } = useWebsiteData();
  const [store, setStore] = useState(null);
  const [storeLoaded, setStoreLoaded] = useState(false);
  const [storeLoadError, setStoreLoadError] = useState(false);
  const { isAuthenticated, isLoading: authLoading, profile } = useAuth();
  const { t } = useTranslation();

  useEffect(() => {
    if (!isAuthenticated) return;
    let active = true;
    setStoreLoadError(false);
    fetch(`${RENTIFY_API_BASE}/api/stores/mine`, { credentials: 'include' })
      .then((response) => {
        if (!response.ok) throw new Error(`Store request failed with ${response.status}`);
        return response.json();
      })
      .then((result) => { if (active) { setStore(result?.data || null); setStoreLoaded(true); } })
      .catch(() => {
        if (active) {
          setStoreLoadError(true);
          setStoreLoaded(true);
        }
      });
    return () => { active = false; };
  }, [isAuthenticated]);

  if (authLoading) {
    return <WorkspaceState kind="loading" title={t('dashboard.shell.loading_workspace')} fullScreen />;
  }

  // Show authentication required if not authenticated
  if (!isAuthenticated) {
    return <AuthenticationRequired />;
  }

  if (websiteLoading || !storeLoaded) {
    return <WorkspaceState kind="loading" title={t('dashboard.shell.loading_store')} fullScreen />;
  }

  if (storeLoadError) {
    const offline = typeof navigator !== 'undefined' && !navigator.onLine;
    return (
      <WorkspaceState
        kind={offline ? 'offline' : 'error'}
        title={t(offline ? 'dashboard.shell.offline_title' : 'dashboard.shell.store_error_title')}
        description={t(offline ? 'dashboard.shell.offline_description' : 'dashboard.shell.store_error_description')}
        actionLabel={t('dashboard.shell.try_again')}
        onAction={() => window.location.reload()}
        fullScreen
      />
    );
  }

  const effectiveWebsiteId =
    websiteId ||
    profile?.websiteId ||
    profile?.roleSpecific?.websiteId ||
    store?.websiteId ||
    store?.website ||
    null;

  if (!effectiveWebsiteId && !store) {
    return (
      <main className="min-h-screen grid place-items-center text-center p-6">
        <div className="max-w-md space-y-4">
          <h1 className="text-2xl font-bold">{t('dashboard.shell.welcome')}</h1>
          <p className="text-muted-foreground">{t('dashboard.shell.no_store_description')}</p>
          <a href={`${MARKETING_URL}/start`} className="inline-block bg-primary text-primary-foreground font-medium rounded-lg px-6 py-2.5">
            {t('dashboard.shell.create_store')}
          </a>
        </div>
      </main>
    );
  }

  return (
    <ChannelProvider initialStore={store} onStoreChange={setStore}>
      <DashboardLayoutContent store={store} setStore={setStore} />
    </ChannelProvider>
  );
};

export default DashboardLayout;
