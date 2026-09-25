import React, { createContext, useContext, useState, useEffect } from 'react';
import { useWebsiteData } from '@rentify/shared/context/WebsiteContext';
import { useAuth } from '@rentify/utils';
import { RENTIFY_API_BASE } from '@rentify/shared/config/urls';

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
    try {
      const response = await fetch(`${RENTIFY_API_BASE}/api/stores/mine`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marketplaceEnabled: next }),
      });
      const result = await response.json();
      if (response.ok && result.data) {
        setStore(result.data);
        if (onStoreChange) onStoreChange(result.data);
      }
    } catch {
      const updated = { ...store, marketplaceEnabled: next };
      setStore(updated);
      if (onStoreChange) onStoreChange(updated);
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
