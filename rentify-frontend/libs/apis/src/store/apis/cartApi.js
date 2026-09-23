import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { ECOMMERCE_API_ROOT } from '../apiBase';
import {
  cartItemsLoaded,
  cartItemUpdated,
  cartItemRemoved,
  cartUpdated,
} from '../slice/cartSlice';

export const cartApi = createApi({
  reducerPath: 'cartApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${ECOMMERCE_API_ROOT}/api/cart`,
    credentials: 'include',
  }),
  tagTypes: ['Cart', 'CartItem'],
  endpoints: (builder) => ({

    /** ---------------------- GET CART DATA ---------------------- **/

    // Fetch entire cart (main endpoint)
    getCart: builder.query({
      query: (websiteId) => `/${websiteId}`,
      providesTags: ['Cart'],
      keepUnusedDataFor: 300,
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(
            cartUpdated({
              items: data.CartItems || data.items || [],
              version: data.version,
              totals: data.totals,
              niche: data.niche,
            })
          );
        } catch (error) {
          console.error('❌ Failed to load cart:', error);
        }
      },
    }),

    // Get summarized cart data (totals, itemCount, etc.)
    getCartSummary: builder.query({
      query: (websiteId) => `/${websiteId}/summary`,
      providesTags: ['Cart'],
    }),

    // Validate cart stock (before checkout)
    validateCartStock: builder.query({
      query: (websiteId) => `/${websiteId}/validate-stock`,
      providesTags: ['Cart'],
    }),

    // Get cart analytics (for insights / dashboard)
    getCartAnalytics: builder.query({
      query: (websiteId) => `/${websiteId}/analytics`,
      providesTags: ['Cart'],
    }),


    /** ---------------------- CART ITEM OPERATIONS ---------------------- **/

    // Add product to cart
    addToCart: builder.mutation({
      query: ({
        websiteId,
        productId,
        variantId,
        quantity,
        selectedOptions = {},
        customizations = {},
      }) => ({
        url: `/${websiteId}/items`,
        method: 'POST',
        body: { productId, variantId, quantity, selectedOptions, customizations },
      }),
      invalidatesTags: ['Cart'],
    }),

    // Update cart item quantity or customization
    updateCartItem: builder.mutation({
      query: ({ websiteId, itemId, quantity, customizations = {} }) => ({
        url: `/${websiteId}/items/${itemId}`,
        method: 'PUT',
        body: { quantity, customizations },
      }),
      invalidatesTags: ['Cart'],
      async onQueryStarted(
        { itemId, quantity },
        { dispatch, getState, queryFulfilled }
      ) {
        const state = getState();
        const item = state.cart.entities[itemId];
        if (item) {
          dispatch(cartItemUpdated({ id: itemId, changes: { quantity } }));
        }

        try {
          await queryFulfilled;
        } catch (error) {
          const originalItem = state.cart.entities[itemId];
          if (originalItem) {
            dispatch(
              cartItemUpdated({
                id: itemId,
                changes: { quantity: originalItem.quantity },
              })
            );
          }
          console.error('❌ Failed to update cart item:', error);
        }
      },
    }),

    // Update item variant
    updateCartItemVariant: builder.mutation({
      query: ({ websiteId, itemId, variantId, selectedOptions = {} }) => ({
        url: `/${websiteId}/items/${itemId}/variant`,
        method: 'PUT',
        body: { variantId, selectedOptions },
      }),
      invalidatesTags: ['Cart'],
    }),

    // Remove single item from cart
    removeFromCart: builder.mutation({
      query: ({ websiteId, itemId }) => ({
        url: `/${websiteId}/items/${itemId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Cart'],
      async onQueryStarted({ itemId }, { dispatch, queryFulfilled }) {
        dispatch(cartItemRemoved(itemId));
        try {
          await queryFulfilled;
        } catch (error) {
          console.warn('❌ Remove failed — refetching cart');
          dispatch(cartApi.util.invalidateTags(['Cart']));
        }
      },
    }),


    /** ---------------------- CART MAINTENANCE ---------------------- **/

    // Clear entire cart
    clearCart: builder.mutation({
      query: (websiteId) => ({
        url: `/${websiteId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Cart'],
    }),

    // Merge guest cart → user cart
    mergeCarts: builder.mutation({
      query: () => ({
        url: `/merge`,
        method: 'POST',
      }),
      invalidatesTags: ['Cart'],
    }),
  }),
});

/** ---------------------- AUTO-GENERATED HOOK EXPORTS ---------------------- **/
export const {
  useGetCartQuery,
  useGetCartSummaryQuery,
  useValidateCartStockQuery,
  useGetCartAnalyticsQuery,
  useAddToCartMutation,
  useUpdateCartItemMutation,
  useUpdateCartItemVariantMutation,
  useRemoveFromCartMutation,
  useClearCartMutation,
  useMergeCartsMutation,
} = cartApi;

export default cartApi;
