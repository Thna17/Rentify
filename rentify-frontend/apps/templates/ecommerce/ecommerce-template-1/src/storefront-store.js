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
import authReducer from '@rentify/apis/slice/authSlice';
import cartReducer from '@rentify/apis/slice/cartSlice';
import { cartApi } from '@rentify/apis/apis/cartApi';
import { categoryApi } from '@rentify/apis/apis/categoryApi';
import { customerApi } from '@rentify/apis/apis/customerApi';
import { productApi } from '@rentify/apis/apis/productApi';
import { staffAuthApi } from '@rentify/apis/apis/staffAuthApi';
import { staffManagementApi } from '@rentify/apis/apis/staffManagementApi';
import { userApi } from '@rentify/apis/apis/userApi';
import { userAuthApi } from '@rentify/apis/apis/userAuthApi';
import { websiteApi } from '@rentify/apis/apis/websiteApi';

const persistedAuth = persistReducer(
  { key: 'auth', storage, whitelist: ['role', 'profile'] },
  authReducer
);

const apis = [
  cartApi,
  categoryApi,
  customerApi,
  productApi,
  staffAuthApi,
  staffManagementApi,
  userApi,
  userAuthApi,
  websiteApi,
];

export const store = configureStore({
  reducer: {
    auth: persistedAuth,
    cart: cartReducer,
    ...Object.fromEntries(apis.map((api) => [api.reducerPath, api.reducer])),
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }).concat(apis.map((api) => api.middleware)),
});

export const persistor = persistStore(store);
