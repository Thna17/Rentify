import { configureStore } from '@reduxjs/toolkit';
import { persistReducer, persistStore } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import {
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import { useDispatch, useSelector } from 'react-redux';
import cartReducer from './slice/cartSlice';
import authReducer from './slice/authSlice';
export { setCredentials, clearCredentials } from './slice/authSlice';
import { productApi } from './apis/productApi';
import { cartApi } from './apis/cartApi';
import orderApi from '@rentify/checkout/services/orderApi';
import userDashboardApi from './apis/dashboardApi';
import { websiteTemplatesApi } from './apis/websiteTemplateApi';
import { websiteApi } from './apis/websiteApi';
import { ecommerceStatsApi } from './apis/ecommerceStatsApi';
import { deploymentApi } from './apis/deploymentApi';
import { websiteDataApi } from './apis/websiteDataApi';
import { invoiceApi } from './apis/invoiceApi';
import { userApi } from './apis/userApi';
import { userAuthApi } from './apis/userAuthApi';
import { adminApi } from './apis/adminApi';
import { customerApi } from './apis/customerApi';
import { paymentConfiApi } from './apis/paymentConfigApi';
import { paymentApi } from './apis/paymentApi';
import { merchantApi } from './apis/merchantApi';
import { staffAuthApi } from './apis/staffAuthApi';
import { staffManagementApi } from './apis/staffManagementApi';
import { categoryApi } from './apis/categoryApi';
import { rentifyPaymentApi } from './apis/rentifyPaymentApi';
import { packageApi } from './apis/packageApi';

const persistConfig = {
  key: 'auth',
  storage,
  whitelist: ['role', 'profile'],
};

const persistedReducer = persistReducer(persistConfig, authReducer);

const store = configureStore({
  reducer: {
    auth: persistedReducer,
    cart: cartReducer,
    [deploymentApi.reducerPath]: deploymentApi.reducer,
    [adminApi.reducerPath]: adminApi.reducer,
    [userApi.reducerPath]: userApi.reducer,
    [userAuthApi.reducerPath]: userAuthApi.reducer,
    [productApi.reducerPath]: productApi.reducer,
    [cartApi.reducerPath]: cartApi.reducer,
    [orderApi.reducerPath]: orderApi.reducer,
    [userDashboardApi.reducerPath]: userDashboardApi.reducer,
    [websiteTemplatesApi.reducerPath]: websiteTemplatesApi.reducer,
    [websiteApi.reducerPath]: websiteApi.reducer,
    [ecommerceStatsApi.reducerPath]: ecommerceStatsApi.reducer,
    [invoiceApi.reducerPath]: invoiceApi.reducer,
    [customerApi.reducerPath]: customerApi.reducer,
    [paymentConfiApi.reducerPath]: paymentConfiApi.reducer,
    [paymentApi.reducerPath]: paymentApi.reducer,
    [merchantApi.reducerPath]: merchantApi.reducer,
    [staffAuthApi.reducerPath]: staffAuthApi.reducer,
    [staffManagementApi.reducerPath]: staffManagementApi.reducer,
    [categoryApi.reducerPath]: categoryApi.reducer,
    [rentifyPaymentApi.reducerPath]: rentifyPaymentApi.reducer,
    [packageApi.reducerPath]: packageApi.reducer,
    [websiteDataApi.reducerPath]: websiteDataApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }).concat(
      userAuthApi.middleware,
      userApi.middleware,
      productApi.middleware,
      cartApi.middleware,
      orderApi.middleware,
      userDashboardApi.middleware,
      websiteTemplatesApi.middleware,
      websiteApi.middleware,
      ecommerceStatsApi.middleware,
      invoiceApi.middleware,
      adminApi.middleware,
      deploymentApi.middleware,
      customerApi.middleware,
      paymentConfiApi.middleware,
      paymentApi.middleware,
      merchantApi.middleware,
      staffAuthApi.middleware,
      staffManagementApi.middleware,
      categoryApi.middleware,
      rentifyPaymentApi.middleware,
      packageApi.middleware,
      websiteDataApi.middleware
    ),
});
export default store;

// export {
//     useGetWebsiteQuery,
//   useGetWebsiteByDomainQuery,
// } from './apis/websiteDataApi';

export {
  useGetWebsiteQuery,
  useGetWebsiteByDomainQuery,
  useUpdateThemeConfigurationMutation,
  useUpdateWebsiteContentMutation,
  useCreateWebsiteMutation,
  useUpdateWebsiteMutation,
  useUploadImageMutation,
} from './apis/websiteApi';

export {
  useInitiateKHQRPaymentMutation,
  useCheckPaymentStatusQuery,
} from './apis/rentifyPaymentApi';

export {
  useGetCategoriesQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
} from './apis/categoryApi';
export {
  useGetStaffQuery,
  useGetStaffListQuery,
  useUpdateStaffMutation,
  useDeleteStaffMutation,
} from './apis/staffManagementApi';

export {
  useInviteStaffMutation,
  useAcceptStaffInvitationMutation,
  useLoginStaffMutation,
  useCreateStaffMutation,
  useVerifyStaffOtpMutation,
  useRefreshStaffMutation,
  useLogoutStaffMutation,
  useResendStaffOtpMutation,
  useResetPasswordStaffMutation,
  useForgotPasswordStaffMutation,
  useLazyCheckStaffTelegramLinkQuery,
} from './apis/staffAuthApi';

export {
  useConfirmOrderMutation,
  useCancelOrderMutation,
  useMarkAsCompleteMutation,
  useProcessOrderMutation,
} from './apis/merchantApi';

export {
  useGetPaymentStatusQuery,
  useConfirmPaymentMutation,
  useLazyCheckPaymentStatusQuery,
} from './apis/paymentApi';

export {
  useGetAllTemplatesAdminQuery,
  useCreateTemplateAdminMutation,
  useUpdateTemplateAdminMutation,
  useDeleteTemplateAdminMutation,
  useGetTemplateAdminQuery,
} from './apis/adminApi';

export {
  useLoginCustomerMutation,
  useSignupCustomerMutation,
  useVerifyCustomerOtpMutation,
  useRefreshCustomerMutation,
  useLogoutCustomerMutation,
  useForgotPasswordCustomerMutation,
  useResetPasswordCustomerMutation,
  useResendOtpCustomerMutation,
  useGetCustomerQuery,
  useLazyCheckTelegramLinkCustomerQuery,
  useCancelOrderByCustomerMutation,
} from './apis/customerApi';

export {
  useGetInvoicesQuery,
  useGetInvoicePdfQuery,
  // useCreateInvoiceMutation,
} from './apis/invoiceApi';

export {
  useGetMerchantConfigQuery,
  useUpdateMerchantConfigMutation,
} from './apis/paymentConfigApi';

export { useGetWebsiteStatsQuery } from './apis/ecommerceStatsApi';
export {
  useGetCurrentWebsiteQuery,
  useGetUserSubscriptionQuery,
} from './apis/dashboardApi';
export {
  useGetTemplatesQuery,
  useGetTemplateQuery,
  useGetTemplatesByCategoryQuery,
} from './apis/websiteTemplateApi';

export {
  useLoginMutation,
  useSignupMutation,
  useRefreshMutation,
  useLogoutMutation,
  useVerifyOtpMutation,
  useResendOtpMutation,
  useResetPasswordMutation,
  useForgotPasswordMutation,
  useLazyCheckTelegramLinkQuery,
} from './apis/userAuthApi';
export {
  useGetUserQuery,
  useUpdateProfileMutation,
  useChangePasswordMutation,
} from './apis/userApi';

export {
  useGetAllProductsQuery,
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
} from './apis/productApi';

export {
  useGetCartQuery,
  useGetCartSummaryQuery,
  useValidateCartStockQuery,
  useGetCartAnalyticsQuery,
  useAddToCartMutation,
  useUpdateCartItemMutation,
  useUpdateCartItemVariantMutation,
  useRemoveFromCartMutation,
  useClearCartMutation,
  useMergeCartsMutation,
} from './apis/cartApi';

export {
  useCreateOrderMutation,
  useCreateInvoiceMutation,
  useCreatePOSOrderMutation,
  useGetOrderByIdQuery,
  useGetOrderHistoryQuery,
  useGetMyOrdersQuery,
  useGetMyOrderDetailsQuery,
  useGetMyOrderPaymentQuery,
  useGetPOSOrdersQuery,
} from '@rentify/order/services/orderApi';

export {
  useDeployProjectMutation,
  useCheckDeploymentStatusQuery,
  useUpdateWebsiteStatusMutation,
} from './apis/deploymentApi';

export {
  useGetPackagesQuery,
  useGetPackageByIdQuery,
  useCreatePackageMutation,
  useUpdatePackageMutation,
  useDeletePackageMutation,
} from './apis/packageApi';

const persistor = persistStore(store);

export const useAppDispatch = () => useDispatch();
export const useAppSelector = useSelector;

export { store, persistor };
