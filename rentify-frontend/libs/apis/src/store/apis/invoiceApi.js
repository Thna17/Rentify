import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { ECOMMERCE_API_ROOT } from '../apiBase';

export const invoiceApi = createApi({
  reducerPath: 'invoiceApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${ECOMMERCE_API_ROOT}/api/invoice`,
    credentials: 'include',
  }),
  tagTypes: ['Invoice'],
  endpoints: (builder) => ({
    // Get website-scoped invoices
    getInvoices: builder.query({
      query: ({ websiteId, page = 1, limit = 10, search = '', status, sortBy, sortOrder }) => ({
        url: `/websites/${websiteId}/invoices`,
        params: { page, limit, search, status, sortBy, sortOrder },
      }),
      providesTags: ['Invoice'],
    }),

    // Get store-scoped invoices (for marketplace-only merchants)
    getStoreInvoices: builder.query({
      query: ({ storeId, page = 1, limit = 10, search = '', status, sortBy, sortOrder }) => ({
        url: `/stores/${storeId}/invoices`,
        params: { page, limit, search, status, sortBy, sortOrder },
      }),
      providesTags: ['Invoice'],
    }),

    // Get single invoice snapshot by ID
    getInvoiceById: builder.query({
      query: (invoiceId) => `/invoices/${invoiceId}`,
      providesTags: (result, error, id) => [{ type: 'Invoice', id }],
    }),

    // Get Invoice PDF
    getInvoicePdf: builder.query({
      query: (invoiceId) => `/invoices/${invoiceId}/pdf`,
    }),

    // Public lookup for customer confirmation
    getPublicInvoice: builder.query({
      query: (invoiceNumber) => `/invoices/public/${invoiceNumber}`,
    }),

    // Create invoice under website
    createInvoice: builder.mutation({
      query: ({ websiteId, body }) => ({
        url: `/websites/${websiteId}/invoices`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Invoice'],
    }),

    // Create invoice under store
    createStoreInvoice: builder.mutation({
      query: ({ storeId, body }) => ({
        url: `/stores/${storeId}/invoices`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Invoice'],
    }),

    // Create non-binding quote under store
    createStoreQuote: builder.mutation({
      query: ({ storeId, body }) => ({
        url: `/stores/${storeId}/quotes`,
        method: 'POST',
        body,
      }),
    }),

    // Convert quote to binding commercial invoice
    convertQuoteToInvoice: builder.mutation({
      query: ({ storeId, body }) => ({
        url: `/stores/${storeId}/quotes/convert`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Invoice'],
    }),

    // Record payment against an invoice (strict non-double-deduction)
    recordInvoicePayment: builder.mutation({
      query: ({ invoiceId, body }) => ({
        url: `/invoices/${invoiceId}/pay`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Invoice'],
    }),

    // Cancel unpaid invoice
    cancelInvoice: builder.mutation({
      query: ({ invoiceId, reason }) => ({
        url: `/invoices/${invoiceId}/cancel`,
        method: 'POST',
        body: { reason },
      }),
      invalidatesTags: ['Invoice'],
    }),

    // Refund paid invoice (restores canonical inventory)
    refundInvoice: builder.mutation({
      query: ({ invoiceId, reason, amount }) => ({
        url: `/invoices/${invoiceId}/refund`,
        method: 'POST',
        body: { reason, amount },
      }),
      invalidatesTags: ['Invoice'],
    }),
  }),
});

export const {
  useGetInvoicesQuery,
  useGetStoreInvoicesQuery,
  useGetInvoiceByIdQuery,
  useGetInvoicePdfQuery,
  useGetPublicInvoiceQuery,
  useCreateInvoiceMutation,
  useCreateStoreInvoiceMutation,
  useCreateStoreQuoteMutation,
  useConvertQuoteToInvoiceMutation,
  useRecordInvoicePaymentMutation,
  useCancelInvoiceMutation,
  useRefundInvoiceMutation,
} = invoiceApi;

export default invoiceApi;
