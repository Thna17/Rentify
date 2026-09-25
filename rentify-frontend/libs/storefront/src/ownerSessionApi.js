import { userApi } from '@rentify/apis/apis/userApi';
import { userAuthApi } from '@rentify/apis/apis/userAuthApi';
import { staffAuthApi } from '@rentify/apis/apis/staffAuthApi';
import { staffManagementApi } from '@rentify/apis/apis/staffManagementApi';
import { injectStorefrontApis } from './api';

// Store-owner / staff session support for templates with an owner mode. Importing
// this module registers the merchant and staff session APIs with the storefront
// store; customer-only templates must not import it.
injectStorefrontApis([userApi, userAuthApi, staffAuthApi, staffManagementApi]);

export { useGetUserQuery } from '@rentify/apis/apis/userApi';
export { useLogoutMutation, useRefreshMutation } from '@rentify/apis/apis/userAuthApi';
export { useLogoutStaffMutation, useRefreshStaffMutation } from '@rentify/apis/apis/staffAuthApi';
export { useGetStaffQuery } from '@rentify/apis/apis/staffManagementApi';
