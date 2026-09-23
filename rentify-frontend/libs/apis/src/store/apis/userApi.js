import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const userApi = createApi({
  reducerPath: 'userApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${__API_URL__}/api/user`,
    credentials: 'include',
  }),
  endpoints: (builder) => ({
    getUser: builder.query({
      query: () => '/',
    }),
    updateProfile: builder.mutation({
      query: (profileData) => ({
        url: '/',
        method: 'PATCH',
        body: profileData,
      }),
    }),
    changePassword: builder.mutation({
      query: (passwordData) => ({
        url: '/change-password',
        method: 'POST',
        body: passwordData,
      }),
    })
  }),
});

export const {
  useGetUserQuery,
  useUpdateProfileMutation,
  useChangePasswordMutation,
} = userApi;
