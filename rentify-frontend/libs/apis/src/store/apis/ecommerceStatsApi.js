import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { ECOMMERCE_STATS_BASE } from '../apiBase';

export const ecommerceStatsApi = createApi({
  reducerPath: 'ecommerceStatsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: ECOMMERCE_STATS_BASE,
    credentials: 'include',
  }),
  endpoints: (builder) => ({
    getWebsiteStats: builder.query({
      query: ({ websiteId, period, orderType }) => ({
        url: `/stats/websites/${websiteId}`,
        params: { period, orderType },
      }),
      transformErrorResponse: (response) => {
        if (response.status === 403) {
          return {
            status: response.status,
            data: { error: "You don't own this website" },
          };
        }
        return response;
      },
    }),
  }),
});

export const { useGetWebsiteStatsQuery,  } = ecommerceStatsApi;

export default ecommerceStatsApi;
