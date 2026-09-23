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
    // Get invoices
    getInvoices: builder.query({
      query: ({ websiteId, page = 1, limit = 10, search = '', status, sortBy, sortOrder }) => ({
        url: `/websites/${websiteId}/invoices`,
        params: { page, limit, search, status, sortBy, sortOrder },
      }),
      providesTags: ['Invoice'],
    }),

    // Get Invoice PDF
    getInvoicePdf: builder.query({
      query: (invoiceId) => `/invoices/${invoiceId}/pdf`,
    }),

    // ✅ Add this
    createInvoice: builder.mutation({
      query: ({ websiteId, body }) => ({
        url: `/websites/${websiteId}/invoices`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Invoice'],
    }),
  }),
});

export const {
  useGetInvoicesQuery,
  useGetInvoicePdfQuery,
  useCreateInvoiceMutation, // ✅ Now it exists
} = invoiceApi;

export default invoiceApi;
