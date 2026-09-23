// Storefront-only API surface. The shared API barrel configures every admin
// endpoint, which makes a storefront page compile the whole monorepo.
export { store, persistor } from './storefront-store';
export { useDispatch as useAppDispatch, useSelector as useAppSelector } from 'react-redux';

export * from '@rentify/apis/apis/cartApi';
export * from '@rentify/apis/apis/categoryApi';
export * from '@rentify/apis/apis/customerApi';
export * from '@rentify/apis/apis/productApi';
export * from '@rentify/apis/apis/staffAuthApi';
export * from '@rentify/apis/apis/staffManagementApi';
export * from '@rentify/apis/apis/userApi';
export * from '@rentify/apis/apis/userAuthApi';
export * from '@rentify/apis/apis/websiteApi';
export { setCredentials, clearCredentials } from '@rentify/apis/slice/authSlice';
