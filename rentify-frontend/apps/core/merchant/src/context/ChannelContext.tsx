import React, { createContext, useContext, useState, useEffect } from 'react';
import { useWebsiteData } from '@rentify/shared/context/WebsiteContext';
import { useAuth } from '@rentify/utils';
import { RENTIFY_API_BASE } from '@rentify/shared/config/urls';
import { resolveChannelView, type ChannelView } from './channelViewPolicy';
export type { ChannelView } from './channelViewPolicy';

export interface ChannelCapabilities {
  hasStorefront: boolean;
  hasMarketplace: boolean;
  hasPos: boolean;
}

export interface ChannelContextType {
  channels: ChannelCapabilities;
  store: any;
  setStore: React.Dispatch<React.SetStateAction<any>>;
  websiteId: string | null;
  hasStorefront: boolean;
  hasMarketplace: boolean;
  hasPos: boolean;
  togglePos: (enabled?: boolean) => void;
  toggleMarketplace: (enabled?: boolean) => Promise<void>;
  view: ChannelView;
  setView: (view: ChannelView) => void;
  availableViews: ChannelView[];
}

const defaultContext: ChannelContextType = {
  channels: { hasStorefront: false, hasMarketplace: true, hasPos: true },
  store: null,
  setStore: () => undefined,
  websiteId: null,
  hasStorefront: false,
  hasMarketplace: true,
  hasPos: true,
  togglePos: () => undefined,
  toggleMarketplace: async () => undefined,
  view: 'all',
  setView: () => undefined,
  availableViews: ['all'],
};

const ChannelContext = createContext<ChannelContextType>(defaultContext);

export interface ChannelProviderProps {
  children: React.ReactNode;
  initialStore?: any;
  onStoreChange?: (store: any) => void;
}

export const ChannelProvider: React.FC<ChannelProviderProps> = ({
  children,
  initialStore,
  onStoreChange,
}) => {
  const { websiteId } = useWebsiteData();
  const { profile } = useAuth();
  const [store, setStore] = useState<any>(initialStore || null);

  useEffect(() => {
    if (initialStore) {
      setStore(initialStore);
    }
  }, [initialStore]);

  // POS channel toggle - persisted in localStorage
  const [posEnabled, setPosEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('rentify_pos_enabled');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const togglePos = (enabled?: boolean) => {
    const next = typeof enabled === 'boolean' ? enabled : !posEnabled;
    setPosEnabled(next);
    try {
      localStorage.setItem('rentify_pos_enabled', String(next));
    } catch {
      // ignore storage errors
    }
  };

  const effectiveWebsiteId =
    websiteId ||
    store?.websiteId ||
    store?.website ||
    profile?.websiteId ||
    profile?.roleSpecific?.websiteId ||
    null;

  const hasStorefront = Boolean(effectiveWebsiteId);
  const hasMarketplace = Boolean(store?.marketplaceEnabled ?? true);

  const toggleMarketplace = async (enabled?: boolean) => {
    const next = typeof enabled === 'boolean' ? enabled : !hasMarketplace;
    // The switch follows Core: nothing changes on screen unless the Store was saved
    const response = await fetch(`${RENTIFY_API_BASE}/api/stores/mine`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ marketplaceEnabled: next }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.data) throw new Error(`Store update failed (${response.status})`);
    setStore(result.data);
    if (onStoreChange) onStoreChange(result.data);
  };

  // Remember explicit choices; otherwise open the appropriate seller workspace.
  const [savedView, setSavedView] = useState<string | null>(() => {
    try {
      return localStorage.getItem('rentify_channel_view');
    } catch {
      return null;
    }
  });
  const availableViews: ChannelView[] = [
    'all',
    ...(hasStorefront ? (['storefront'] as const) : []),
    ...(hasMarketplace ? (['marketplace'] as const) : []),
    ...(posEnabled ? (['pos'] as const) : []),
  ];
  const view = resolveChannelView(savedView, availableViews);
  const setView = (next: ChannelView) => {
    setSavedView(next);
    try {
      localStorage.setItem('rentify_channel_view', next);
    } catch {
      // ignore storage errors
    }
  };

  const channels: ChannelCapabilities = {
    hasStorefront,
    hasMarketplace,
    hasPos: posEnabled,
  };

  return (
    <ChannelContext.Provider
      value={{
        channels,
        store,
        setStore,
        websiteId: effectiveWebsiteId,
        hasStorefront,
        hasMarketplace,
        hasPos: posEnabled,
        togglePos,
        toggleMarketplace,
        view,
        setView,
        availableViews,
      }}
    >
      {children}
    </ChannelContext.Provider>
  );
};

export const useChannels = (): ChannelContextType => {
  const context = useContext(ChannelContext);
  if (!context) {
    return defaultContext;
  }
  return context;
};

// Alias for components that import useChannelContext
export const useChannelContext = useChannels;

export default ChannelContext;
