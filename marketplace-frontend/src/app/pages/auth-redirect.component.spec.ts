import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthRedirectComponent, externalAuthRedirectGuard } from './auth-redirect.component';
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
});
