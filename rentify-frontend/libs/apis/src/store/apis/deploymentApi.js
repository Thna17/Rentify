import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const deploymentApi = createApi({
  reducerPath: 'deploymentApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${__API_URL__}/api/deployments`,
    credentials: 'include',
  }),
  endpoints: (builder) => ({
    // Publishes on the website's Rentify subdomain; answers { deploymentUrl, subdomain, status: 'READY' }.
    deployProject: builder.mutation({
      query: (websiteId) => ({
        url: `${encodeURIComponent(websiteId)}/publish`,
        method: 'POST',
      }),
    }),
    updateWebsiteStatus: builder.mutation({
      query: (payload) => ({
        url: '/status',
        method: 'PUT',
        body: payload,
      }),
    }),

    checkDeploymentStatus: builder.query({
      query: ({ websiteId }) => `${encodeURIComponent(websiteId)}/status`,
    }),
  }),
});

export const {
  useDeployProjectMutation,
  useCheckDeploymentStatusQuery,
  useUpdateWebsiteStatusMutation,
} = deploymentApi;

export default deploymentApi;
