import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from './auth.service';

/** Seller-only routes. Admins pass too, so support can see the same screens. */
export const sellerGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);

  return auth.loadCurrentUser().pipe(
    map((user) => {
      if (user?.role === 'SELLER' || user?.role === 'ADMIN') {
        return true;
      }
      const returnUrl = typeof window !== 'undefined'
        ? `${window.location.origin}${state.url}`
        : state.url;
      auth.redirectToLogin(returnUrl);
      return false;
    }),
  );
};
