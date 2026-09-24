import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, CanActivateFn } from '@angular/router';
import { AuthService } from '../core/auth/auth.service';

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

export const externalMerchantRedirectGuard = (
  path = '',
): CanActivateFn => () => {
  if (typeof window !== 'undefined') {
    const merchantBase = 'http://localhost:4400';
    window.location.href = `${merchantBase}${path ? `/${path.replace(/^\/+/, '')}` : ''}`;
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
