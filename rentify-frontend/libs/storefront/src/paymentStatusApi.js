import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { ECOMMERCE_API_ROOT } from '@rentify/apis/apiBase';

/**
 * Read-only storefront payment status. Merchant payment actions (confirm,
 * payment links) and payment configuration are deliberately not exposed here.
 * Consumers must only read `status` from these responses.
 */
export const storefrontPaymentApi = createApi({
  reducerPath: 'storefrontPaymentApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${ECOMMERCE_API_ROOT}/api/payment`,
    credentials: 'include',
  }),
  endpoints: (builder) => ({
    // Asks the API to verify a pending KHQR payment and returns its status.
    checkStorefrontPaymentStatus: builder.query({
      query: (paymentId) => `/payments/${encodeURIComponent(paymentId)}/check-status`,
      transformResponse: (response) => ({ status: response?.status || 'pending' }),
    }),
  }),
});

export const { useCheckStorefrontPaymentStatusQuery } = storefrontPaymentApi;
