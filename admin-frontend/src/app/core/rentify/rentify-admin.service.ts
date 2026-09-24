import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

declare global {
  interface Window {
    __RENTIFY_ADMIN__?: {
      coreApiUrl?: string;
      commerceApiUrl?: string;
      authUrl?: string;
      adminUrl?: string;
      marketplaceUrl?: string;
      merchantDashboardUrl?: string;
    };
  }
}

const isLocal = () =>
  typeof window !== 'undefined' &&
  (window.location?.hostname === 'localhost' || window.location?.hostname === '127.0.0.1');

const runtime = () => (typeof window !== 'undefined' ? window.__RENTIFY_ADMIN__ : undefined);

const base = (value: string | undefined, fallback: string) =>
  (value || (isLocal() ? fallback : '')).replace(/\/+$/, '');

@Injectable({ providedIn: 'root' })
export class RentifyAdminService {
  private readonly http = inject(HttpClient);

  get core(): string {
    return base(runtime()?.coreApiUrl, 'http://localhost:3001');
  }

  get commerce(): string {
    return base(runtime()?.commerceApiUrl, 'http://localhost:4001');
  }

  get auth(): string {
    return base(runtime()?.authUrl, 'http://localhost:4300');
  }

  get admin(): string {
    return base(runtime()?.adminUrl, 'http://localhost:4800');
  }

  get marketplace(): string {
    return base(runtime()?.marketplaceUrl, 'http://localhost:4500');
  }

  get merchantDashboard(): string {
    return base(runtime()?.merchantDashboardUrl, 'http://localhost:4400');
  }

  get configured(): boolean {
    return Boolean(this.core && this.auth);
  }

  session(): Observable<{ user: any }> {
    return this.http.get<{ user: any }>(`${this.core}/api/auth/session`);
  }

  logout(): Observable<any> {
    return this.http.post(`${this.core}/api/auth/logout`, {});
  }

  authLink(
    path: 'login' | 'signup' | 'register' | 'forgot-password' | 'reset-password' = 'login',
    customReturnUrl?: string,
  ): string {
    const targetUrl =
      customReturnUrl || (typeof window !== 'undefined' ? window.location.href : 'http://localhost:4800');
    const returnUrl = encodeURIComponent(targetUrl);
    const segment = path === 'login' ? '' : path === 'register' ? 'signup' : path;
    const baseAuth = this.auth || 'http://localhost:4300';
    return `${baseAuth}/${segment ? `${segment}` : ''}?returnUrl=${returnUrl}`;
  }
}
