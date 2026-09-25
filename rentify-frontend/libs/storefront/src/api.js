import { combineSlices, configureStore, createDynamicMiddleware } from '@reduxjs/toolkit';
import { persistReducer, persistStore } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';
import authReducer from '@rentify/apis/slice/authSlice';
import cartReducer from '@rentify/apis/slice/cartSlice';
import { cartApi } from '@rentify/apis/apis/cartApi';
import { categoryApi } from '@rentify/apis/apis/categoryApi';
import { customerApi } from '@rentify/apis/apis/customerApi';
import { productApi } from '@rentify/apis/apis/productApi';
import { websiteApi } from '@rentify/apis/apis/websiteApi';
import orderApi from '@rentify/checkout/services/orderApi';
import { storefrontPaymentApi } from './paymentStatusApi';
import { hostedCartApi } from './hostedCartApi';

// Customer-facing store. Merchant, staff and platform-user session APIs are not
// registered here; `./ownerSessionApi` injects them on demand for templates
// that support a store-owner mode, so customer-only templates never load them.
const persistedAuth = persistReducer({ key: 'auth', storage, whitelist: ['role', 'profile'] }, authReducer);
const customerApis = [cartApi, categoryApi, customerApi, productApi, websiteApi, orderApi, storefrontPaymentApi, hostedCartApi];

const rootReducer = combineSlices({ auth: persistedAuth, cart: cartReducer }, ...customerApis);
const dynamicMiddleware = createDynamicMiddleware();

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) => getDefaultMiddleware({
    serializableCheck: { ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER] },
  }).concat(customerApis.map((api) => api.middleware), dynamicMiddleware.middleware),
});
export const persistor = persistStore(store);

/** Registers additional RTK Query APIs (reducer and middleware) with the storefront store. */
export const injectStorefrontApis = (apis) => {
  apis.forEach((api) => {
    rootReducer.inject(api);
    dynamicMiddleware.addMiddleware(api.middleware);
  });
  store.dispatch({ type: 'storefront/apisInjected' });
};

export { useDispatch as useAppDispatch, useSelector as useAppSelector } from 'react-redux';
export * from '@rentify/apis/apis/cartApi';
export * from '@rentify/apis/apis/categoryApi';
export * from '@rentify/apis/apis/customerApi';
export * from '@rentify/apis/apis/productApi';
export * from '@rentify/apis/apis/websiteApi';
export * from '@rentify/checkout/services/orderApi';
export * from './paymentStatusApi';
export * from './hostedCartApi';
export { setCredentials, clearCredentials } from '@rentify/apis/slice/authSlice';
export { cartSelectors } from '@rentify/apis/slice/cartSlice';
