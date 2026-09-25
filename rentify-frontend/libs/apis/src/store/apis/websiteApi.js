import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const websiteApi = createApi({
  reducerPath: 'websiteApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${__API_URL__}/api/websites`,
    credentials: 'include',
  }),
  tagTypes: ['Website'], // Add tag types
  endpoints: (builder) => ({
    getWebsiteByDomain: builder.query({
      query: (domain) => `/getWebsiteByDomain?domain=${domain}`,
      providesTags: ['Website'],
    }),
    getWebsite: builder.query({
      query: () => `/merchant`,
      providesTags: ['Website'],
    }),

    updateThemeConfiguration: builder.mutation({
      query: ({ websiteId, theme }) => ({
        url: `/theme/${websiteId}`,
        method: 'PUT',
        body: { theme },
      }),
      invalidatesTags: ['Website'],
    }),
        updateWebsiteContent: builder.mutation({
      query: ({ contentId, body }) => ({
        url: `/content/${contentId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Website'],
    }),
    createWebsite: builder.mutation({
      query: (website) => ({
        url: '/',
        method: 'POST',
        body: website,
      }),
      invalidatesTags: ['Website'], // Invalidate on create
    }),
    updateWebsite: builder.mutation({
      query: ({ templateId, userId, data }) => ({
        url: `/${templateId}/${userId}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (result, error, { userId }) => [
        { type: 'Website', id: userId },
      ],
    }),
    uploadImage: builder.mutation({
      query: ({ websiteId, file, isLogo }) => {
        const formData = new FormData();
        formData.append('image', file);
        return {
          url: `/uploadImage/${websiteId}${isLogo ? '?isLogo=true' : ''}`,
          method: 'POST',
          body: formData,
        };
      },
    }),
  }),
});
export const {
  useGetWebsiteByDomainQuery,
  useGetWebsiteQuery,
  useUpdateThemeConfigurationMutation,
  useUpdateWebsiteContentMutation,
  useCreateWebsiteMutation,
  useUpdateWebsiteMutation,
  useUploadImageMutation,
} = websiteApi;

export default websiteApi;
