// rentifyPaymentApi.js
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const rentifyPaymentApi = createApi({
  reducerPath: 'rentifyPaymentApi',
  baseQuery: fetchBaseQuery({ 
    baseUrl: `${__API_URL__}/api`,
    credentials: 'include',
  }),
  tagTypes: ['Payment'],
  endpoints: (builder) => ({
    initiateKHQRPayment: builder.mutation({
      query: (body) => ({
        url: '/payment/khqr',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Payment'],
    }),
    checkPaymentStatus: builder.query({
      query: (paymentId) => `/payment/status/${paymentId}`,
      providesTags: (result, error, paymentId) => [
        { type: 'Payment', id: paymentId }
      ],
    }),
  }),
});

export const {
  useInitiateKHQRPaymentMutation,
  useCheckPaymentStatusQuery,
} = rentifyPaymentApi;