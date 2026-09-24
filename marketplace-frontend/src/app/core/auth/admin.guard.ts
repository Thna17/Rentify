import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from './auth.service';

/**
 * Administrator-only routes.
 *
 * Stricter than sellerGuard, which lets an admin through to seller screens so
 * support can see what a seller sees. Nothing goes the other way: a seller
 * must not reach marketplace administration.
 *
 * Presentation only — every admin endpoint re-checks the role on the server
 * (authorize('ADMIN')), so a forged client-side role gets a 403 either way.
 */
export const adminGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);

  return auth.loadCurrentUser().pipe(
    map((user) => {
      if (user?.role === 'ADMIN') {
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
