import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const staffAuthApi = createApi({
  reducerPath: 'staffAuthApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${__API_URL__}/api/staff`,
    credentials: 'include',
  }),
  endpoints: (builder) => ({
    loginStaff: builder.mutation({
      query: (credentials) => ({
        url: '/login',
        method: 'POST',
        body: credentials,
      }),
    }),
    createStaff: builder.mutation({
      query: (userData) => ({
        url: '/',
        method: 'POST',
        body: userData,
      }),
    }),
    verifyStaffOtp: builder.mutation({
      query: ({ email, otp, phoneNumber, verificationMethod }) => ({
        url: '/verify-otp',
        method: 'POST',
        body: { email, otp, phoneNumber, verificationMethod },
      }),
    }),
    refreshStaff: builder.mutation({
      query: () => ({
        url: '/refresh-token',
        method: 'POST',
      }),
    }),
    logoutStaff: builder.mutation({
      query: () => ({
        url: '/logout',
        method: 'POST',
      }),
    }),
    resendStaffOtp: builder.mutation({
      query: ({ email, phoneNumber, verificationMethod }) => ({
        url: '/resend-otp',
        method: 'POST',
        body: { email, phoneNumber, verificationMethod },
      }),
    }),
    forgotPasswordStaff: builder.mutation({
      query: ({ email, phoneNumber }) => ({
        url: '/forgot-password',
        method: 'POST',
        body: { email, phoneNumber },
      }),
    }),
    resetPasswordStaff: builder.mutation({
      query: ({ token, password }) => ({
        url: `/reset-password`,
        method: 'POST',
        body: { password, token },
      }),
    }),
    checkStaffTelegramLink: builder.query({
      query: ({ phoneNumber }) => ({
        url: `/check-telegram-link`,
        params: { phoneNumber },
      }),
    }),

        inviteStaff: builder.mutation({
      query: (inviteData) => ({
        url: '/invite',
        method: 'POST',
        body: inviteData,
      }),
    }),
    acceptStaffInvitation: builder.mutation({
      query: ({ token, password }) => ({
        url: '/accept-invitation',
        method: 'POST',
        body: { token, password },
      }),
    }),

  }),
});

export const {
  useInviteStaffMutation,
  useAcceptStaffInvitationMutation,
  useLoginStaffMutation,
  useCreateStaffMutation,
  useRefreshStaffMutation,
  useLogoutStaffMutation,
  useVerifyStaffOtpMutation,
  useResendStaffOtpMutation,
  useResetPasswordStaffMutation,
  useForgotPasswordStaffMutation,
  useLazyCheckStaffTelegramLinkQuery,
} = staffAuthApi;
