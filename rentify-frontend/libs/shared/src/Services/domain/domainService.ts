import {
  AUTH_URL,
  DASHBOARD_URL,
  POS_URL,
  MARKETING_URL,
  MARKETPLACE_URL,
  ADMIN_DASHBOARD_URL,
} from '../../config/urls';

export class DomainService {
  getCurrentDomain(): string {
    if (typeof window === 'undefined') return '';
    return window.location.host;
  }

  getDomainFromQuery(): string {
    if (typeof window === 'undefined') return '';
    const queryParams = new URLSearchParams(window.location.search);
    const domain = queryParams.get('domain');
    if (domain) return domain;
    const returnUrl = queryParams.get('returnUrl');
    if (returnUrl) {
      try {
        return new URL(returnUrl).host;
      } catch {
        return '';
      }
    }
    return '';
  }

  isAuthDomain(domain: string): boolean {
    return domain === new URL(AUTH_URL).host;
  }

  isDashboardDomain(domain: string): boolean {
    return (
      domain === new URL(DASHBOARD_URL).host || domain.includes('platform.')
    );
  }

  isPlatformDomain(domain: string): boolean {
    if (!domain) return false;
    const getHost = (u?: string) => {
      try {
        return u ? new URL(u).host : '';
      } catch {
        return '';
      }
    };
    const platformHosts = [
      getHost(AUTH_URL),
      getHost(DASHBOARD_URL),
      getHost(POS_URL),
      getHost(MARKETING_URL),
      getHost(MARKETPLACE_URL),
      getHost(ADMIN_DASHBOARD_URL),
    ].filter(Boolean);

    return platformHosts.includes(domain) || domain.includes('platform.');
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
    if (this.isPlatformDomain(effectiveDomain)) return true;
    return !isDashboard && (!effectiveDomain || (isAuth && !queryDomain));
  }
}

export const domainService = new DomainService();
