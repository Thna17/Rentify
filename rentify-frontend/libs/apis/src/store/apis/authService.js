import {
  useGetUserQuery as useGetUser,
  useGetCustomerQuery as useGetCustomer,
  useGetStaffQuery as useGetStaff,
  useLogoutMutation as useLogoutUser,
  useLogoutCustomerMutation as useLogoutCustomer,
  useLogoutStaffMutation as useLogoutStaff,
  useRefreshMutation as useRefreshUser,
  useRefreshCustomerMutation as useRefreshCustomer,
  useRefreshStaffMutation as useRefreshStaff,
  useLazyCheckStaffTelegramLinkQuery,
  useLazyCheckTelegramLinkCustomerQuery,
  useLazyCheckTelegramLinkQuery,
} from '../index';

// Unified API methods
export const authApi = {
  getProfile: (role) => {
    switch (role) {
      case 'user':
        return useGetUser;
      case 'staff':
        return useGetStaff;
      case 'customer':
        return useGetCustomer;
      default:
        throw new Error('Invalid auth role');
    }
  },

  logout: (role) => {
    switch (role) {
      case 'user':
        return useLogoutUser;
      case 'staff':
        return useLogoutStaff;
      case 'customer':
        return useLogoutCustomer;
      default:
        throw new Error('Invalid auth role');
    }
  },

  refreshToken: (role) => {
    switch (role) {
      case 'user':
        return useRefreshUser;
      case 'staff':
        return useRefreshStaff;
      case 'customer':
        return useRefreshCustomer;
      default:
        throw new Error('Invalid auth role');
    }
  },

  checkTelegramLink: (role) => {
    switch (role) {
      case 'user':
        return useLazyCheckTelegramLinkQuery;
      case 'staff':
        return useLazyCheckStaffTelegramLinkQuery;
      case 'customer':
        return useLazyCheckTelegramLinkCustomerQuery;
      default:
        throw new Error('Invalid auth role');
    }
  },
};

// Unified profile transformer
export const transformProfile = (data, role) => {
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
};
