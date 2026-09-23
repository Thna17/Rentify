import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from './auth.service';

export const buyerGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.loadCurrentUser().pipe(
    map((user) =>
      user
        ? true
        : router.createUrlTree(['/login'], {
            // Send them back to whatever they were actually trying to reach.
            // This used to be hardcoded to the change-password page, which
            // was wrong for every other guarded route (checkout, profile...).
            queryParams: { returnUrl: state.url },
          }),
    ),
  );
};
