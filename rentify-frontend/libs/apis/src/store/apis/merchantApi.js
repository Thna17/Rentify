import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { ECOMMERCE_API_ROOT } from '../apiBase';

export const merchantApi = createApi({
  reducerPath: 'merchantApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${ECOMMERCE_API_ROOT}/api/merchant`,
    credentials: 'include',
  }),
  endpoints: (builder) => ({
    confirmOrder: builder.mutation({
      query: (orderId) => ({
        url: `/orders/${orderId}/confirm`,
        method: 'POST',
      }),
      invalidatesTags: ['Order'],
    }),
    cancelOrder: builder.mutation({
      query: ({ orderId, reason }) => ({
        url: `/orders/${orderId}/cancel`,
        method: 'POST',
        body: { reason },
      }),
      invalidatesTags: ['Order'],
    }),

    markAsComplete: builder.mutation({
      query: (orderId) => ({
        url: `/orders/${orderId}/complete`,
        method: 'POST',
        // body: { trackingNumber, carrier },
      }),
      invalidatesTags: ['Order'],
    }),
    processOrder: builder.mutation({
      query: ({ orderId, action, reason }) => ({
        url: `/orders/${orderId}/process`,
        method: 'POST',
        body: { action, ...(reason && { reason }) },
      }),
    }),
  }),
});

export const {
  useConfirmOrderMutation,
  useCancelOrderMutation,
  useMarkAsCompleteMutation,
  useProcessOrderMutation,
} = merchantApi;
