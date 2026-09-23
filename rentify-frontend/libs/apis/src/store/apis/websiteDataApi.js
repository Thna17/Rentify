// apis/websiteDataApi.ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { RENTIFY_API_BASE } from '../apiBase';

export const websiteDataApi = createApi({
  reducerPath: 'websiteDataApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${RENTIFY_API_BASE}/api/websites`,
    credentials: 'include',
  }),
  tagTypes: ['Website'],
  endpoints: (builder) => ({
    getWebsiteByDomain: builder.query({
      query: (domain) => `/getWebsiteByDomain?domain=${domain}`,
      providesTags: ['Website'],
    }),
    updateWebsiteContent: builder.mutation({
      query: ({ contentId, body }) => ({
        url: `/content/${contentId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Website'],
    }),

    getWebsite: builder.query({
      query: () => `/merchant`,
      providesTags: ['Website'],
    }),

    // Add this new endpoint for theme updates
    updateThemeConfiguration: builder.mutation({
      query: ({ websiteId, theme }) => ({
        url: `/theme/${websiteId}`,
        method: 'PUT',
        body: { theme },
      }),
      invalidatesTags: ['Website'],
    }),
  }),
});

export const {
    useGetWebsiteByDomainQuery,
  useUpdateWebsiteContentMutation,
  useGetWebsiteQuery,
  useUpdateThemeConfigurationMutation,
} = websiteDataApi;
