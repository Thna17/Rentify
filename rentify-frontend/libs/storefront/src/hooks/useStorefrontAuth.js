import { useEffect, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  useGetCustomerQuery,
  useLogoutCustomerMutation,
  useRefreshCustomerMutation,
  setCredentials,
  clearCredentials,
} from '../api';
import {
  useGetUserQuery,
  useGetStaffQuery,
  useLogoutMutation,
  useLogoutStaffMutation,
  useRefreshMutation,
  useRefreshStaffMutation,
} from '../ownerSessionApi';
import { useStorefrontWebsite } from '../website';
import { isHostedStorefrontBuyer } from '../hostedBuyer';

const getCookieValue = (name) => {
  if (typeof document === 'undefined') return null;
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`));
  return match ? match.split('=')[1] : null;
};

const resolveAuthRole = () => {
  const cookieRole = getCookieValue('authType');
  if (cookieRole) return cookieRole;
  if (typeof document !== 'undefined') {
    if (document.cookie.includes('userAccessToken')) return 'user';
    if (document.cookie.includes('staffAccessToken')) return 'staff';
    if (document.cookie.includes('customerAccessToken')) return 'customer';
  }
  return null;
};

export const useStorefrontAuth = () => {
  const hostedBuyer = isHostedStorefrontBuyer();
  const dispatch = useDispatch();
  const auth = useSelector((state) => state.auth || {});

  let website = null;
  try {
    website = useStorefrontWebsite();
  } catch {
    website = null;
  }

  const authRole = hostedBuyer ? 'user' : resolveAuthRole() || auth.role || null;

  // Conditional RTK queries based on active session role
  const userQuery = useGetUserQuery(undefined, {
    skip: authRole !== 'user',
  });
  const staffQuery = useGetStaffQuery(undefined, {
    skip: authRole !== 'staff',
  });
  const customerQuery = useGetCustomerQuery(undefined, {
    skip: authRole !== 'customer',
  });

  const activeQuery =
    authRole === 'user'
      ? userQuery
      : authRole === 'staff'
        ? staffQuery
        : customerQuery;

  // Mutations
  const [logoutUser] = useLogoutMutation();
  const [logoutStaff] = useLogoutStaffMutation();
  const [logoutCustomer] = useLogoutCustomerMutation();

  const [refreshUser] = useRefreshMutation();
  const [refreshStaff] = useRefreshStaffMutation();
  const [refreshCustomer] = useRefreshCustomerMutation();

  const transformProfile = useCallback((data, role) => {
    if (!data) return null;
    const base = {
      id: data.id,
      name: data.name || data.email || 'User',
      email: data.email,
      phoneNumber: data.phoneNumber,
      role,
    };
    if (role === 'user') {
      return {
        ...base,
        profileImage: data.profileImage,
        isVerified: data.isVerified,
        Websites: Array.isArray(data.Websites) ? data.Websites : [],
      };
    }
    if (role === 'staff') {
      return {
        ...base,
        permissions: Array.isArray(data.permissions) ? data.permissions : [],
      };
    }
    if (role === 'customer') {
      return {
        ...base,
        storeId: data.storeId,
      };
    }
    return base;
  }, []);

  // Sync profile to Redux on fetch success
  useEffect(() => {
    if (activeQuery.isSuccess && activeQuery.data && authRole) {
      const profile = transformProfile(activeQuery.data, authRole);
      dispatch(
        setCredentials({
          role: authRole,
          profile,
          expiresAt: Date.now() + 15 * 60 * 1000,
        })
      );
    }
  }, [
    activeQuery.isSuccess,
    activeQuery.data,
    authRole,
    dispatch,
    transformProfile,
  ]);

  // Handle token refresh threshold
  useEffect(() => {
    if (!auth?.expiresAt || !authRole) return;
    const threshold = 5 * 60 * 1000;
    const timeUntilExpiry = auth.expiresAt - Date.now();
    if (timeUntilExpiry < threshold && timeUntilExpiry > 0) {
      const runRefresh = async () => {
        try {
          if (authRole === 'user') await refreshUser().unwrap();
          else if (authRole === 'staff') await refreshStaff().unwrap();
          else if (authRole === 'customer') await refreshCustomer().unwrap();
          dispatch(
            setCredentials({
              expiresAt: Date.now() + 15 * 60 * 1000,
            })
          );
        } catch (err) {
          console.warn('Storefront token refresh skipped/failed:', err);
        }
      };
      runRefresh();
    }
  }, [
    auth?.expiresAt,
    authRole,
    dispatch,
    refreshUser,
    refreshStaff,
    refreshCustomer,
  ]);

  // Handle auth error (e.g. expired session)
  useEffect(() => {
    if (
      activeQuery.isError &&
      (activeQuery.error?.status === 401 || activeQuery.error?.status === 403)
    ) {
      dispatch(clearCredentials());
    }
  }, [activeQuery.isError, activeQuery.error, dispatch]);

  const activeProfile = hostedBuyer
    ? (activeQuery.data ? transformProfile(activeQuery.data, authRole) : null)
    : auth.profile || (activeQuery.data ? transformProfile(activeQuery.data, authRole) : null);

  // Store ownership verification
  const isOwner = useMemo(() => {
    if (!activeProfile || (authRole !== 'user' && activeProfile.role !== 'user')) {
      return false;
    }
    const currentWebsiteId = website?.websiteId;
    const currentOwnerId = website?.userId;

    if (currentOwnerId && activeProfile.id && String(currentOwnerId) === String(activeProfile.id)) {
      return true;
    }
    if (currentWebsiteId && Array.isArray(activeProfile.Websites)) {
      if (activeProfile.Websites.some((w) => String(w.id) === String(currentWebsiteId))) {
        return true;
      }
    }
    if (typeof window !== 'undefined' && Array.isArray(activeProfile.Websites)) {
      const hostname = window.location.hostname;
      if (
        activeProfile.Websites.some(
          (w) => w.domain && (w.domain === hostname || hostname.includes(w.domain))
        )
      ) {
        return true;
      }
    }
    return false;
  }, [activeProfile, authRole, website?.websiteId, website?.userId]);

  const logout = useCallback(async () => {
    try {
      if (authRole === 'user') await logoutUser().unwrap();
      else if (authRole === 'staff') await logoutStaff().unwrap();
      else if (authRole === 'customer') await logoutCustomer().unwrap();
    } catch (err) {
      console.warn('Logout request handled:', err);
    } finally {
      dispatch(clearCredentials());
      if (typeof document !== 'undefined') {
        const domain = window.location.hostname;
        const cookieNames = [
          'authType',
          'userAccessToken',
          'userRefreshToken',
          'customerAccessToken',
          'customerRefreshToken',
          'staffAccessToken',
          'staffRefreshToken',
        ];
        cookieNames.forEach((name) => {
          document.cookie = `${name}=; Max-Age=0; path=/; domain=${domain}`;
          document.cookie = `${name}=; Max-Age=0; path=/`;
        });
      }
    }
  }, [authRole, dispatch, logoutUser, logoutStaff, logoutCustomer]);

  const isAuthenticated = Boolean(authRole && (Boolean(activeProfile) || activeQuery.isSuccess));

  return {
    profile: activeProfile,
    isAuthenticated,
    isLoading: activeQuery.isLoading,
    role: authRole || activeProfile?.role || null,
    isOwner,
    isMerchant: hostedBuyer ? isOwner : authRole === 'user' || activeProfile?.role === 'user',
    isStaff: authRole === 'staff' || activeProfile?.role === 'staff',
    isCustomer: hostedBuyer ? isAuthenticated && !isOwner : authRole === 'customer' || activeProfile?.role === 'customer',
    logout,
    refresh:
      authRole === 'user'
        ? refreshUser
        : authRole === 'staff'
          ? refreshStaff
          : refreshCustomer,
  };
};
