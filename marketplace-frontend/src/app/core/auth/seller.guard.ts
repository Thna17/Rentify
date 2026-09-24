import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from './auth.service';

/** Seller-only routes. Admins pass too, so support can see the same screens. */
export const sellerGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.loadCurrentUser().pipe(
    map((user) =>
      user?.role === 'SELLER' || user?.role === 'ADMIN'
        ? true
        : router.createUrlTree(['/seller/login'], {
            queryParams: { returnUrl: state.url },
          }),
    ),
  );
};
