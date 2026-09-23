import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const userDashboardApi = createApi({
  reducerPath: 'userDashboardApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${__API_URL__}/dashboard`,
    credentials: 'include',
  }),

  endpoints: (builder) => ({
    getDashboardData: builder.query({
      query: () => '/user',
    }),
    getCurrentWebsite: builder.query({
      query: () => '/website/current',
      providesTags: ['Website'],
    }),
    getUserSubscription: builder.query({
      query: () => '/subscription/current',
      providesTags: ['Subscription'],
    }),
  }),
});

export const {
  useGetDashboardDataQuery,
  useGetCurrentWebsiteQuery,
  useGetUserSubscriptionQuery,
} = userDashboardApi;

export default userDashboardApi;
