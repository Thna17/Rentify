import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const staffManagementApi = createApi({
  reducerPath: 'staffManagementApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${__API_URL__}/api/staff`,
    credentials: 'include',
  }),
  endpoints: (builder) => ({
    getStaff: builder.query({
      query: () => '/me',
      providesTags: ['Staff'],
    }),
    getStaffList: builder.query({
      query: () => '',
      providesTags: ['Staff'],
    }),
    updateStaff: builder.mutation({
      query: ({ id, ...staffData }) => ({
        url: `/${id}`,
        method: 'PUT',
        body: staffData,
      }),
      invalidatesTags: ['Staff'],
    }),
    deleteStaff: builder.mutation({
      query: (id) => ({
        url: `/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Staff'],
    }),
  }),
});

export const {
  useGetStaffQuery,
  useGetStaffListQuery,
  useUpdateStaffMutation,
  useDeleteStaffMutation,
} = staffManagementApi;
