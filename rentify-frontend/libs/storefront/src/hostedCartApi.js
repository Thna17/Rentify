import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';
import { hostedCheckoutUrl, hostedRequest } from './hostedBuyer';

const asError = (error) => ({ status: 'CUSTOM_ERROR', data: { error: error?.message || 'Request failed' } });

/**
 * Hosted-storefront buyer cart and COD checkout (`/api/storefront/:websiteId`),
 * used when hosted buyer mode is enabled for the current domain.
 */
export const hostedCartApi = createApi({
  reducerPath: 'hostedStorefrontCartApi',
  baseQuery: fakeBaseQuery(),
  tagTypes: ['HostedCart'],
  endpoints: (builder) => ({
    // Reading the cart never forces sign-in: a signed-out visitor simply has an empty cart.
    getHostedCart: builder.query({
      queryFn: async (websiteId) => {
        try {
          const response = await fetch(hostedCheckoutUrl(websiteId, '/cart'), { credentials: 'include' });
          if (response.status === 401 || response.status === 403) return { data: { signedIn: false, quote: null } };
          const body = await response.json().catch(() => ({}));
          if (!response.ok) return { error: asError(new Error(body.error || `Request failed (${response.status})`)) };
          return { data: { signedIn: true, quote: body.carts?.[0] || null } };
        } catch (error) {
          return { error: asError(error) };
        }
      },
      providesTags: ['HostedCart'],
    }),
    // Changing the cart sends signed-out visitors to Rentify sign-in (see hostedRequest).
    setHostedCartItem: builder.mutation({
      queryFn: async ({ websiteId, productId, quantity }) => {
        try {
          const data = await hostedRequest(hostedCheckoutUrl(websiteId, `/cart/items/${encodeURIComponent(productId)}`), {
            method: 'PUT',
            body: JSON.stringify({ quantity }),
          });
          return { data };
        } catch (error) {
          return { error: asError(error) };
        }
      },
      invalidatesTags: ['HostedCart'],
    }),
    hostedCheckout: builder.mutation({
      queryFn: async ({ websiteId, idempotencyKey, ...body }) => {
        try {
          const data = await hostedRequest(hostedCheckoutUrl(websiteId, '/checkout'), {
            method: 'POST',
            headers: { 'Idempotency-Key': idempotencyKey },
            body: JSON.stringify(body),
          });
          return { data };
        } catch (error) {
          return { error: asError(error) };
        }
      },
      invalidatesTags: ['HostedCart'],
    }),
  }),
});

export const { useGetHostedCartQuery, useSetHostedCartItemMutation, useHostedCheckoutMutation } = hostedCartApi;
