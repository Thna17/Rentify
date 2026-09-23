import { AUTH_URL, DASHBOARD_URL } from '../../config/urls';

export class DomainService {
  getCurrentDomain(): string {
    if (typeof window === 'undefined') return '';
    return window.location.host;
  }

  getDomainFromQuery(): string {
    if (typeof window === 'undefined') return '';
    const queryParams = new URLSearchParams(window.location.search);
    return queryParams.get('domain') || '';
  }

  isAuthDomain(domain: string): boolean {
    return domain === new URL(AUTH_URL).host;
  }

  isDashboardDomain(domain: string): boolean {
    return (
      domain === new URL(DASHBOARD_URL).host || domain.includes('platform.')
    );
  }

  getEffectiveDomain(
    currentDomain: string,
    isAuth: boolean,
    queryDomain: string
  ): string {
    if (isAuth) {
      return queryDomain || new URL(DASHBOARD_URL).host;
    }
    return currentDomain;
  }

  shouldSkipApi(
    isDashboard: boolean,
    effectiveDomain: string,
    isAuth: boolean,
    queryDomain: string
  ): boolean {
    return !isDashboard && (!effectiveDomain || (isAuth && !queryDomain));
  }
}

export const domainService = new DomainService();
