import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { ECOMMERCE_API_ROOT } from '@rentify/apis/apiBase';

export const orderApi = createApi({
  reducerPath: 'orderApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${ECOMMERCE_API_ROOT}/api/order`,
    credentials: 'include',
  }),
  tagTypes: ['Order'],
  endpoints: (builder) => ({
    // POST /websites/:websiteId/orders
    createOrder: builder.mutation({
      query: ({ websiteId, ...body }) => ({
        url: `/websites/${websiteId}/orders`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Order'],
    }),
      createPOSOrder: builder.mutation({
      query: ({ websiteId, orderData }) => ({
        url: `/websites/${websiteId}/orders/pos`,
        method: 'POST',
        body: orderData,
      }),
      invalidatesTags: ['Product', 'Order'],
    }),
    createInvoice: builder.mutation({
      query: ({ websiteId, ...body }) => ({
        url: `/websites/${websiteId}/orders/invoice`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Invoice'],
    }),
    // Customer/guest receipt. The API verifies the customer identity or the
    // browser session, so an order ID alone never exposes another buyer's data.
    getOrderById: builder.query({
      query: (orderId) => `/websites/my-orders/${orderId}`,
      providesTags: ['Order'],
    }),

    // GET /websites/:websiteId/orders
    getOrderHistory: builder.query({
      query: ({ websiteId, page = 1, limit = 10, status }) => ({
        url: `/websites/${websiteId}/orders`,
        params: { page, limit, status },
      }),
      providesTags: ['Order'],
    }),

    // GET /websites/:websiteId/my-orders
    getMyOrders: builder.query({
      query: ({ websiteId, page = 1, limit = 10, status }) => ({
        url: `/websites/${websiteId}/my-orders`,
        params: { page, limit, status },
      }),
      providesTags: ['Order'],
    }),

    // GET /websites/my-orders/:orderId
    getMyOrderDetails: builder.query({
      query: (orderId) => `/websites/my-orders/${orderId}`,
      providesTags: ['Order'],
    }),

    // GET /websites/my-orders/:orderId/payment
    getMyOrderPayment: builder.query({
      query: (orderId) => `/websites/my-orders/${orderId}/payment`,
      providesTags: ['Order'],
    }),

        getPOSOrders: builder.query({
      query: (websiteId) => `/websites/${websiteId}/orders/pos`,
      providesTags: ['Order'],
    }),
  }),
});

export const {
  useCreateOrderMutation,
  useGetOrderByIdQuery,
  useCreateInvoiceMutation,
  useGetOrderHistoryQuery,
  useGetMyOrdersQuery,
  useGetMyOrderDetailsQuery,
  useGetMyOrderPaymentQuery,
  useCreatePOSOrderMutation,
  useGetPOSOrdersQuery,
} = orderApi;

export default orderApi;
