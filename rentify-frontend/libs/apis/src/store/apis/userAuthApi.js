import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const userAuthApi = createApi({
  reducerPath: 'userAuthApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${__API_URL__}/api/auth`,
    credentials: 'include',
  }),
  endpoints: (builder) => ({
    login: builder.mutation({
      query: (credentials) => ({
        url: '/login',
        method: 'POST',
        body: credentials,
      }),
    }),
    loginWithTelegram: builder.mutation({
      query: (authData) => ({
        url: '/login/telegram',
        method: 'POST',
        body: { authData },
      }),
    }),
    getTelegramLoginConfig: builder.query({
      query: () => '/telegram-login-config',
    }),
    signup: builder.mutation({
      query: (userData) => ({
        url: '/signup',
        method: 'POST',
        body: userData,
      }),
    }),
    verifyOtp: builder.mutation({
      query: ({ email, otp, phoneNumber, verificationMethod }) => ({
        url: '/verify-otp',
        method: 'POST',
        body: { email, otp, phoneNumber, verificationMethod },
      }),
    }),
    refresh: builder.mutation({
      query: () => ({
        url: '/refresh-token',
        method: 'POST',
      }),
    }),
    logout: builder.mutation({
      query: () => ({
        url: '/logout',
        method: 'POST',
      }),
    }),
    resendOtp: builder.mutation({
      query: ({ email, phoneNumber, verificationMethod }) => ({
        url: '/resend-otp',
        method: 'POST',
        body: { email, phoneNumber, verificationMethod },
      }),
    }),
    forgotPassword: builder.mutation({
      query: ({email, phoneNumber }) => ({
        url: '/forgot-password',
        method: 'POST',
        body: { email, phoneNumber },
      }),
    }),
    resetPassword: builder.mutation({
      query: ({ token, password }) => ({
        url: `/reset-password`,
        method: 'POST',
        body: { password, token },
      }),
    }),
    checkTelegramLink: builder.query({
      query: ({phoneNumber }) => ({
        url: `/check-telegram-link`,
        params: { phoneNumber },
      }),
    }),
  }),
});

export const {
  useLoginMutation,
  useLoginWithTelegramMutation,
  useGetTelegramLoginConfigQuery,
  useSignupMutation,
  useRefreshMutation,
  useLogoutMutation,
  useVerifyOtpMutation,
  useResendOtpMutation,
  useResetPasswordMutation,
  useForgotPasswordMutation,
    useLazyCheckTelegramLinkQuery,
} = userAuthApi;
