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
import { AlertOctagon, ArrowRight, Clock3 } from 'lucide-react';

const NOTICE_TONES = {
  warning: { box: 'bg-amber-500/[0.08]', icon: 'bg-amber-500/15 text-amber-700', title: 'text-amber-900', action: 'bg-amber-900 text-amber-50 hover:bg-amber-950' },
  danger: { box: 'bg-rose-500/[0.08]', icon: 'bg-rose-500/15 text-rose-700', title: 'text-rose-900', action: 'bg-rose-900 text-rose-50 hover:bg-rose-950' },
};

// Compact, stroke-free subscription notice shown above every dashboard page
const SubscriptionNotice = ({ tone, icon, title, body, actionLabel }) => {
  const t = NOTICE_TONES[tone];
  return (
    <div className="px-4 pt-4 sm:px-6 md:px-8">
      <div role="status" className={`mx-auto flex max-w-[1400px] flex-col gap-3 rounded-2xl px-4 py-3 sm:flex-row sm:items-center sm:gap-4 ${t.box}`}>
        <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${t.icon}`}>{icon}</span>
          <p className="min-w-0 text-[13px] leading-snug text-foreground/80">
            <span className={`font-semibold ${t.title}`}>{title}.</span> {body}
          </p>
        </div>
        <a
          href="/settings/billing"
          className={`inline-flex min-h-[36px] w-fit shrink-0 items-center gap-1.5 rounded-xl px-3.5 text-[13px] font-semibold transition-colors ${t.action}`}
        >
          {actionLabel}
          <ArrowRight className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
};

export const DashboardLayoutContent = ({ store, setStore }) => {
  const { websiteData } = useThemeService();
  const { websiteId } = useWebsiteData();
  const pkg = websiteData?.package || null;
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, role, handleLogout } = useAuth();
  const isMobile = useMediaQuery('(max-width: 900px)');
  // Read the width directly: useMediaQuery reports false on the first render, which would open the phone drawer
  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window === 'undefined' ? true : !window.matchMedia('(max-width: 900px)').matches
  );
  const [searchFilter, setSearchFilter] = useState('');

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
          channels={channels}
          store={store}
          searchFilter={searchFilter}
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
          channels={channels}
          store={store}
          searchFilter={searchFilter}
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
          hasPos={channels.hasPos}
        />
        
        <main className="flex-1 overflow-auto bg-background scrollbar-subtle">
          {store?.entitlements?.isGracePeriod && (
            <SubscriptionNotice
              tone="warning"
              icon={<Clock3 className="h-4 w-4" />}
              title="Grace period active"
              body="Your storefront and marketplace sales remain live, but adding products, staff, and website edits are locked until subscription renewal."
              actionLabel="Review billing"
            />
          )}
          {store?.entitlements?.isSuspended && (
            <SubscriptionNotice
              tone="danger"
              icon={<AlertOctagon className="h-4 w-4" />}
              title="Subscription suspended"
              body={store?.entitlements?.restrictionReason || "Your subscription is suspended. Historical orders and invoices remain readable for 90 days."}
              actionLabel="Settle subscription"
            />
          )}
          {store?.needsCategoryReview && (
            <div className="p-4 md:p-6 max-w-7xl mx-auto">
              <StoreCategoryPrompt store={store} onStoreChange={setStore} />
            </div>
          )}
          <Suspense
            fallback={
              <div className="flex h-64 w-full items-center justify-center p-8">
                <div className="flex flex-col items-center gap-3">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent dark:border-blue-400" />
                  <span className="text-xs text-muted-foreground font-medium">Loading feature...</span>
                </div>
              </div>
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
  const { isAuthenticated, isLoading: authLoading, profile } = useAuth();

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
