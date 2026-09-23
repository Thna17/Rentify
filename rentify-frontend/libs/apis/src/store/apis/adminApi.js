import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const adminApi = createApi({
  reducerPath: 'adminApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${__API_URL__}/admin`,
    credentials: 'include',
  }),
  tagTypes: ['Templates'],

  endpoints: (builder) => ({
    getAllTemplatesAdmin: builder.query({
      query: () => 'templates',
      providesTags: ['Templates'],
    }),
    getTemplateAdmin: builder.query({
      query: (id) => `template/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Templates', id }],
    }),
    createTemplateAdmin: builder.mutation({
      query: (template) => ({
        url: 'template',
        method: 'POST',
        body: template,
      }),
      invalidatesTags: ['Templates'],
    }),
    updateTemplateAdmin: builder.mutation({
      query: ({ id, ...template }) => ({
        url: `template/${id}`,
        method: 'PUT',
        body: template,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Templates', id },
        'Templates',
      ],
    }),
    deleteTemplateAdmin: builder.mutation({
      query: (id) => ({
        url: `template/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Templates'],
    }),
  }),
});

export const {
  useGetAllTemplatesAdminQuery,
  useCreateTemplateAdminMutation,
  useUpdateTemplateAdminMutation,
  useDeleteTemplateAdminMutation,
  useGetTemplateAdminQuery,
} = adminApi;
