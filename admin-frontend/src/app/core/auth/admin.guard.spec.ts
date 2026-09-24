import { TestBed } from '@angular/core/testing';
import { RouterStateSnapshot, ActivatedRouteSnapshot } from '@angular/router';
import { firstValueFrom, Observable, of } from 'rxjs';
import { adminGuard, resolveAdminReturnUrl } from './admin.guard';
import { AuthService } from './auth.service';
import { AuthUser } from './auth.models';

describe('adminGuard and resolveAdminReturnUrl', () => {
  let authServiceSpy: {
    loadCurrentUser: any;
    redirectToLogin: any;
  };

  beforeEach(() => {
    authServiceSpy = {
      loadCurrentUser: vi.fn(),
      redirectToLogin: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
      ],
    });
  });

  const dummyRoute = {} as ActivatedRouteSnapshot;
  const createSnapshot = (url: string): RouterStateSnapshot => ({
    url,
    root: dummyRoute,
  });

  describe('resolveAdminReturnUrl', () => {
    it('normalizes root and login paths to base origin', () => {
      expect(resolveAdminReturnUrl('http://localhost:4800', '')).toBe('http://localhost:4800');
      expect(resolveAdminReturnUrl('http://localhost:4800', '/')).toBe('http://localhost:4800');
      expect(resolveAdminReturnUrl('http://localhost:4800/', '/')).toBe('http://localhost:4800');
      expect(resolveAdminReturnUrl('http://localhost:4800', '/login')).toBe('http://localhost:4800');
      expect(resolveAdminReturnUrl('http://localhost:4800', '/admin')).toBe('http://localhost:4800');
      expect(resolveAdminReturnUrl('http://localhost:4800', '/admin/login')).toBe('http://localhost:4800');
    });

    it('preserves deep destination subpaths', () => {
      expect(resolveAdminReturnUrl('http://localhost:4800', '/dashboard')).toBe('http://localhost:4800/dashboard');
      expect(resolveAdminReturnUrl('http://localhost:4800', '/sellers')).toBe('http://localhost:4800/sellers');
      expect(resolveAdminReturnUrl('http://localhost:4800', '/orders?page=2')).toBe('http://localhost:4800/orders?page=2');
    });

    it('falls back to default http://localhost:4800 when origin is blank', () => {
      expect(resolveAdminReturnUrl('', '')).toBe('http://localhost:4800');
    });
  });

  it('allows access when user has ADMIN role (uppercase)', async () => {
    const adminUser: AuthUser = {
      id: 'admin-1',
      name: 'Admin User',
      email: 'admin@rentify.local',
      role: 'ADMIN',
      status: 'ACTIVE',
    };
    authServiceSpy.loadCurrentUser.mockReturnValue(of(adminUser));

    const result = TestBed.runInInjectionContext(() => adminGuard(dummyRoute, createSnapshot('/dashboard')));
    const allowed = await firstValueFrom(result as Observable<boolean>);
    expect(allowed).toBe(true);
    expect(authServiceSpy.redirectToLogin).not.toHaveBeenCalled();
  });

  it('allows access when user has admin role (lowercase)', async () => {
    const adminUser: AuthUser = {
      id: 'admin-1',
      name: 'Admin User',
      email: 'admin@rentify.local',
      role: 'admin',
      status: 'active',
    };
    authServiceSpy.loadCurrentUser.mockReturnValue(of(adminUser));

    const result = TestBed.runInInjectionContext(() => adminGuard(dummyRoute, createSnapshot('/')));
    const allowed = await firstValueFrom(result as Observable<boolean>);
    expect(allowed).toBe(true);
    expect(authServiceSpy.redirectToLogin).not.toHaveBeenCalled();
  });

  it('blocks and redirects to unified auth when user is not admin (e.g. BUYER)', async () => {
    const buyerUser: AuthUser = {
      id: 'buyer-1',
      name: 'Buyer User',
      email: 'buyer@example.com',
      role: 'BUYER',
      status: 'ACTIVE',
    };
    authServiceSpy.loadCurrentUser.mockReturnValue(of(buyerUser));

    const result = TestBed.runInInjectionContext(() => adminGuard(dummyRoute, createSnapshot('/dashboard')));
    const allowed = await firstValueFrom(result as Observable<boolean>);
    expect(allowed).toBe(false);
    expect(authServiceSpy.redirectToLogin).toHaveBeenCalledWith(expect.stringMatching(/\/dashboard$/));
  });

  it('blocks and redirects to unified auth when user is unauthenticated (null)', async () => {
    authServiceSpy.loadCurrentUser.mockReturnValue(of(null));

    const result = TestBed.runInInjectionContext(() => adminGuard(dummyRoute, createSnapshot('/')));
    const allowed = await firstValueFrom(result as Observable<boolean>);
    expect(allowed).toBe(false);
    expect(authServiceSpy.redirectToLogin).toHaveBeenCalled();
  });

  it('handles undefined or null router state safely without throwing', async () => {
    authServiceSpy.loadCurrentUser.mockReturnValue(of(null));

    const result = TestBed.runInInjectionContext(() => adminGuard(dummyRoute, null as any));
    const allowed = await firstValueFrom(result as Observable<boolean>);
    expect(allowed).toBe(false);
    expect(authServiceSpy.redirectToLogin).toHaveBeenCalledWith(expect.not.stringContaining('undefined'));
  });
});
