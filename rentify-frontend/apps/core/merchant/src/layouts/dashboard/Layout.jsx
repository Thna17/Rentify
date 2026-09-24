// DashboardLayout.tsx
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth, useTranslation, useMediaQuery } from '@rentify/utils';
import React, { useState, useEffect } from 'react';
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

  // POS channel enabled state, persisted in localStorage
  const [posEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem('rentify_pos_enabled');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const channels = {
    hasStorefront: Boolean(websiteId),
    hasMarketplace: Boolean(store?.marketplaceEnabled ?? true),
    hasPos: posEnabled,
  };

  const platformTabs = filterTabsByUserRole(
    ALL_TABS,
    role,
    profile?.roleSpecific?.permissions,
    pkg?.features,
    channels
  ).map((tab) => ({
    ...tab,
    name: t(tab.name),
  }));

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

  const currentTabData = matchedTab || platformTabs[0] || ALL_TABS[0];

  // Handler to navigate to tab
  const handleTabChange = (tabPath) => {
    navigate(`/${tabPath}`);
  };

  const sidebarTabs = platformTabs.filter((tab) => !tab.hideInSidebar);

  return (
    <div className="flex h-screen bg-background">
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
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <SiteHeader
          currentTab={currentTabData}
          onSidebarToggle={() => setSidebarOpen(!sidebarOpen)}
          userData={profile}
        />
        
        <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8 bg-background/50">
          <div className="max-w-7xl mx-auto w-full">
            <StoreCategoryPrompt store={store} onStoreChange={setStore} />
            {/* Consistent Page Container */}
            <div className="bg-background rounded-2xl border border-border shadow-sm transition-all duration-300 min-h-[calc(100vh-200px)]">
              <Outlet /> {/* Child routes render here */}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export const DashboardLayout = () => {
  const { websiteId, isLoading: websiteLoading } = useWebsiteData();
  const [store, setStore] = useState(null);
  const [storeLoaded, setStoreLoaded] = useState(false);
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) return;
    let active = true;
    fetch(`${RENTIFY_API_BASE}/api/stores/mine`, { credentials: 'include' })
      .then((response) => response.ok ? response.json() : null)
      .then((result) => { if (active) { setStore(result?.data || null); setStoreLoaded(true); } })
      .catch(() => { if (active) setStoreLoaded(true); });
    return () => { active = false; };
  }, [isAuthenticated]);

  if (authLoading) {
    return <div className="min-h-screen grid place-items-center">Loading…</div>;
  }

  // Show authentication required if not authenticated
  if (!isAuthenticated) {
    return <AuthenticationRequired />;
  }

  if (websiteLoading || !storeLoaded) {
    return <div className="min-h-screen grid place-items-center">Loading your Store…</div>;
  }

  if (!websiteId && !store) {
    return (
      <main className="min-h-screen grid place-items-center text-center p-6">
        <div className="max-w-md space-y-4">
          <h1 className="text-2xl font-bold">Welcome to Rentify</h1>
          <p className="text-muted-foreground">You do not have an active store yet. Create your store to get started with marketplace or storefront selling.</p>
          <a href={`${MARKETING_URL}/start`} className="inline-block bg-primary text-primary-foreground font-medium rounded-lg px-6 py-2.5">
            Create your Store
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
