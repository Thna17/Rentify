import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import {
  AuthRedirectComponent,
  externalAdminRedirectGuard,
  externalAuthRedirectGuard,
  externalMerchantRedirectGuard,
  resolveAdminRedirectUrl,
  resolveMerchantRedirectUrl,
} from './auth-redirect.component';
import { AuthService } from '../core/auth/auth.service';

describe('AuthRedirectComponent and externalAuthRedirectGuard', () => {
  let authService: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AuthRedirectComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        AuthService,
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              data: { mode: 'login', defaultReturn: '/' },
              queryParamMap: {
                get: (key: string) => (key === 'returnUrl' ? 'http://localhost:4500/cart' : null),
              },
            },
          },
        },
      ],
    });

    authService = TestBed.inject(AuthService);
  });

  it('generates correct login URL via AuthService', () => {
    const url = authService.getLoginUrl('http://localhost:4500/checkout');
    expect(url).toContain('http://localhost:4300/?returnUrl=');
    expect(url).toContain('checkout');
  });

  it('generates correct signup URL via AuthService', () => {
    const url = authService.getRegisterUrl('http://localhost:4500/checkout');
    expect(url).toContain('http://localhost:4300/signup?returnUrl=');
    expect(url).toContain('checkout');
  });

  it('generates correct forgot password URL via AuthService', () => {
    const url = authService.getForgotPasswordUrl('http://localhost:4500/profile');
    expect(url).toContain('http://localhost:4300/forgot-password?returnUrl=');
    expect(url).toContain('profile');
  });

  it('externalAuthRedirectGuard cancels routing and initiates redirect', () => {
    const guard = externalAuthRedirectGuard('login', '/');
    const mockRoute = {
      queryParamMap: {
        get: () => '/checkout',
      },
    } as any;

    const result = TestBed.runInInjectionContext(() => guard(mockRoute, {} as any));
    expect(result).toBe(false);
  });

  describe('resolveAdminRedirectUrl', () => {
    it('resolves root admin URL when subpath is empty or /admin', () => {
      expect(resolveAdminRedirectUrl('http://localhost:4800', '', '/admin')).toBe('http://localhost:4800');
      expect(resolveAdminRedirectUrl('http://localhost:4800/', '', '/admin/')).toBe('http://localhost:4800');
      expect(resolveAdminRedirectUrl('http://localhost:4800', '', '')).toBe('http://localhost:4800');
    });

    it('normalizes /admin/login to root admin URL for unified auth delegation', () => {
      expect(resolveAdminRedirectUrl('http://localhost:4800', '', '/admin/login')).toBe('http://localhost:4800');
      expect(resolveAdminRedirectUrl('http://localhost:4800', 'login', '')).toBe('http://localhost:4800');
    });

    it('appends nested admin paths correctly', () => {
      expect(resolveAdminRedirectUrl('http://localhost:4800', '', '/admin/sellers')).toBe('http://localhost:4800/sellers');
      expect(resolveAdminRedirectUrl('http://localhost:4800', '', '/admin/orders?page=2')).toBe('http://localhost:4800/orders?page=2');
      expect(resolveAdminRedirectUrl('http://localhost:4800', 'settings', '')).toBe('http://localhost:4800/settings');
    });

    it('handles query parameters directly on admin root', () => {
      expect(resolveAdminRedirectUrl('http://localhost:4800', '', '/admin?tab=overview')).toBe('http://localhost:4800/?tab=overview');
    });
  });

  describe('resolveMerchantRedirectUrl', () => {
    it('resolves merchant base URL when path is empty', () => {
      expect(resolveMerchantRedirectUrl('http://localhost:4400', '')).toBe('http://localhost:4400');
      expect(resolveMerchantRedirectUrl('http://localhost:4400/', '')).toBe('http://localhost:4400');
    });

    it('appends merchant subpath correctly', () => {
      expect(resolveMerchantRedirectUrl('http://localhost:4400', 'orders')).toBe('http://localhost:4400/orders');
      expect(resolveMerchantRedirectUrl('http://localhost:4400', '/products/new')).toBe('http://localhost:4400/products/new');
    });
  });

  describe('externalAdminRedirectGuard and externalMerchantRedirectGuard', () => {
    it('externalAdminRedirectGuard returns false to cancel router navigation', () => {
      const guard = externalAdminRedirectGuard();
      const mockRoute = {} as any;
      const mockState = { url: '/admin/sellers' } as any;

      const result = TestBed.runInInjectionContext(() => guard(mockRoute, mockState));
      expect(result).toBe(false);
    });

    it('externalMerchantRedirectGuard returns false to cancel router navigation', () => {
      const guard = externalMerchantRedirectGuard('orders');
      const mockRoute = {} as any;

      const result = TestBed.runInInjectionContext(() => guard(mockRoute, {} as any));
      expect(result).toBe(false);
    });
  });
});
