import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const deploymentApi = createApi({
  reducerPath: 'deploymentApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${__API_URL__}/api/deployments`,
    credentials: 'include',
  }),
  endpoints: (builder) => ({
    deployProject: builder.mutation({
      query: (websiteId) => ({
        url: `${websiteId}/publish`, // Updated endpoint
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
      query: ({ deploymentId }) => `${deploymentId}/status`,
    }),
  }),
});

export const {
  useDeployProjectMutation,
  useCheckDeploymentStatusQuery,
  useUpdateWebsiteStatusMutation,
} = deploymentApi;

export default deploymentApi;
