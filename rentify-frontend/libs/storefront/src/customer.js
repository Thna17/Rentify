import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { customerApi, orderApi, cartApi, useGetCustomerQuery, useLogoutCustomerMutation } from './api';

/**
 * Storefront customer session. `GET /api/customer` answers 200 only for a
 * signed-in store customer; guests, merchants and staff receive 404/401, so a
 * merchant or staff session is never treated as a customer here.
 */
export function useCustomerSession() {
  const dispatch = useDispatch();
  const query = useGetCustomerQuery(undefined);
  const [logoutMutation, logoutState] = useLogoutCustomerMutation();

  const signOut = useCallback(async () => {
    try {
      await logoutMutation().unwrap();
    } finally {
      // Drop cached customer data, order history and the customer cart.
      dispatch(customerApi.util.resetApiState());
      dispatch(orderApi.util.resetApiState());
      dispatch(cartApi.util.invalidateTags(['Cart']));
    }
  }, [dispatch, logoutMutation]);

  const customer = query.isSuccess && query.data?.id ? query.data : null;
  return {
    customer,
    isAuthenticated: Boolean(customer),
    isLoading: query.isLoading,
    signOut,
    isSigningOut: logoutState.isLoading,
  };
}
