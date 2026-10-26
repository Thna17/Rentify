import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { RENTIFY_API_BASE, ECOMMERCE_API_BASE, AUTH_URL } from '@rentify/shared/config/urls';

const LS_KEY = 'rentify.pos.activeStore';

const DEFAULT_PAYMENT_TYPES = [
  { id: 'cash', name: 'Cash', type: 'cash', label: 'Cash (USD / KHR)' },
  { id: 'khqr', name: 'Bakong KHQR', type: 'khqr', label: 'Bakong KHQR' },
  { id: 'card', name: 'Card', type: 'card', label: 'Card Payment' },
];

const DEFAULT_ORDER_OPTIONS = [
  { id: 'in_store', name: 'In-Store Sale', label: 'In-Store' },
  { id: 'takeaway', name: 'Take-away', label: 'Takeaway' },
  { id: 'delivery', name: 'Delivery', label: 'Delivery' },
];

export function resolvePaymentMethod(typeString) {
  const t = String(typeString || '').toLowerCase();
  if (t === 'cash' || t === 'cod') return { method: 'COD', provider: 'COD' };
  if (t === 'card') return { method: 'CARD', provider: 'ABA_PAYWAY' };
  if (t === 'khqr' || t === 'qr') return { method: 'WALLET', provider: 'KHQR' };
  if (t === 'transfer' || t === 'bank') return { method: 'WALLET', provider: 'BANK_TRANSFER' };
  return { method: 'COD', provider: 'COD' };
}

export function isProductInStore(product, activeStoreId) {
  if (!product) return false;
  if (product.status && product.status !== 'active') return false;
  if (!activeStoreId) return true;
  return product.storeId === activeStoreId || !product.storeId;
}

const RentifyPOSContext = createContext(null);

export function RentifyPOSProvider({ children }) {
  const [user, setUser] = useState(null);
  const [store, setStore] = useState(null);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [persistedStoreId, setPersistedStoreId] = useState(() => {
    try {
      return localStorage.getItem(LS_KEY) || '';
    } catch {
      return '';
    }
  });

  const checkAuthAndLoadStore = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch current auth profile from Core API
      let authRes = await fetch(`${RENTIFY_API_BASE}/api/auth/session`, {
        credentials: 'include',
      });

      if (!authRes.ok) {
        // Wait 400ms and retry in case cookie was just written across subdomains
        await new Promise((r) => setTimeout(r, 400));
        authRes = await fetch(`${RENTIFY_API_BASE}/api/auth/session`, {
          credentials: 'include',
        });
      }

      if (!authRes.ok) {
        authRes = await fetch(`${RENTIFY_API_BASE}/api/user`, {
          credentials: 'include',
        });
      }

      if (!authRes.ok) {
        // Prevent infinite redirect loop if unauthenticated or cookies blocked
        const lastRedirect = sessionStorage.getItem('rentify_pos_last_auth_redirect');
        const now = Date.now();
        if (lastRedirect && now - Number(lastRedirect) < 8000) {
          console.warn('POS Auth redirect loop prevented. Showing unauthenticated state.');
          setUser(null);
          setLoading(false);
          return;
        }
        sessionStorage.setItem('rentify_pos_last_auth_redirect', String(now));
        const returnUrl = encodeURIComponent(window.location.href);
        window.location.href = `${AUTH_URL}/login?returnUrl=${returnUrl}`;
        return;
      }

      sessionStorage.removeItem('rentify_pos_last_auth_redirect');

      const authData = await authRes.json();
      const currentUser = authData.data || authData.user || authData;
      setUser(currentUser);

      // 2. Fetch merchant's active store
      let activeStoreRecord = null;
      const searchParams = new URLSearchParams(window.location.search);
      const queryStoreId = searchParams.get('storeId');

      try {
        const storeRes = await fetch(`${RENTIFY_API_BASE}/api/stores/mine`, {
          credentials: 'include',
        });

        if (storeRes.ok) {
          const storeData = await storeRes.json();
          activeStoreRecord = storeData.data || storeData.store || null;
        }
      } catch {
        // continue to website fallback
      }

      // Fallback: If no store record returned directly, check merchant's website
      if (!activeStoreRecord) {
        try {
          const webRes = await fetch(`${RENTIFY_API_BASE}/api/websites`, {
            credentials: 'include',
          });
          if (webRes.ok) {
            const webData = await webRes.json();
            const websiteRecord = webData.data || webData;
            if (websiteRecord?.storeId) {
              activeStoreRecord = {
                id: websiteRecord.storeId,
                name: websiteRecord.name || websiteRecord.businessDetails?.storeName || 'Merchant Store',
                slug: websiteRecord.name?.toLowerCase().replace(/\s+/g, '-') || 'store',
                primaryCategory: websiteRecord.businessDetails?.storeCategory || 'General',
              };
            }
          }
        } catch {
          // ignore fallback error
        }
      }

      // If query param is provided, use it or override store id
      if (queryStoreId && (!activeStoreRecord || activeStoreRecord.id !== queryStoreId)) {
        activeStoreRecord = {
          id: queryStoreId,
          name: activeStoreRecord?.name || 'Merchant Store',
          slug: activeStoreRecord?.slug || 'store',
          primaryCategory: activeStoreRecord?.primaryCategory || 'General',
        };
      }

      if (activeStoreRecord) {
        setStore(activeStoreRecord);
        setStores([activeStoreRecord]);
        try {
          localStorage.setItem(LS_KEY, activeStoreRecord.id);
        } catch {
          // noop
        }
      }
    } catch (err) {
      console.error('POS Context Load Error:', err);
      setError(err.message || 'Failed to authenticate');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuthAndLoadStore();
  }, [checkAuthAndLoadStore]);

  const activeStore = useMemo(() => {
    if (!store) return null;
    return {
      id: store.id,
      name: store.name || 'Merchant Store',
      code: store.slug || store.name || 'store',
      slug: store.slug || '',
      primaryCategory: store.primaryCategory || 'General',
      primaryCurrency: 'USD',
      secondaryCurrency: 'KHR',
    };
  }, [store]);

  const setActiveStore = useCallback((storeId) => {
    try {
      localStorage.setItem(LS_KEY, storeId);
    } catch {
      // noop
    }
    setPersistedStoreId(storeId);
  }, []);

  const primaryCurrency = useMemo(() => ({
    code: 'USD',
    symbol: '$',
    rate: 1,
    name: 'US Dollar',
  }), []);

  const secondaryCurrency = useMemo(() => ({
    code: 'KHR',
    symbol: '៛',
    rate: 4100,
    name: 'Khmer Riel',
  }), []);

  const exchangeRate = 4100;

  const hasPosPermission = useMemo(() => {
    if (!user) return false;
    if (user.type !== 'staff') return true;
    const permissions = Array.isArray(user.permissions) ? user.permissions : [];
    return permissions.includes('pos') || permissions.includes('manage_pos');
  }, [user]);

  const filterProductsForStore = useCallback((products) => {
    if (!Array.isArray(products)) return [];
    if (!activeStore?.id) return products;
    return products.filter((p) => !p.storeId || p.storeId === activeStore.id);
  }, [activeStore?.id]);

  const value = {
    isLoading: loading,
    error,
    user,
    hasPosPermission,
    store,
    stores,
    activeStore,
    activeStoreId: activeStore?.id || null,
    activeStoreName: activeStore?.name || '',
    setActiveStore,
    storePaymentTypes: DEFAULT_PAYMENT_TYPES,
    primaryCurrency,
    secondaryCurrency,
    exchangeRate,
    storeOrderOptions: DEFAULT_ORDER_OPTIONS,
    storePrinters: [],
    filterProductsForStore,
    isProductInStore,
    refetchAuth: checkAuthAndLoadStore,
  };

  return (
    <RentifyPOSContext.Provider value={value}>
      {children}
    </RentifyPOSContext.Provider>
  );
}

export function useRentifyPOSContext() {
  const ctx = useContext(RentifyPOSContext);
  if (!ctx) {
    throw new Error('useRentifyPOSContext must be used within a RentifyPOSProvider');
  }
  return ctx;
}

export default function useStorePOS() {
  return useRentifyPOSContext();
}
