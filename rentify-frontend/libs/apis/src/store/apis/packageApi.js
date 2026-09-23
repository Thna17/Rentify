// src/apis/packageApi.js
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { RENTIFY_API_BASE } from '../apiBase';

export const packageApi = createApi({
  reducerPath: 'packageApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${RENTIFY_API_BASE}/api/packages`,
    credentials: 'include',
  }),
  tagTypes: ['Package'], // Enables cache invalidation
  endpoints: (builder) => ({
    // GET all packages
    getPackages: builder.query({
      query: () => '/',
      providesTags: ['Package'],
    }),

    // GET a single package by ID
    getPackageById: builder.query({
      query: (id) => `/${id}`,
      providesTags: (result, error, id) => [{ type: 'Package', id }],
    }),

    // CREATE a new package
    createPackage: builder.mutation({
      query: (newPackage) => ({
        url: '/',
        method: 'POST',
        body: newPackage,
      }),
      invalidatesTags: ['Package'],
    }),

    // UPDATE a package
    updatePackage: builder.mutation({
      query: ({ id, ...updatedData }) => ({
        url: `/${id}`,
        method: 'PUT',
        body: updatedData,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Package', id },
        'Package',
      ],
    }),

    // DELETE a package
    deletePackage: builder.mutation({
      query: (id) => ({
        url: `/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Package'],
    }),
  }),
});

export const {
  useGetPackagesQuery,
  useGetPackageByIdQuery,
  useCreatePackageMutation,
  useUpdatePackageMutation,
  useDeletePackageMutation,
} = packageApi;
