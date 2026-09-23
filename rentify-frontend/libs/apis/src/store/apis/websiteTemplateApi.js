import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const websiteTemplatesApi = createApi({
  reducerPath: 'websiteTemplatesApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${__API_URL__}/templates/`,
    credentials: 'include',
  }),
  endpoints: (builder) => ({
    getTemplates: builder.query({
      query: () => '/',
    }),
    getTemplate: builder.query({
      query: (templateId) => `/${templateId}`,
    }),
    getTemplatesByCategory: builder.query({
      query: (category) => `category/${category}`,
    }),
  }),
});

export const {
  useGetTemplatesQuery,
  useGetTemplateQuery,
  useGetTemplatesByCategoryQuery,
} = websiteTemplatesApi;

export default websiteTemplatesApi;