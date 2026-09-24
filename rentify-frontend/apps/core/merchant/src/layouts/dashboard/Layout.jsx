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
import MarketplaceStoreOverview from '../../pages/overview/MarketplaceStoreOverview';
import StoreCategoryPrompt from '../../pages/overview/StoreCategoryPrompt';

export const DashboardLayout = () => {
  const { websiteData } = useThemeService();
  const { websiteId, isLoading: websiteLoading } = useWebsiteData();
  const [store, setStore] = useState(null);
  const [storeLoaded, setStoreLoaded] = useState(false);
  const pkg = websiteData.package;
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, isAuthenticated, role, handleLogout } = useAuth();
  const isMobile = useMediaQuery('(max-width: 900px)');
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  useEffect(() => {
    if (!isAuthenticated) return;
    let active = true;
    fetch(`${RENTIFY_API_BASE}/api/stores/mine`, { credentials: 'include' })
      .then((response) => response.ok ? response.json() : null)
      .then((result) => { if (active) { setStore(result?.data || null); setStoreLoaded(true); } })
      .catch(() => { if (active) setStoreLoaded(true); });
    return () => { active = false; };
  }, [isAuthenticated]);

  // Show authentication required if not authenticated
  if (!isAuthenticated) {
    return <AuthenticationRequired />;
  }

  if (websiteLoading || !storeLoaded) {
    return <div className="min-h-screen grid place-items-center">Loading your Store…</div>;
  }
  if (!websiteId && store) {
    return <MarketplaceStoreOverview initialStore={store} onStoreChange={setStore} onLogout={handleLogout} />;
  }
  if (!websiteId) {
    return <main className="min-h-screen grid place-items-center"><a href={`${MARKETING_URL}/start`} className="text-blue-700 underline">Create your Store</a></main>;
  }

  const platformTabs = filterTabsByUserRole(
    ALL_TABS,
    role,
    profile.roleSpecific?.permissions,
    pkg?.features
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

  const currentTabData = matchedTab || platformTabs[0];

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

export default DashboardLayout;
