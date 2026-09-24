import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { ECOMMERCE_API_ROOT } from '../apiBase';

export const productApi = createApi({
  reducerPath: 'productApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${ECOMMERCE_API_ROOT}/api/product`,
    credentials: 'include',
  }),
  tagTypes: ['Product'],
  endpoints: (builder) => ({
    /** ---------------------- PUBLIC ROUTES ---------------------- **/

    // Get all products (supports advanced filtering via query)
    getAllProducts: builder.query({
      query: ({ websiteId, storeId, ...query }) => ({
        url: storeId ? `/stores/${storeId}` : `/${websiteId}`,
        params: query,
      }),
      providesTags: ['Product'],
    }),

    getManagedProducts: builder.query({
      query: ({ websiteId, ...query }) => ({
        url: `/${websiteId}/manage/products`,
        params: query,
      }),
      providesTags: ['Product'],
    }),

    getManagedProduct: builder.query({
      query: ({ websiteId, productId }) => `/${websiteId}/manage/products/${productId}`,
      providesTags: (result, error, arg) => [{ type: 'Product', id: arg.productId }],
    }),

    getProduct: builder.query({
      query: ({ websiteId, productId }) => `/${websiteId}/${productId}`,
      providesTags: (result, error, arg) => [
        { type: 'Product', id: arg.productId },
      ],
    }),

    // Advanced filter (same controller as getAllProducts)
    getAdvancedFilterProducts: builder.query({
      query: ({ websiteId, ...query }) => ({
        url: `/${websiteId}/filter/advanced`,
        params: query,
      }),
      providesTags: ['Product'],
    }),

    // Search products
    searchProducts: builder.query({
      query: ({ websiteId, q, field, limit }) => ({
        url: `/${websiteId}/search`,
        params: { q, field, limit },
      }),
    }),

    // Get recommended options
    getRecommendedOptions: builder.query({
      query: ({ websiteId, productType }) => ({
        url: `/${websiteId}/recommended-options`,
        params: { productType },
      }),
    }),

    // Get product by slug
    getProductBySlug: builder.query({
      query: ({ websiteId, slug }) => `/${websiteId}/slug/${slug}`,
      providesTags: (result, error, arg) => [{ type: 'Product', id: arg.slug }],
    }),

    // Get product by ID
    getProductById: builder.query({
      query: ({ websiteId, productId }) => `/${websiteId}/${productId}`,
      providesTags: (result, error, arg) => [
        { type: 'Product', id: arg.productId },
      ],
    }),

    // Get products by category
    getProductsByCategory: builder.query({
      query: ({ websiteId, categoryId, ...query }) => ({
        url: `/${websiteId}/category/products`,
        params: { categoryId, ...query },
      }),
      providesTags: ['Product'],
    }),

    // Get product analytics overview
    getProductAnalytics: builder.query({
      query: ({ websiteId }) => `/${websiteId}/analytics/overview`,
    }),

    /** ---------------------- PROTECTED ROUTES ---------------------- **/

    // Create single product
    createProduct: builder.mutation({
      query: ({ websiteId, product }) => ({
        url: `/${websiteId}`,
        method: 'POST',
        body: product,
      }),
      invalidatesTags: ['Product'],
    }),

    // Create bulk products
    createBulkProducts: builder.mutation({
      query: ({ websiteId, products }) => ({
        url: `/${websiteId}/bulk`,
        method: 'POST',
        body: { products },
      }),
      invalidatesTags: ['Product'],
    }),

    // Create bulk products from CSV file
    createBulkProductsFromCSV: builder.mutation({
      query: ({ websiteId, file }) => {
        const formData = new FormData();
        formData.append('file', file);
        return {
          url: `/${websiteId}/bulk/csv`,
          method: 'POST',
          body: formData,
        };
      },
      invalidatesTags: ['Product'],
    }),

    // Update product
    updateProduct: builder.mutation({
      query: ({ websiteId, productId, product }) => ({
        url: `/${websiteId}/${productId}`,
        method: 'PUT',
        body: product,
      }),
      invalidatesTags: (result, error, arg) => [
        { type: 'Product', id: arg.productId },
        'Product',
      ],
    }),

    // Update inventory
    updateInventory: builder.mutation({
      query: ({ websiteId, productId, quantity, note, expectedVersion }) => ({
        url: `/${websiteId}/${productId}/inventory`,
        method: 'PATCH',
        body: { quantity, note, expectedVersion },
      }),
      invalidatesTags: ['Product'],
    }),

    // Bulk update (publish, unpublish, delete, etc.)
    bulkUpdateProducts: builder.mutation({
      query: ({
        websiteId,
        productIds,
        operation,
        expectedVersions,
        ...updateData
      }) => ({
        url: `/${websiteId}/bulk`,
        method: 'PATCH',
        body: {
          productIds,
          operation,
          expectedVersions,
          ...updateData,
        },
      }),
      invalidatesTags: ['Product'],
    }),

    // Delete product
    deleteProduct: builder.mutation({
      query: ({ websiteId, productId, expectedVersion }) => ({
        url: `/${websiteId}/${productId}`,
        method: 'DELETE',
        body: { expectedVersion },
      }),
      invalidatesTags: ['Product'],
    }),
  }),
});

/** ---------------------- AUTO-GENERATED HOOK EXPORTS ---------------------- **/
export const {
  useGetAllProductsQuery,
  useGetManagedProductsQuery,
  useGetManagedProductQuery,
  useGetProductQuery,
  useGetAdvancedFilterProductsQuery,
  useSearchProductsQuery,
  useGetRecommendedOptionsQuery,
  useGetProductBySlugQuery,
  useGetProductByIdQuery,
  useGetProductsByCategoryQuery,
  useGetProductAnalyticsQuery,
  useCreateProductMutation,
  useCreateBulkProductsMutation,
  useCreateBulkProductsFromCSVMutation,
  useUpdateProductMutation,
  useUpdateInventoryMutation,
  useBulkUpdateProductsMutation,
  useDeleteProductMutation,
} = productApi;

export default productApi;
