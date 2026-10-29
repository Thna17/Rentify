import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom, of } from 'rxjs';
import { AuthService, apiErrorMessage } from './auth.service';
import { RentifyAdminService } from '../rentify/rentify-admin.service';
import { HttpErrorResponse } from '@angular/common/http';

describe('AuthService', () => {
  let service: AuthService;
  let rentifyService: RentifyAdminService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        AuthService,
        RentifyAdminService,
      ],
    });
    service = TestBed.inject(AuthService);
    rentifyService = TestBed.inject(RentifyAdminService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
    localStorage.clear();
  });

  it('initializes with unauthenticated state', () => {
    expect(service.user()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
    expect(service.isAdmin()).toBe(false);
  });

  it('logs in successfully using the session cookie and updates auth signals', async () => {
    const loginPromise = firstValueFrom(service.login('admin@rentify.local', 'AdminPass123!'));

    const req = httpTesting.expectOne('http://localhost:3001/api/auth/login');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      email: 'admin@rentify.local',
      password: 'AdminPass123!',
      expectedRole: 'ADMIN',
    });

    req.flush({
      success: true,
      message: 'Login successful',
      data: {
        accessToken: 'mock-jwt-token-123',
        user: {
          id: 'admin-uuid-1',
          name: 'Platform Admin',
          email: 'admin@rentify.local',
          role: 'ADMIN',
        },
      },
    });
    const accessReq = httpTesting.expectOne('http://localhost:3001/admin/access/me');
    accessReq.flush({ data: { roles: ['platform_admin'], permissions: ['platform.audit.read'] } });

    const result = await loginPromise;
    expect(result.user?.id).toBe('admin-uuid-1');
    expect(result.user?.role).toBe('ADMIN');
    expect(localStorage.getItem('rentify_token')).toBeNull();
    expect(service.isAuthenticated()).toBe(true);
    expect(service.isAdmin()).toBe(true);
  });

  it('loads current user from session and caches result on subsequent calls', async () => {
    const userPromise1 = firstValueFrom(service.loadCurrentUser());

    const req = httpTesting.expectOne('http://localhost:3001/api/auth/session');
    expect(req.request.method).toBe('GET');
    req.flush({
      user: {
        id: 'admin-uuid-2',
        name: 'Super Administrator',
        email: 'superadmin@rentify.local',
        role: 'admin',
      },
    });
    const accessReq = httpTesting.expectOne('http://localhost:3001/admin/access/me');
    accessReq.flush({ data: { roles: ['platform_admin'], permissions: ['platform.audit.read'] } });

    const user1 = await userPromise1;
    expect(user1?.id).toBe('admin-uuid-2');
    expect(user1?.role).toBe('ADMIN');
    expect(service.isAdmin()).toBe(true);

    // Second call should return cached value without another HTTP request
    const user2 = await firstValueFrom(service.loadCurrentUser());
    expect(user2?.id).toBe('admin-uuid-2');
  });

  it('refreshes current user bypassing cached state', async () => {
    service.setUser({
      id: 'admin-old',
      name: 'Old Admin',
      email: 'old@rentify.local',
      role: 'ADMIN',
      status: 'ACTIVE',
    });
    expect(service.user()?.id).toBe('admin-old');

    const refreshPromise = firstValueFrom(service.refreshCurrentUser());

    const req = httpTesting.expectOne('http://localhost:3001/api/auth/session');
    req.flush({
      user: {
        id: 'admin-new',
        name: 'New Admin',
        email: 'new@rentify.local',
        role: 'admin',
      },
    });
    const accessReq = httpTesting.expectOne('http://localhost:3001/admin/access/me');
    accessReq.flush({ data: { roles: ['platform_admin'], permissions: ['platform.audit.read'] } });

    const updated = await refreshPromise;
    expect(updated?.id).toBe('admin-new');
    expect(service.user()?.id).toBe('admin-new');
  });

  it('clears state, localStorage, and triggers redirect on logout', async () => {
    localStorage.setItem('rentify_token', 'test-token');
    service.setUser({
      id: 'admin-1',
      name: 'Admin',
      email: 'a@rentify.local',
      role: 'ADMIN',
      status: 'ACTIVE',
    });

    const redirectSpy = vi.spyOn(service, 'redirectToLogin').mockImplementation(() => {});
    const logoutPromise = firstValueFrom(service.logout());

    const req = httpTesting.expectOne('http://localhost:3001/api/auth/logout');
    req.flush({ success: true });

    await logoutPromise;
    expect(service.user()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
    expect(localStorage.getItem('rentify_token')).toBeNull();
    expect(redirectSpy).toHaveBeenCalledWith('http://localhost:4800');
  });

  it('apiErrorMessage parses HttpErrorResponse correctly or returns fallback', () => {
    const errorResponse = new HttpErrorResponse({
      error: { message: 'Invalid credentials provided' },
      status: 401,
    });
    expect(apiErrorMessage(errorResponse)).toBe('Invalid credentials provided');

    const customApiError = new HttpErrorResponse({
      error: { error: { message: 'Account suspended' } },
      status: 403,
    });
    expect(apiErrorMessage(customApiError)).toBe('Account suspended');

    const plainApiError = new HttpErrorResponse({
      error: { error: 'Admin sign-in required' }, status: 401,
    });
    expect(apiErrorMessage(plainApiError)).toBe('Admin sign-in required');

    const fullStandardEnvelope = new HttpErrorResponse({
      error: {
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Admin sign-in required',
          fieldErrors: [],
          retryable: false,
          correlationId: 'cid-admin-401',
        },
        message: 'Admin sign-in required',
        success: false,
        statusCode: 401,
        correlationId: 'cid-admin-401',
      },
      status: 401,
    });
    expect(apiErrorMessage(fullStandardEnvelope)).toBe('Admin sign-in required');

    expect(apiErrorMessage(new Error('Random error'), 'Default message')).toBe('Default message');
  });

  it('evaluates scoped claims strictly without assuming admin has every capability', () => {
    // Unauthenticated
    expect(service.hasPermission('catalog:moderate')).toBe(false);

    // Authenticated admin with specific scoped claims
    service.setUser({
      id: 'scoped-admin-1',
      name: 'Catalog Lead',
      email: 'catalog@rentify.local',
      role: 'ADMIN',
      status: 'ACTIVE',
      claims: ['catalog:moderate', 'inventory:adjust'],
    });

    expect(service.hasPermission('catalog:moderate')).toBe(true);
    expect(service.canModerateCatalog()).toBe(true);
    expect(service.canAdjustInventory()).toBe(true);
    expect(service.hasPermission('support:case:write')).toBe(false);
    expect(service.canWriteSupport()).toBe(false);
    expect(service.canReviewSellers()).toBe(false);

    // Canonical Core permissions satisfy transitional Commerce/Admin aliases.
    service.setUser({
      id: 'canonical-catalog-admin',
      name: 'Canonical Catalog Lead',
      email: 'canonical@rentify.local',
      role: 'user',
      status: 'ACTIVE',
      claims: ['catalog.product.hold'],
    });
    expect(service.isAdmin()).toBe(true);
    expect(service.canModerateCatalog()).toBe(true);
    expect(service.canModerateReviews()).toBe(true);
    expect(service.canWriteSupport()).toBe(false);

    // Admin without claims array has zero scoped permissions (no broad assumption)
    service.setUser({
      id: 'unscoped-admin',
      name: 'Unscoped Admin',
      email: 'unscoped@rentify.local',
      role: 'ADMIN',
      status: 'ACTIVE',
      claims: [],
    });
    expect(service.hasPermission('catalog:moderate')).toBe(false);
    expect(service.hasPermission('seller:review')).toBe(false);

    // Wildcard claim grants all capabilities
    service.setUser({
      id: 'super-admin',
      name: 'Super Admin',
      email: 'root@rentify.local',
      role: 'ADMIN',
      status: 'ACTIVE',
      claims: ['*'],
    });
    expect(service.hasPermission('catalog:moderate')).toBe(true);
    expect(service.hasPermission('support:dispute:resolve')).toBe(true);
    expect(service.hasPermission('seller:review')).toBe(true);
  });
});
