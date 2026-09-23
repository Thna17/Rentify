import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { ECOMMERCE_API_ROOT } from '../apiBase';

export const customerApi = createApi({
  reducerPath: 'customerApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${ECOMMERCE_API_ROOT}/api`,
    credentials: 'include',
  }),
  endpoints: (builder) => ({
    loginCustomer: builder.mutation({
      query: ({
        email,
        password,
        storeId,
        phoneNumber,
        verificationMethod,
      }) => ({
        url: '/auth/login',
        method: 'POST',
        body: { email, password, storeId, phoneNumber, verificationMethod },
      }),
    }),
    signupCustomer: builder.mutation({
      query: ({
        name,
        email,
        password,
        confirmPassword,
        storeId,
        phoneNumber,
        verificationMethod,
      }) => ({
        url: '/auth/signup',
        method: 'POST',
        body: {
          name,
          email,
          password,
          confirmPassword,
          storeId,
          phoneNumber,
          verificationMethod,
        },
      }),
    }),
    verifyCustomerOtp: builder.mutation({
      query: ({ email, otp, storeId, phoneNumber, verificationMethod }) => ({
        url: '/auth/verify-otp',
        method: 'POST',
        body: { email, otp, storeId, phoneNumber, verificationMethod },
      }),
    }),
    refreshCustomer: builder.mutation({
      query: () => ({
        url: 'auth/refresh-token',
        method: 'POST',
      }),
    }),
    logoutCustomer: builder.mutation({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
      }),
    }),
    forgotPasswordCustomer: builder.mutation({
      query: ({ email, storeId, phoneNumber }) => ({
        url: '/auth/forgot-password',
        method: 'POST',
        body: { email, storeId, phoneNumber },
      }),
    }),
    resetPasswordCustomer: builder.mutation({
      query: ({ token, password, storeId }) => ({
        url: `/auth/reset-password`,
        method: 'POST',
        body: { password, storeId, token },
      }),
    }),
    resendOtpCustomer: builder.mutation({
      query: ({ email, phoneNumber, verificationMethod, storeId }) => ({
        url: 'auth/resend-otp',
        method: 'POST',
        body: { email, phoneNumber, verificationMethod, storeId },
      }),
    }),
    checkTelegramLinkCustomer: builder.query({
      query: ({ phoneNumber }) => ({
        url: `auth/check-telegram-link`,
        params: { phoneNumber },
      }),
    }),
    getCustomer: builder.query({
      query: () => '/customer',
    }),
    cancelOrderByCustomer: builder.mutation({
  query: (orderId) => ({
    url: `/customer/orders/${orderId}/cancel-by-customer`,
    method: 'POST',
  }),
}),
  }),
});

export const {
  useLoginCustomerMutation,
  useSignupCustomerMutation,
  useVerifyCustomerOtpMutation,
  useRefreshCustomerMutation,
  useLogoutCustomerMutation,
  useForgotPasswordCustomerMutation,
  useResetPasswordCustomerMutation,
  useGetCustomerQuery,
  useResendOtpCustomerMutation,
  useLazyCheckTelegramLinkCustomerQuery,
  useCancelOrderByCustomerMutation
} = customerApi;
