import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { ECOMMERCE_API_ROOT } from '../apiBase';

export const paymentApi = createApi({
  reducerPath: 'paymentApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${ECOMMERCE_API_ROOT}/api/payment`,
    credentials: 'include',
  }),
  endpoints: (builder) => ({
    confirmPayment: builder.mutation({
      query: (orderId) => ({
        url: `/orders/${orderId}/confirm-payment`,
        method: 'POST',
      }),
      invalidatesTags: ['Order', 'Payment'],
      transformResponse: (response) => ({
        ...response,
        confirmedAt: new Date().toISOString(),
      }),
    }),
    getPaymentStatus: builder.query({
      query: (paymentId) => `/payments/${paymentId}`,
      providesTags: ['Payment'],
    }),
    checkPaymentStatus: builder.query({
      query: (paymentId) => `/payments/${paymentId}/check-status`,
    }),
  }),
});

export const {
  useGetPaymentStatusQuery,
  useConfirmPaymentMutation,
  useLazyCheckPaymentStatusQuery,
} = paymentApi;
