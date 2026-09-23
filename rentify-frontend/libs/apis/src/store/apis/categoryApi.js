// src/features/api/categoryApi.js
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { ECOMMERCE_API_ROOT } from '../apiBase';

export const categoryApi = createApi({
  reducerPath: 'categoryApi',
  baseQuery: fetchBaseQuery({ baseUrl: `${ECOMMERCE_API_ROOT}/api/categories` }),
  tagTypes: ['Category'],
  endpoints: (builder) => ({
    // GET categories by websiteId
    getCategories: builder.query({
      query: (websiteId) => `/${websiteId}`,
      providesTags: (result = [], error, websiteId) =>
        result
          ? [...result.map(({ id }) => ({ type: 'Category', id })), { type: 'Category', id: 'LIST' }]
          : [{ type: 'Category', id: 'LIST' }],
    }),

    // CREATE a category
    createCategory: builder.mutation({
      query: ({ websiteId, ...body }) => ({
        url: `/${websiteId}`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Category', id: 'LIST' }],
    }),

    // UPDATE a category
    updateCategory: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Category', id }],
    }),

    // DELETE (soft delete) a category
    deleteCategory: builder.mutation({
      query: (id) => ({
        url: `/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Category', id },
        { type: 'Category', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useGetCategoriesQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
} = categoryApi;
