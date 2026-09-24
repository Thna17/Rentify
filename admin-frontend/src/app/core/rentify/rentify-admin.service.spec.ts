import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { RentifyAdminService } from './rentify-admin.service';

describe('RentifyAdminService', () => {
  let service: RentifyAdminService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        RentifyAdminService,
      ],
    });
    service = TestBed.inject(RentifyAdminService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
    delete window.__RENTIFY_ADMIN__;
  });

  it('provides default fallback URLs on localhost', () => {
    expect(service.core).toBe('http://localhost:3001');
    expect(service.commerce).toBe('http://localhost:4001');
    expect(service.auth).toBe('http://localhost:4300');
    expect(service.admin).toBe('http://localhost:4800');
    expect(service.marketplace).toBe('http://localhost:4500');
    expect(service.merchantDashboard).toBe('http://localhost:4400');
    expect(service.configured).toBe(true);
  });

  it('reads runtime configuration dynamically when present', () => {
    window.__RENTIFY_ADMIN__ = {
      coreApiUrl: 'https://core.rentify.local/',
      commerceApiUrl: 'https://commerce.rentify.local/',
      authUrl: 'https://auth.rentify.local/',
      adminUrl: 'https://admin.rentify.local/',
      marketplaceUrl: 'https://marketplace.rentify.local/',
      merchantDashboardUrl: 'https://merchant.rentify.local/',
    };

    expect(service.core).toBe('https://core.rentify.local');
    expect(service.commerce).toBe('https://commerce.rentify.local');
    expect(service.auth).toBe('https://auth.rentify.local');
    expect(service.admin).toBe('https://admin.rentify.local');
    expect(service.marketplace).toBe('https://marketplace.rentify.local');
    expect(service.merchantDashboard).toBe('https://merchant.rentify.local');
    expect(service.configured).toBe(true);
  });

  it('calls session endpoint on Core API', () => {
    let result: unknown;
    service.session().subscribe((res) => {
      result = res;
    });

    const req = httpTesting.expectOne('http://localhost:3001/api/auth/session');
    expect(req.request.method).toBe('GET');
    req.flush({ user: { id: 'admin-1', role: 'admin' } });

    expect(result).toEqual({ user: { id: 'admin-1', role: 'admin' } });
  });

  it('calls logout endpoint on Core API', () => {
    let result: unknown;
    service.logout().subscribe((res) => {
      result = res;
    });

    const req = httpTesting.expectOne('http://localhost:3001/api/auth/logout');
    expect(req.request.method).toBe('POST');
    req.flush({ success: true });

    expect(result).toEqual({ success: true });
  });

  it('builds auth link for login, register, and password reset', () => {
    const loginLink = service.authLink('login', 'http://localhost:4800');
    const registerLink = service.authLink('register', 'http://localhost:4800/websites');
    const forgotLink = service.authLink('forgot-password', 'http://localhost:4800');

    expect(loginLink).toBe('http://localhost:4300/?returnUrl=http%3A%2F%2Flocalhost%3A4800');
    expect(registerLink).toBe('http://localhost:4300/signup?returnUrl=http%3A%2F%2Flocalhost%3A4800%2Fwebsites');
    expect(forgotLink).toBe('http://localhost:4300/forgot-password?returnUrl=http%3A%2F%2Flocalhost%3A4800');
  });
});
