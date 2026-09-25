import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from './auth.service';

/**
 * Administrator-only routes guard.
 *
 * Ensures only users with the ADMIN role can access the platform admin dashboard.
 * If unauthenticated or unauthorized, redirects to unified Auth:
 * http://localhost:4300/?returnUrl=http://localhost:4800 (preserving target route).
 */
/**
 * Resolves the clean return URL for unauthenticated admin visitors.
 * Normalizes root or login routes to base origin (http://localhost:4800),
 * while preserving deep admin routes (e.g. /sellers, /websites, /orders).
 */
export function resolveAdminReturnUrl(origin: string, stateUrl?: string): string {
  const base = (origin || 'http://localhost:4800').replace(/\/+$/, '');
  const url = (stateUrl || '').trim();
  const isDefaultOrLogin =
    !url || url === '/' || url === '/login' || url === '/admin' || url === '/admin/login';
  if (isDefaultOrLogin) {
    return base;
  }
  return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
}

export const adminGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);

  return auth.loadCurrentUser().pipe(
    map((user) => {
      const role = user?.role?.toUpperCase();
      if (role === 'ADMIN') {
        return true;
      }

      const defaultAdminOrigin = 'http://localhost:4800';
      const origin =
        typeof window !== 'undefined' && window.location.origin
          ? window.location.origin
          : defaultAdminOrigin;
      const returnUrl = resolveAdminReturnUrl(origin, state?.url);

      auth.redirectToLogin(returnUrl);
      return false;
    }),
  );
};
