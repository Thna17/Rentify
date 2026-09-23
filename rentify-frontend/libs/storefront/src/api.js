import { configureStore } from '@reduxjs/toolkit';
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

import { userApi } from '@rentify/apis/apis/userApi';
import { userAuthApi } from '@rentify/apis/apis/userAuthApi';
import { staffAuthApi } from '@rentify/apis/apis/staffAuthApi';
import { staffManagementApi } from '@rentify/apis/apis/staffManagementApi';

const persistedAuth = persistReducer({ key: 'auth', storage, whitelist: ['role', 'profile'] }, authReducer);
const apis = [
  cartApi,
  categoryApi,
  customerApi,
  productApi,
  websiteApi,
  orderApi,
  userApi,
  userAuthApi,
  staffAuthApi,
  staffManagementApi,
];

export const store = configureStore({
  reducer: { auth: persistedAuth, cart: cartReducer, ...Object.fromEntries(apis.map((api) => [api.reducerPath, api.reducer])) },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware({
    serializableCheck: { ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER] },
  }).concat(apis.map((api) => api.middleware)),
});
export const persistor = persistStore(store);
export { useDispatch as useAppDispatch, useSelector as useAppSelector } from 'react-redux';
export * from '@rentify/apis/apis/cartApi';
export * from '@rentify/apis/apis/categoryApi';
export * from '@rentify/apis/apis/customerApi';
export * from '@rentify/apis/apis/productApi';
export * from '@rentify/apis/apis/websiteApi';
export * from '@rentify/checkout/services/orderApi';
export * from '@rentify/apis/apis/userApi';
export * from '@rentify/apis/apis/userAuthApi';
export * from '@rentify/apis/apis/staffAuthApi';
export * from '@rentify/apis/apis/staffManagementApi';
export { setCredentials, clearCredentials } from '@rentify/apis/slice/authSlice';
export { cartSelectors } from '@rentify/apis/slice/cartSlice';
