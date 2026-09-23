import { useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  useGetUserQuery,
  useGetCustomerQuery,
  useGetStaffQuery,
  useLogoutMutation,
  useLogoutCustomerMutation,
  useLogoutStaffMutation,
  useRefreshMutation,
  useRefreshCustomerMutation,
  useRefreshStaffMutation,
  useLazyCheckStaffTelegramLinkQuery,
  useLazyCheckTelegramLinkCustomerQuery,
  useLazyCheckTelegramLinkQuery,
} from '@rentify/apis'; // Adjust import path as needed
import { setCredentials, clearCredentials } from '@rentify/apis'; // Adjust import path

const TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes before expiration

export const useAuth = () => {
  const dispatch = useDispatch();
  const auth = useSelector((state) => state.auth) || {};
  
  // Get auth role from cookie
  const authRole = (document.cookie
    .split('; ')
    .find(row => row.startsWith('authType='))
    ?.split('=')[1]);

  // Initialize all profile queries with conditional skipping
  const userProfile = useGetUserQuery(undefined, { 
    skip: !authRole || authRole !== 'user' || !!auth.profile 
  });
  const staffProfile = useGetStaffQuery(undefined, { 
    skip: !authRole || authRole !== 'staff' || !!auth.profile 
  });
  const customerProfile = useGetCustomerQuery(undefined, { 
    skip: !authRole || authRole !== 'customer' || !!auth.profile 
  });
  
  // Select active profile based on authRole
  const activeProfile = authRole === 'user' 
    ? userProfile 
    : authRole === 'staff' 
      ? staffProfile 
      : customerProfile;
  
  const { data, isSuccess, isError, refetch } = activeProfile;

  // Initialize all mutation hooks
  const [logout] = useLogoutMutation();
  const [staffLogout] = useLogoutStaffMutation();
  const [customerLogout] = useLogoutCustomerMutation();
  
  const [refresh] = useRefreshMutation();
  const [staffRefresh] = useRefreshStaffMutation();
  const [customerRefresh] = useRefreshCustomerMutation();

  // Profile transformation function
  const transformProfile = useCallback((data, role) => {
    const baseProfile = {
      id: data.id,
      name: data.name,
      email: data.email,
      role,
    };

    switch (role) {
      case 'user':
        return {
          ...baseProfile,
          roleSpecific: {
            isVerified: data.isVerified,
            profileImage: data.profileImage,
          },
        };
      case 'staff':
        return {
          ...baseProfile,
          roleSpecific: {
            permissions: data.permissions,
          },
        };
      case 'customer':
        return {
          ...baseProfile,
          roleSpecific: {
            storeId: data.storeId,
          },
        };
      default:
        return baseProfile;
    }
  }, []);

  // Handle profile data on successful fetch
  useEffect(() => {
    if (isSuccess && data && authRole) {
      const profile = transformProfile(data, authRole);
      dispatch(setCredentials({
        role: authRole,
        profile,
        expiresAt: Date.now() + 15 * 60 * 1000, // 15 minutes
      }));
    }
  }, [isSuccess, data, authRole, dispatch, transformProfile]);

  // Token expiration handling
  useEffect(() => {
    if (!auth?.expiresAt || !authRole) return;

    const timeUntilExpiry = auth.expiresAt - Date.now();
    
    // Refresh token if about to expire
    if (timeUntilExpiry < TOKEN_REFRESH_THRESHOLD) {
      const refreshAuth = async () => {
        try {
          if (authRole === 'user') await refresh().unwrap();
          else if (authRole === 'staff') await staffRefresh().unwrap();
          else if (authRole === 'customer') await customerRefresh().unwrap();
          
          // Update expiration time
          dispatch(setCredentials({
            expiresAt: Date.now() + 15 * 60 * 1000
          }));
        } catch (error) {
          console.error('Token refresh failed', error);
          handleLogout();
        }
      };
      refreshAuth();
    }
  }, [auth?.expiresAt, authRole, dispatch, refresh, staffRefresh, customerRefresh]);

  // Handle logout functionality
  const handleLogout = useCallback(async () => {
    try {
      if (authRole === 'user') await logout().unwrap();
      else if (authRole === 'staff') await staffLogout().unwrap();
      else if (authRole === 'customer') await customerLogout().unwrap();
    } catch (error) {
      console.error('Logout failed', error);
    } finally {
      // Clear client-side state
      dispatch(clearCredentials());
      
      // Clear cookies
      const domain = window.location.hostname;
      document.cookie = `authType=; Max-Age=0; path=/; domain=${domain}`;
      document.cookie = `accessToken=; Max-Age=0; path=/; domain=${domain}`;
      document.cookie = `refreshToken=; Max-Age=0; path=/; domain=${domain}`;
    }
  }, [authRole, logout, staffLogout, customerLogout, dispatch]);

  // Handle authentication errors
  useEffect(() => {
    if (isError) {
      handleLogout();
    }
  }, [isError, handleLogout]);

  // Telegram link checking
  const checkTelegramLink = useCallback(() => {
    if (authRole === 'user') return useLazyCheckTelegramLinkQuery();
    if (authRole === 'staff') return useLazyCheckStaffTelegramLinkQuery();
    if (authRole === 'customer') return useLazyCheckTelegramLinkCustomerQuery();
    return [() => Promise.resolve({ data: null }), { isLoading: false }];
  }, [authRole]);

  return {
    profile: auth.profile,
    isAuthenticated: !!auth.profile,
    role: auth.role,
    isLoading: !auth.profile && !!authRole,
    handleLogout,
    refreshProfile: refetch,
    checkTelegramLink,
  };
};