import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { ECOMMERCE_API_ROOT } from '../apiBase';

export const paymentConfiApi = createApi({
  reducerPath: 'paymentConfiApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${ECOMMERCE_API_ROOT}/api/payment-config`,
    credentials: 'include',
  }),
  endpoints: (builder) => ({
    getMerchantConfig: builder.query({
      query: (websiteId) => `/${websiteId}`,
    }),
    updateMerchantConfig: builder.mutation({
      query: ({ websiteId, ...config }) => ({
        url: `/${websiteId}`,
        method: 'PUT',
        body: {
          paymentGateways: {
            khqr: {
              enabled: true,
              ...config,
            },
          },
        },
      }),
    }),
  }),
});

export const {
  useGetMerchantConfigQuery,
  useUpdateMerchantConfigMutation,
} = paymentConfiApi;
