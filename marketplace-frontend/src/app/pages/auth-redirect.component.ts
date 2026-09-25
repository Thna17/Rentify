import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, CanActivateFn } from '@angular/router';
import { AuthService } from '../core/auth/auth.service';
import { RentifyMarketplaceService } from '../core/rentify/rentify-marketplace.service';

export const externalAuthRedirectGuard = (
  mode: 'login' | 'signup' | 'forgot-password' | 'reset-password' = 'login',
  defaultReturn = '/',
): CanActivateFn => (route) => {
  const auth = inject(AuthService);
  const qParam = route.queryParamMap.get('returnUrl');
  let returnUrl = qParam || defaultReturn;
  if (typeof window !== 'undefined' && !returnUrl.startsWith('http')) {
    returnUrl = `${window.location.origin}${returnUrl.startsWith('/') ? '' : '/'}${returnUrl}`;
  }

  if (mode === 'signup') {
    auth.redirectToRegister(returnUrl);
  } else if (mode === 'forgot-password') {
    if (typeof window !== 'undefined') {
      window.location.href = auth.getForgotPasswordUrl(returnUrl);
    }
  } else {
    auth.redirectToLogin(returnUrl);
  }
  return false;
};

export function resolveMerchantRedirectUrl(
  merchantBase: string,
  path = '',
): string {
  const base = (merchantBase || 'http://localhost:4400').replace(/\/+$/, '');
  const cleanPath = path ? path.replace(/^\/+/, '') : '';
  return cleanPath ? `${base}/${cleanPath}` : base;
}

export const externalMerchantRedirectGuard = (
  path = '',
): CanActivateFn => () => {
  const rentify = inject(RentifyMarketplaceService, { optional: true });
  if (typeof window !== 'undefined') {
    const merchantBase = rentify?.merchantDashboard || 'http://localhost:4400';
    window.location.href = resolveMerchantRedirectUrl(merchantBase, path);
  }
  return false;
};

export function resolveAdminRedirectUrl(
  adminBase: string,
  path = '',
  stateUrl = '',
): string {
  const base = (adminBase || 'http://localhost:4800').replace(/\/+$/, '');
  const rawSubPath = path || (stateUrl ? stateUrl.replace(/^\/admin(?=[\/?#]|$)/, '') : '');
  const cleanSubPath = rawSubPath.replace(/^\/+/, '');
  // Normalize login route to root admin URL (handled via adminGuard -> unified auth)
  if (!cleanSubPath || cleanSubPath === 'login') {
    return base;
  }
  return cleanSubPath.startsWith('?') ? `${base}/${cleanSubPath}` : `${base}/${cleanSubPath}`;
}

export const externalAdminRedirectGuard = (
  path = '',
): CanActivateFn => (_route, state) => {
  const rentify = inject(RentifyMarketplaceService, { optional: true });
  if (typeof window !== 'undefined') {
    const adminBase = rentify?.adminDashboard || 'http://localhost:4800';
    const targetUrl = resolveAdminRedirectUrl(adminBase, path, state?.url);
    const hash = window.location.hash || '';
    window.location.href = `${targetUrl}${hash}`;
  }
  return false;
};


@Component({
  selector: 'app-auth-redirect',
  standalone: true,
  template: `
    <div style="min-height: 60vh; display: flex; align-items: center; justify-content: center; font-family: var(--font-body, sans-serif); color: #555;">
      <p>Redirecting to Rentify Auth...</p>
    </div>
  `,
})
export class AuthRedirectComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  ngOnInit(): void {
    const mode = (this.route.snapshot.data['mode'] || 'login') as
      | 'login'
      | 'signup'
      | 'forgot-password'
      | 'reset-password';
    const qParam = this.route.snapshot.queryParamMap.get('returnUrl');
    const defaultReturn = (this.route.snapshot.data['defaultReturn'] || '/') as string;
    let returnUrl = qParam || defaultReturn;
    if (typeof window !== 'undefined') {
      if (!returnUrl.startsWith('http')) {
        returnUrl = `${window.location.origin}${returnUrl.startsWith('/') ? '' : '/'}${returnUrl}`;
      }
      if (mode === 'signup') {
        this.auth.redirectToRegister(returnUrl);
      } else if (mode === 'forgot-password') {
        window.location.href = this.auth.getForgotPasswordUrl(returnUrl);
      } else {
        this.auth.redirectToLogin(returnUrl);
      }
    }
  }
}
