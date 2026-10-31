import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  AUTH_URL,
  DASHBOARD_URL,
  ADMIN_DASHBOARD_URL,
  RENTIFY_API_BASE,
} from '@rentify/shared/config/urls';

const getAuthRoleFromCookie = () => {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)authType=([^;]+)/);
  return match ? decodeURIComponent(match[1]).trim() : null;
};

export const getDashboardUrl = (role) => {
  if (role === 'admin') {
    const base = ADMIN_DASHBOARD_URL || 'https://rentify-admin.mekhla.digital';
    return `${base.replace(/\/+$/, '')}/admin/dashboard`;
  }
  const base = DASHBOARD_URL || 'https://rentify-seller.mekhla.digital';
  return `${base.replace(/\/+$/, '')}/overview`;
};

export const useMarketingAuth = () => {
  const initialRole = getAuthRoleFromCookie();
  const [role, setRole] = useState(initialRole);
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(initialRole));
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(Boolean(initialRole));

  const checkSession = useCallback(async () => {
    const cookieRole = getAuthRoleFromCookie();
    // If no auth cookie at all, visitor is not signed in
    if (!cookieRole) {
      setIsAuthenticated(false);
      setRole(null);
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${RENTIFY_API_BASE}/api/auth/me`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        const resolvedUser = data?.user || data?.data;
        if (resolvedUser) {
          setUser(resolvedUser);
          setRole(resolvedUser.role || cookieRole);
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(true);
          setRole(cookieRole);
        }
      } else if (response.status === 401) {
        setIsAuthenticated(false);
        setRole(null);
        setUser(null);
      }
    } catch {
      // On network failure or offline, preserve optimistic cookie state
      if (cookieRole) {
        setIsAuthenticated(true);
        setRole(cookieRole);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSession();

    // Re-verify on window focus so login/logout in other tabs syncs immediately
    const handleFocus = () => {
      checkSession();
    };
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [checkSession]);

  const dashboardHref = useMemo(() => getDashboardUrl(role), [role]);

  return {
    isAuthenticated,
    role,
    user,
    dashboardHref,
    authUrl: AUTH_URL,
    isLoading,
    refreshSession: checkSession,
  };
};

export default useMarketingAuth;
