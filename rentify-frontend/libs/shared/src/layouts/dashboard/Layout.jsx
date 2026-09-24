// DashboardLayout.tsx
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth, useTranslation, useMediaQuery } from '@rentify/utils';
import React, { useState, useEffect } from 'react';
import SiteHeader from './SiteHeader';
import AppSidebar from './AppSidebar';
import { useWebsiteData } from '@rentify/shared/context/WebsiteContext';
import { ALL_TABS } from '../../config/dashboard-tabs';
import { filterTabsByUserRole } from '../../utils/filterTabsByUserRole';
import { getCurrentTabData } from '../../utils/getCurrentTabData';
import { UnauthorizedAccess } from '../../ui/components/UnauthorizedAccess';
import { AuthenticationRequired } from '../../ui/components/AuthenticationRequired';
import { Outlet } from 'react-router-dom';

export const DashboardLayout = () => {
  const { package: pkg } = useWebsiteData();
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, isAuthenticated, role, isLoading, handleLogout } = useAuth();
  const isMobile = useMediaQuery('(max-width: 900px)');
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [isMounted, setIsMounted] = useState(false);
  const [accessChecked, setAccessChecked] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login', { replace: true });
    } else if (!isLoading && isAuthenticated) {
      setAccessChecked(true);
    }
  }, [isLoading, isAuthenticated, navigate]);

  // Show authentication required if not authenticated
  if (!isAuthenticated) {
    return <AuthenticationRequired />;
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

  const { matchedTab, params } = getCurrentTabData(location.pathname, ALL_TABS);
  
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
    navigate(`/dashboard/${tabPath}`);
  };

  const sidebarTabs = platformTabs.filter((tab) => !tab.hideInSidebar);

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50/50 via-white to-blue-50/30">
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
        
        <main className="flex-1 overflow-auto bg-background/50">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;